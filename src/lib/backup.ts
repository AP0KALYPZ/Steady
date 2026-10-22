import type {
  AppSettings,
  AppSnapshot,
  DailyNote,
  MealLog,
  MealSlot,
  MealTemplate,
  OffPlanDay,
  Unit,
  WeighIn,
} from "../types";
import { createDefaultSnapshot, MEAL_SLOTS } from "../types";
import { isValidDateKey, todayKey } from "./dates";
import { toKilograms, WEIGHT_MAX_KG } from "./units";

export const BACKUP_FORMAT = "steady-backup";
export const BACKUP_VERSION = 3;
export const LEGACY_FORMAT = "steady-v1";

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  appVersion: string;
  exportedAt: string;
  data: AppSnapshot;
}

export type BackupParseResult =
  | { ok: true; snapshot: AppSnapshot; warnings: string[] }
  | { ok: false; errors: string[] };

export function buildBackup(
  snapshot: AppSnapshot,
  appVersion: string,
  now: Date = new Date(),
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    appVersion,
    exportedAt: now.toISOString(),
    data: {
      settings: { ...snapshot.settings },
      weighIns: snapshot.weighIns.map((entry) => ({ ...entry })),
      meals: snapshot.meals.map((entry) => ({ ...entry })),
      templates: snapshot.templates.map((template) => ({ ...template })),
      offPlanDays: snapshot.offPlanDays.map((entry) => ({ ...entry })),
      notes: snapshot.notes.map((entry) => ({ ...entry })),
    },
  };
}

export function serializeBackup(
  snapshot: AppSnapshot,
  appVersion: string,
  now: Date = new Date(),
): string {
  return JSON.stringify(buildBackup(snapshot, appVersion, now), null, 2);
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveWeight(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0 && value <= WEIGHT_MAX_KG + 0.001;
}

function optionalBody(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseMacro(value: unknown, max: number): number | null {
  if (value == null || value === "") return null;
  if (!isFiniteNumber(value) || value < 0 || value > max) return null;
  return value;
}

function pushUniqueDate(
  seen: Set<string>,
  date: string,
  label: string,
  errors: string[],
): boolean {
  if (seen.has(date)) {
    errors.push(`Duplicate ${label} for ${date}.`);
    return false;
  }
  seen.add(date);
  return true;
}

function validateSettings(
  value: unknown,
  errors: string[],
): AppSettings | null {
  if (!isRecord(value)) {
    errors.push("The backup is missing its preferences.");
    return null;
  }
  const unit = value.unit;
  if (unit !== "lb" && unit !== "kg") {
    errors.push("Preferred unit must be either lb or kg.");
    return null;
  }
  const readWeight = (field: unknown, label: string): number | null => {
    if (field == null) return null;
    if (!isPositiveWeight(field)) {
      errors.push(`${label} must be a positive, realistic weight.`);
      return null;
    }
    return field;
  };
  const start = readWeight(value.startWeightKg, "Starting weight");
  const goal = readWeight(value.goalWeightKg, "Goal weight");
  const startRaw = value.startWeightKg;
  const goalRaw = value.goalWeightKg;
  if ((startRaw != null && start == null) || (goalRaw != null && goal == null)) {
    return null;
  }
  if ((start == null) !== (goal == null)) {
    errors.push("Both a starting weight and a goal weight are required together.");
    return null;
  }
  if (start != null && goal != null && goal >= start) {
    errors.push("The goal weight must be below the starting weight.");
    return null;
  }
  let mealsPerDay = 2;
  if (value.mealsPerDay != null) {
    const count = value.mealsPerDay;
    if (!isFiniteNumber(count) || !Number.isInteger(count) || count < 1 || count > 6) {
      errors.push("Meals per day must be a whole number from 1 to 6.");
      return null;
    }
    mealsPerDay = count;
  }
  return {
    unit: unit as Unit,
    startWeightKg: start,
    goalWeightKg: goal,
    sameMeal: value.sameMeal !== false,
    // Version 2 and older backups predate the configurable meal count.
    mealsPerDay,
    onboarded: value.onboarded !== false,
  };
}

function validateTemplates(
  value: unknown,
  errors: string[],
): MealTemplate[] | null {
  if (!Array.isArray(value)) {
    errors.push("The backup is missing its meal templates.");
    return null;
  }
  if (value.length > 6) {
    errors.push("A backup can contain at most six meal templates.");
    return null;
  }
  const bySlot = new Map<MealSlot, MealTemplate>();
  for (const item of value) {
    if (!isRecord(item)) {
      errors.push("A meal template is not readable.");
      return null;
    }
    const slot = item.slot;
    if (typeof slot !== "number" || !MEAL_SLOTS.includes(slot as MealSlot)) {
      errors.push("Meal templates must use a slot from 1 to 6.");
      return null;
    }
    const mealSlot = slot as MealSlot;
    if (bySlot.has(mealSlot)) {
      errors.push(`Duplicate meal template for slot ${mealSlot}.`);
      return null;
    }
    const name = optionalBody(item.name);
    const ingredients = optionalBody(item.ingredients);
    if (name.length > 120 || ingredients.length > 2000) {
      errors.push("A meal template contains text that is too long.");
      return null;
    }
    bySlot.set(mealSlot, {
      slot: mealSlot,
      name,
      ingredients,
      calories: parseMacro(item.calories, 100_000),
      protein: parseMacro(item.protein, 5_000),
      fat: parseMacro(item.fat, 5_000),
    });
  }
  const defaults = createDefaultSnapshot().templates;
  return MEAL_SLOTS.map(
    (slot) => bySlot.get(slot) ?? defaults[slot - 1],
  );
}

function validateWeighIns(
  value: unknown,
  today: string,
  errors: string[],
): WeighIn[] | null {
  if (!Array.isArray(value)) {
    errors.push("The backup is missing its weigh-in history.");
    return null;
  }
  if (value.length > 100_000) {
    errors.push("The backup contains too many weigh-ins to import.");
    return null;
  }
  const seen = new Set<string>();
  const result: WeighIn[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      errors.push("A weigh-in is not readable.");
      return null;
    }
    const date = item.date;
    if (typeof date !== "string" || !isValidDateKey(date)) {
      errors.push("A weigh-in has an invalid calendar date.");
      return null;
    }
    if (date > today) {
      errors.push(`Weigh-in ${date} is in the future.`);
      return null;
    }
    if (!isPositiveWeight(item.weightKg)) {
      errors.push(`The weigh-in on ${date} has an invalid weight.`);
      return null;
    }
    if (!pushUniqueDate(seen, date, "weigh-in", errors)) return null;
    result.push({ date, weightKg: item.weightKg });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function validateMeals(
  value: unknown,
  today: string,
  errors: string[],
): MealLog[] | null {
  if (!Array.isArray(value)) {
    errors.push("The backup is missing its meal log.");
    return null;
  }
  if (value.length > 200_000) {
    errors.push("The backup contains too many meal entries to import.");
    return null;
  }
  const seen = new Set<string>();
  const result: MealLog[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      errors.push("A meal entry is not readable.");
      return null;
    }
    const date = item.date;
    const slot = item.slot;
    if (typeof date !== "string" || !isValidDateKey(date)) {
      errors.push("A meal entry has an invalid calendar date.");
      return null;
    }
    if (date > today) {
      errors.push(`Meal record ${date} is in the future.`);
      return null;
    }
    if (typeof slot !== "number" || !MEAL_SLOTS.includes(slot as MealSlot)) {
      errors.push(`Meal record ${date} has an invalid slot.`);
      return null;
    }
    const key = `${date}:${slot}`;
    if (seen.has(key)) {
      errors.push(`Duplicate meal entry for ${date}, meal ${slot}.`);
      return null;
    }
    seen.add(key);
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) {
      errors.push(`The saved meal description for ${date} is missing.`);
      return null;
    }
    const loggedAtRaw = item.loggedAt;
    let loggedAt: string | null = null;
    if (typeof loggedAtRaw === "string" && loggedAtRaw.length > 0) {
      const parsed = new Date(loggedAtRaw);
      if (Number.isNaN(parsed.getTime())) {
        errors.push(`Meal entry ${date} has an invalid completion time.`);
        return null;
      }
      loggedAt = parsed.toISOString();
    }
    result.push({
      date,
      slot: slot as MealSlot,
      loggedAt,
      name: name.slice(0, 200),
      ingredients:
        typeof item.ingredients === "string"
          ? item.ingredients.trim().slice(0, 2000)
          : "",
      calories: parseMacro(item.calories, 100_000),
      protein: parseMacro(item.protein, 5_000),
      fat: parseMacro(item.fat, 5_000),
    });
  }
  return result.sort(
    (a, b) => a.date.localeCompare(b.date) || a.slot - b.slot,
  );
}

function validateOffPlan(
  value: unknown,
  today: string,
  errors: string[],
): OffPlanDay[] | null {
  if (!Array.isArray(value)) {
    errors.push("The backup is missing its off-plan records.");
    return null;
  }
  const seen = new Set<string>();
  const result: OffPlanDay[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      errors.push("An off-plan record is not readable.");
      return null;
    }
    const date = item.date;
    const status = item.status;
    if (typeof date !== "string" || !isValidDateKey(date)) {
      errors.push("An off-plan record has an invalid calendar date.");
      return null;
    }
    if (date > today) {
      errors.push(`Off-plan record ${date} is in the future.`);
      return null;
    }
    if (status !== "on" && status !== "off") {
      errors.push(`Off-plan record ${date} has an invalid status.`);
      return null;
    }
    if (!pushUniqueDate(seen, date, "off-plan record", errors)) return null;
    result.push({ date, status });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function validateNotes(
  value: unknown,
  today: string,
  errors: string[],
): DailyNote[] | null {
  if (!Array.isArray(value)) {
    errors.push("The backup is missing its daily notes.");
    return null;
  }
  const seen = new Set<string>();
  const result: DailyNote[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      errors.push("A daily note is not readable.");
      return null;
    }
    const date = item.date;
    if (typeof date !== "string" || !isValidDateKey(date)) {
      errors.push("A daily note has an invalid calendar date.");
      return null;
    }
    if (date > today) {
      errors.push(`Note ${date} is in the future.`);
      return null;
    }
    if (typeof item.body !== "string") {
      errors.push(`The note for ${date} is not text.`);
      return null;
    }
    if (item.body.length > 5000) {
      errors.push(`The note for ${date} is too long.`);
      return null;
    }
    if (!pushUniqueDate(seen, date, "note", errors)) return null;
    const body = item.body.trim();
    if (body) result.push({ date, body });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Validate and normalize a modern backup. Nothing is written by this function;
 * an invalid file can never destroy the current database.
 */
export function parseBackup(
  text: string,
  today: string = todayKey(),
): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      errors: ["This file is not valid JSON. Choose a STEADY backup file."],
    };
  }

  if (!isRecord(parsed)) {
    return { ok: false, errors: ["This file is not a STEADY backup."] };
  }

  if (parsed.format === LEGACY_FORMAT) {
    return convertLegacyBackup(parsed, today);
  }

  if (parsed.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      errors: [
        "This file is not a STEADY backup. The expected format marker is missing.",
      ],
    };
  }

  const version = parsed.version;
  if (!isFiniteNumber(version) || version < 1 || !Number.isInteger(version)) {
    return { ok: false, errors: ["The backup has an invalid schema version."] };
  }
  if (version > BACKUP_VERSION) {
    return {
      ok: false,
      errors: [
        `This backup was created by a newer version of STEADY (schema version ${version}). This version supports up to schema version ${BACKUP_VERSION}. Update STEADY to restore it.`,
      ],
    };
  }

  if (!isRecord(parsed.data)) {
    return { ok: false, errors: ["The backup does not contain any records."] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const data = parsed.data;
  const settings = validateSettings(data.settings, errors);
  const templates = validateTemplates(data.templates, errors);
  const weighIns = validateWeighIns(data.weighIns, today, errors);
  const meals = validateMeals(data.meals, today, errors);
  const offPlanDays = validateOffPlan(data.offPlanDays, today, errors);
  const notes = validateNotes(data.notes, today, errors);

  if (
    !settings ||
    !templates ||
    !weighIns ||
    !meals ||
    !offPlanDays ||
    !notes
  ) {
    return {
      ok: false,
      errors:
        errors.length > 0
          ? errors
          : ["The backup is incomplete and was not imported."],
    };
  }

  if (settings.onboarded === false && settings.startWeightKg != null) {
    warnings.push("The backup was created before setup was completed.");
  }

  return {
    ok: true,
    warnings,
    snapshot: {
      settings: { ...settings, onboarded: true },
      templates,
      weighIns,
      meals,
      offPlanDays,
      notes,
    },
  };
}

/**
 * Convert the original browser prototype's export into the desktop model.
 * The prototype stored every weight in pounds regardless of its display unit.
 */
function convertLegacyBackup(
  parsed: UnknownRecord,
  today: string,
): BackupParseResult {
  const data = parsed.data;
  if (!isRecord(data)) {
    return { ok: false, errors: ["The legacy backup is incomplete."] };
  }
  const errors: string[] = [];
  const warnings: string[] = [
    "Converted a legacy STEADY browser backup. Its weights were stored in pounds and have been converted to kilograms.",
  ];
  const unit: Unit = data.unit === "kg" ? "kg" : "lb";
  const readLb = (value: unknown): number | null => {
    if (!isFiniteNumber(value) || value <= 0) return null;
    // Reject values that could not be a real human weight in kilograms.
    return toKilograms(value, "lb") <= WEIGHT_MAX_KG ? value : null;
  };

  const startLb = readLb(data.startWeight);
  const goalLb = readLb(data.goalWeight);
  let startWeightKg = startLb != null ? toKilograms(startLb, "lb") : null;
  let goalWeightKg = goalLb != null ? toKilograms(goalLb, "lb") : null;
  if (
    startWeightKg != null &&
    goalWeightKg != null &&
    goalWeightKg >= startWeightKg
  ) {
    warnings.push(
      "The legacy goal was not below its starting weight, so it was left unset.",
    );
    goalWeightKg = null;
  }
  if ((startWeightKg == null) !== (goalWeightKg == null)) {
    startWeightKg = null;
    goalWeightKg = null;
  }

  const settings: AppSettings = {
    unit,
    startWeightKg,
    goalWeightKg,
    sameMeal: data.sameMeal !== false,
    mealsPerDay: 2,
    onboarded: true,
  };

  const legacyTemplates = Array.isArray(data.templates) ? data.templates : [];
  // The prototype stored optional nutrition fields as strings.
  const parseLegacyMacro = (value: unknown, max: number): number | null => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? parseMacro(Number(trimmed), max) : null;
    }
    return parseMacro(value, max);
  };
  const readTemplate = (index: number): MealTemplate => {
    const item = legacyTemplates[index];
    const record = isRecord(item) ? item : {};
    return {
      slot: index === 0 ? 1 : 2,
      name: optionalBody(record.name).slice(0, 120),
      ingredients: optionalBody(record.ingredients).slice(0, 2000),
      calories: parseLegacyMacro(record.calories, 100_000),
      protein: parseLegacyMacro(record.protein, 5_000),
      fat: parseLegacyMacro(record.fat, 5_000),
    };
  };
  const legacyDefaults = createDefaultSnapshot().templates;
  const templates = MEAL_SLOTS.map(
    (slot) => readTemplate(slot - 1) ?? legacyDefaults[slot - 1],
  );

  const weighIns: WeighIn[] = [];
  if (isRecord(data.weights)) {
    for (const [date, rawWeight] of Object.entries(data.weights)) {
      if (!isValidDateKey(date) || date > today) continue;
      const pounds = readLb(rawWeight);
      if (pounds == null) continue;
      weighIns.push({ date, weightKg: toKilograms(pounds, "lb") });
    }
  }
  weighIns.sort((a, b) => a.date.localeCompare(b.date));

  const mealTemplateFor = (slot: MealSlot): MealTemplate =>
    settings.sameMeal ? templates[0] : templates[slot - 1];

  const meals: MealLog[] = [];
  if (isRecord(data.meals)) {
    for (const [date, rawRecord] of Object.entries(data.meals)) {
      if (!isValidDateKey(date) || date > today || !isRecord(rawRecord)) {
        continue;
      }
      for (const slot of [1, 2] as const) {
        const logged = rawRecord[slot === 1 ? "meal1" : "meal2"] === true;
        if (!logged) continue;
        const template = mealTemplateFor(slot);
        const name = template.name || `Meal ${slot}`;
        if (!template.name) {
          warnings.push(
            `A legacy meal on ${date} had no saved recipe name; it was labelled "Meal ${slot}".`,
          );
        }
        meals.push({
          date,
          slot,
          loggedAt: null,
          name,
          ingredients: template.ingredients,
          calories: template.calories,
          protein: template.protein,
          fat: template.fat,
        });
      }
    }
  }
  meals.sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot);

  const offPlanDays: OffPlanDay[] = [];
  if (isRecord(data.offplan)) {
    for (const [date, rawRecord] of Object.entries(data.offplan)) {
      if (!isValidDateKey(date) || date > today || !isRecord(rawRecord)) {
        continue;
      }
      const status = rawRecord.status;
      if (status === "on" || status === "off") {
        offPlanDays.push({ date, status });
      }
    }
  }
  offPlanDays.sort((a, b) => a.date.localeCompare(b.date));

  const notes: DailyNote[] = [];
  if (isRecord(data.notes)) {
    for (const [date, rawBody] of Object.entries(data.notes)) {
      if (!isValidDateKey(date) || date > today) continue;
      const body = typeof rawBody === "string" ? rawBody.trim() : "";
      if (!body) continue;
      if (body.length > 5000) {
        errors.push(`The note for ${date} is too long to import.`);
        continue;
      }
      notes.push({ date, body });
    }
  }
  notes.sort((a, b) => a.date.localeCompare(b.date));

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    warnings,
    snapshot: {
      settings,
      templates,
      weighIns,
      meals,
      offPlanDays,
      notes,
    },
  };
}
