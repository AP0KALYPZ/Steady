import type {
  AppSettings,
  AppSnapshot,
  MealLog,
  MealSlot,
  MealTemplate,
  MealTemplateInput,
  OffPlanDay,
  OffPlanStatus,
  Unit,
  WeighIn,
  DailyNote,
} from "../types";
import {
  createDefaultSnapshot,
  MAX_MEALS_PER_DAY,
  MEAL_SLOTS,
  MIN_MEALS_PER_DAY,
  normalizeMealsPerDay,
} from "../types";
import { isValidDateKey } from "../lib/dates";
import { WEIGHT_MAX_KG } from "../lib/units";
import type { SqlDriver } from "./driver";
import type { SteadyRepository } from "./repository";

interface SettingsRow {
  unit: string;
  start_weight_kg: number | null;
  goal_weight_kg: number | null;
  same_meal: number | string;
  meals_per_day: number | string;
  onboarded: number | string;
}

interface WeightRow {
  date: string;
  weight_kg: number;
}

interface MealLogRow {
  date: string;
  slot: number;
  logged_at: string | null;
  snapshot_name: string;
  snapshot_ingredients: string;
  snapshot_calories: number | null;
  snapshot_protein: number | null;
  snapshot_fat: number | null;
}

interface TemplateRow {
  slot: number;
  name: string;
  ingredients: string;
  calories: number | null;
  protein: number | null;
  fat: number | null;
}

interface OffPlanRow {
  date: string;
  status: string;
}

interface NoteRow {
  date: string;
  body: string;
}

interface FastingRow {
  date: string;
}

const nowIso = (): string => new Date().toISOString();

function toMealSlot(value: number | string): MealSlot {
  const numeric = Number(value);
  return (MEAL_SLOTS as readonly number[]).includes(numeric)
    ? (numeric as MealSlot)
    : 1;
}

function assertPositiveWeight(weightKg: number): void {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > WEIGHT_MAX_KG + 0.001) {
    throw new Error("Enter a valid, realistic weight.");
  }
}

function assertDate(date: string): void {
  if (!isValidDateKey(date)) {
    throw new Error("That date is not a valid calendar date.");
  }
}

function toBoolean(value: number | string): boolean {
  return Number(value) === 1;
}

export class SqliteRepository implements SteadyRepository {
  readonly kind = "sqlite" as const;

  constructor(private readonly driver: SqlDriver) {}

  async load(): Promise<AppSnapshot> {
    const [
      settingsRows,
      weightRows,
      mealRows,
      templateRows,
      offPlanRows,
      fastingRows,
      noteRows,
    ] = await Promise.all([
        this.driver.select<SettingsRow>(
          `SELECT unit, start_weight_kg, goal_weight_kg, same_meal,
                  meals_per_day, onboarded
             FROM settings WHERE id = 1`,
        ),
        this.driver.select<WeightRow>(
          `SELECT date, weight_kg FROM weight_entries ORDER BY date ASC`,
        ),
        this.driver.select<MealLogRow>(
          `SELECT date, slot, logged_at, snapshot_name, snapshot_ingredients,
                  snapshot_calories, snapshot_protein, snapshot_fat
             FROM meal_logs ORDER BY date ASC, slot ASC`,
        ),
        this.driver.select<TemplateRow>(
          `SELECT slot, name, ingredients, calories, protein, fat
             FROM meal_templates ORDER BY slot ASC`,
        ),
        this.driver.select<OffPlanRow>(
          `SELECT date, status FROM off_plan_days ORDER BY date ASC`,
        ),
        this.driver.select<FastingRow>(
          `SELECT date FROM fasting_days ORDER BY date ASC`,
        ),
        this.driver.select<NoteRow>(
          `SELECT date, body FROM notes ORDER BY date ASC`,
        ),
      ]);

    const defaults = createDefaultSnapshot();
    const settingsRow = settingsRows[0];
    const settings: AppSettings = settingsRow
      ? {
          unit: settingsRow.unit === "kg" ? "kg" : ("lb" as Unit),
          startWeightKg:
            settingsRow.start_weight_kg == null
              ? null
              : Number(settingsRow.start_weight_kg),
          goalWeightKg:
            settingsRow.goal_weight_kg == null
              ? null
              : Number(settingsRow.goal_weight_kg),
          sameMeal: toBoolean(settingsRow.same_meal),
          mealsPerDay: normalizeMealsPerDay(settingsRow.meals_per_day),
          onboarded: toBoolean(settingsRow.onboarded),
        }
      : defaults.settings;

    const weighIns: WeighIn[] = weightRows.map((row) => ({
      date: row.date,
      weightKg: Number(row.weight_kg),
    }));

    const meals: MealLog[] = mealRows.map((row) => ({
      date: row.date,
      slot: toMealSlot(row.slot),
      loggedAt: row.logged_at,
      name: row.snapshot_name,
      ingredients: row.snapshot_ingredients,
      calories:
        row.snapshot_calories == null ? null : Number(row.snapshot_calories),
      protein: row.snapshot_protein == null ? null : Number(row.snapshot_protein),
      fat: row.snapshot_fat == null ? null : Number(row.snapshot_fat),
    }));

    const templates: MealTemplate[] = MEAL_SLOTS.map((slot) => {
      const row = templateRows.find((item) => Number(item.slot) === slot);
      const fallback = defaults.templates[slot - 1];
      return row
        ? {
            slot: slot as MealSlot,
            name: row.name,
            ingredients: row.ingredients,
            calories: row.calories == null ? null : Number(row.calories),
            protein: row.protein == null ? null : Number(row.protein),
            fat: row.fat == null ? null : Number(row.fat),
          }
        : fallback;
    });

    const offPlanDays: OffPlanDay[] = offPlanRows
      .filter((row) => row.status === "on" || row.status === "off")
      .map((row) => ({
        date: row.date,
        status: row.status as OffPlanStatus,
      }));

    const fastingDays = fastingRows.map((row) => row.date);

    const notes: DailyNote[] = noteRows.map((row) => ({
      date: row.date,
      body: row.body,
    }));

    return {
      settings,
      weighIns,
      meals,
      templates,
      offPlanDays,
      fastingDays,
      notes,
    };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    if (
      settings.startWeightKg != null &&
      settings.goalWeightKg != null &&
      settings.goalWeightKg >= settings.startWeightKg
    ) {
      throw new Error("Your goal must be below your starting weight.");
    }
    const mealsPerDay = settings.mealsPerDay;
    if (
      !Number.isInteger(mealsPerDay) ||
      mealsPerDay < MIN_MEALS_PER_DAY ||
      mealsPerDay > MAX_MEALS_PER_DAY
    ) {
      throw new Error("Choose between 1 and 6 meals per day.");
    }
    await this.driver.execute(
      `UPDATE settings
          SET unit = ?, start_weight_kg = ?, goal_weight_kg = ?,
              same_meal = ?, meals_per_day = ?, onboarded = ?, updated_at = ?
        WHERE id = 1`,
      [
        settings.unit,
        settings.startWeightKg,
        settings.goalWeightKg,
        settings.sameMeal ? 1 : 0,
        mealsPerDay,
        settings.onboarded ? 1 : 0,
        nowIso(),
      ],
    );
  }

  async upsertWeighIn(date: string, weightKg: number): Promise<void> {
    assertDate(date);
    assertPositiveWeight(weightKg);
    await this.driver.execute(
      `INSERT INTO weight_entries (date, weight_kg, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         weight_kg = excluded.weight_kg,
         updated_at = excluded.updated_at`,
      [date, weightKg, nowIso()],
    );
  }

  async deleteWeighIn(date: string): Promise<void> {
    assertDate(date);
    await this.driver.execute(`DELETE FROM weight_entries WHERE date = ?`, [
      date,
    ]);
  }

  /**
   * Logging copies the active template into the log row. Later recipe edits
   * therefore cannot rewrite what was recorded on that date.
   */
  async setMealLogged(
    date: string,
    slot: MealSlot,
    logged: boolean,
  ): Promise<void> {
    assertDate(date);
    if (
      !Number.isInteger(slot) ||
      slot < MIN_MEALS_PER_DAY ||
      slot > MAX_MEALS_PER_DAY
    ) {
      throw new Error("Invalid meal slot.");
    }

    if (!logged) {
      await this.driver.execute(
        `DELETE FROM meal_logs WHERE date = ? AND slot = ?`,
        [date, slot],
      );
      return;
    }

    const settingsRows = await this.driver.select<{
      same_meal: number | string;
      meals_per_day: number | string;
    }>(
      `SELECT same_meal, meals_per_day FROM settings WHERE id = 1`,
    );
    const sameMeal = settingsRows[0]
      ? toBoolean(settingsRows[0].same_meal)
      : true;
    const mealsPerDay = settingsRows[0]
      ? normalizeMealsPerDay(settingsRows[0].meals_per_day)
      : 2;
    if (slot > mealsPerDay) {
      throw new Error("That meal is outside your current daily routine.");
    }
    const templateSlot = sameMeal ? 1 : slot;
    const templateRows = await this.driver.select<TemplateRow>(
      `SELECT slot, name, ingredients, calories, protein, fat
         FROM meal_templates WHERE slot = ?`,
      [templateSlot],
    );
    const template = templateRows[0];
    if (!template || template.name.trim().length === 0) {
      throw new Error(
        "Set up your meal in Meal routine before logging a serving.",
      );
    }

    await this.driver.execute(
      `INSERT INTO meal_logs
        (date, slot, logged_at, snapshot_name, snapshot_ingredients,
         snapshot_calories, snapshot_protein, snapshot_fat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date, slot) DO UPDATE SET
         logged_at = excluded.logged_at,
         snapshot_name = excluded.snapshot_name,
         snapshot_ingredients = excluded.snapshot_ingredients,
         snapshot_calories = excluded.snapshot_calories,
         snapshot_protein = excluded.snapshot_protein,
         snapshot_fat = excluded.snapshot_fat`,
      [
        date,
        slot,
        nowIso(),
        template.name,
        template.ingredients,
        template.calories,
        template.protein,
        template.fat,
      ],
    );
  }

  async setOffPlan(date: string, status: OffPlanStatus | null): Promise<void> {
    assertDate(date);
    if (status == null) {
      await this.driver.execute(
        `DELETE FROM off_plan_days WHERE date = ?`,
        [date],
      );
      return;
    }
    if (status !== "on" && status !== "off") {
      throw new Error("Invalid off-plan status.");
    }
    await this.driver.execute(
      `INSERT INTO off_plan_days (date, status, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         status = excluded.status,
         updated_at = excluded.updated_at`,
      [date, status, nowIso()],
    );
  }

  async setFastingDay(date: string, fasting: boolean): Promise<void> {
    assertDate(date);
    if (fasting) {
      await this.driver.execute(
        `INSERT INTO fasting_days (date, updated_at)
         VALUES (?, ?)
         ON CONFLICT(date) DO UPDATE SET updated_at = excluded.updated_at`,
        [date, nowIso()],
      );
      return;
    }
    await this.driver.execute(`DELETE FROM fasting_days WHERE date = ?`, [date]);
  }

  async saveNote(date: string, body: string | null): Promise<void> {
    assertDate(date);
    const trimmed = (body ?? "").trim();
    if (!trimmed) {
      await this.driver.execute(`DELETE FROM notes WHERE date = ?`, [date]);
      return;
    }
    if (trimmed.length > 2000) {
      throw new Error("Notes are limited to 2,000 characters.");
    }
    await this.driver.execute(
      `INSERT INTO notes (date, body, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         body = excluded.body,
         updated_at = excluded.updated_at`,
      [date, trimmed, nowIso()],
    );
  }

  async saveTemplate(template: MealTemplateInput): Promise<void> {
    if (
      !Number.isInteger(template.slot) ||
      template.slot < MIN_MEALS_PER_DAY ||
      template.slot > MAX_MEALS_PER_DAY
    ) {
      throw new Error("Invalid meal slot.");
    }
    const name = template.name.trim();
    if (!name) throw new Error("Give your meal a name.");
    if (name.length > 120) throw new Error("Meal names are limited to 120 characters.");
    if (template.ingredients.length > 2000) {
      throw new Error("Ingredients are limited to 2,000 characters.");
    }
    for (const macro of [template.calories, template.protein, template.fat]) {
      if (macro != null && (!Number.isFinite(macro) || macro < 0)) {
        throw new Error("Nutrition values must be positive numbers or left blank.");
      }
    }
    await this.driver.execute(
      `INSERT INTO meal_templates
        (slot, name, ingredients, calories, protein, fat, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slot) DO UPDATE SET
         name = excluded.name,
         ingredients = excluded.ingredients,
         calories = excluded.calories,
         protein = excluded.protein,
         fat = excluded.fat,
         updated_at = excluded.updated_at`,
      [
        template.slot,
        name,
        template.ingredients.trim(),
        template.calories,
        template.protein,
        template.fat,
        nowIso(),
      ],
    );
  }

  /**
   * Replace every record after a validated restore. Each table write is atomic;
   * if any statement fails, the previous snapshot is written back so a failed
   * import never leaves a half-imported database.
   */
  async replaceAll(snapshot: AppSnapshot): Promise<void> {
    const previous = await this.load();
    try {
      await this.driver.execute(`DELETE FROM weight_entries`);
      await this.driver.execute(`DELETE FROM meal_logs`);
      await this.driver.execute(`DELETE FROM off_plan_days`);
      await this.driver.execute(`DELETE FROM fasting_days`);
      await this.driver.execute(`DELETE FROM notes`);
      await this.driver.execute(`DELETE FROM meal_templates`);
      await this.driver.execute(`DELETE FROM settings`);

      await this.driver.execute(
        `INSERT INTO settings
          (id, unit, start_weight_kg, goal_weight_kg, same_meal,
           meals_per_day, onboarded, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [
          snapshot.settings.unit,
          snapshot.settings.startWeightKg,
          snapshot.settings.goalWeightKg,
          snapshot.settings.sameMeal ? 1 : 0,
          normalizeMealsPerDay(snapshot.settings.mealsPerDay),
          1,
          nowIso(),
        ],
      );
      for (const entry of snapshot.weighIns) {
        await this.driver.execute(
          `INSERT INTO weight_entries (date, weight_kg, updated_at) VALUES (?, ?, ?)`,
          [entry.date, entry.weightKg, nowIso()],
        );
      }
      for (const template of snapshot.templates) {
        await this.driver.execute(
          `INSERT INTO meal_templates
            (slot, name, ingredients, calories, protein, fat, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            template.slot,
            template.name,
            template.ingredients,
            template.calories,
            template.protein,
            template.fat,
            nowIso(),
          ],
        );
      }
      for (const log of snapshot.meals) {
        await this.driver.execute(
          `INSERT INTO meal_logs
            (date, slot, logged_at, snapshot_name, snapshot_ingredients,
             snapshot_calories, snapshot_protein, snapshot_fat)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            log.date,
            log.slot,
            log.loggedAt,
            log.name,
            log.ingredients,
            log.calories,
            log.protein,
            log.fat,
          ],
        );
      }
      for (const entry of snapshot.offPlanDays) {
        await this.driver.execute(
          `INSERT INTO off_plan_days (date, status, updated_at) VALUES (?, ?, ?)`,
          [entry.date, entry.status, nowIso()],
        );
      }
      for (const date of snapshot.fastingDays ?? []) {
        await this.driver.execute(
          `INSERT INTO fasting_days (date, updated_at) VALUES (?, ?)`,
          [date, nowIso()],
        );
      }
      for (const note of snapshot.notes) {
        await this.driver.execute(
          `INSERT INTO notes (date, body, updated_at) VALUES (?, ?, ?)`,
          [note.date, note.body, nowIso()],
        );
      }
    } catch (error) {
      await this.restore(previous);
      throw error;
    }
  }

  private async restore(snapshot: AppSnapshot): Promise<void> {
    try {
      await this.driver.execute(`DELETE FROM weight_entries`);
      await this.driver.execute(`DELETE FROM meal_logs`);
      await this.driver.execute(`DELETE FROM off_plan_days`);
      await this.driver.execute(`DELETE FROM fasting_days`);
      await this.driver.execute(`DELETE FROM notes`);
      await this.driver.execute(`DELETE FROM meal_templates`);
      await this.driver.execute(`DELETE FROM settings`);
      await this.driver.execute(
        `INSERT INTO settings
          (id, unit, start_weight_kg, goal_weight_kg, same_meal,
           meals_per_day, onboarded, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [
          snapshot.settings.unit,
          snapshot.settings.startWeightKg,
          snapshot.settings.goalWeightKg,
          snapshot.settings.sameMeal ? 1 : 0,
          normalizeMealsPerDay(snapshot.settings.mealsPerDay),
          snapshot.settings.onboarded ? 1 : 0,
          nowIso(),
        ],
      );
      for (const template of snapshot.templates) {
        await this.driver.execute(
          `INSERT INTO meal_templates
            (slot, name, ingredients, calories, protein, fat, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            template.slot,
            template.name,
            template.ingredients,
            template.calories,
            template.protein,
            template.fat,
            nowIso(),
          ],
        );
      }
      for (const entry of snapshot.weighIns) {
        await this.driver.execute(
          `INSERT INTO weight_entries (date, weight_kg, updated_at) VALUES (?, ?, ?)`,
          [entry.date, entry.weightKg, nowIso()],
        );
      }
      for (const log of snapshot.meals) {
        await this.driver.execute(
          `INSERT INTO meal_logs
            (date, slot, logged_at, snapshot_name, snapshot_ingredients,
             snapshot_calories, snapshot_protein, snapshot_fat)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            log.date,
            log.slot,
            log.loggedAt,
            log.name,
            log.ingredients,
            log.calories,
            log.protein,
            log.fat,
          ],
        );
      }
      for (const entry of snapshot.offPlanDays) {
        await this.driver.execute(
          `INSERT INTO off_plan_days (date, status, updated_at) VALUES (?, ?, ?)`,
          [entry.date, entry.status, nowIso()],
        );
      }
      for (const date of snapshot.fastingDays ?? []) {
        await this.driver.execute(
          `INSERT INTO fasting_days (date, updated_at) VALUES (?, ?)`,
          [date, nowIso()],
        );
      }
      for (const note of snapshot.notes) {
        await this.driver.execute(
          `INSERT INTO notes (date, body, updated_at) VALUES (?, ?, ?)`,
          [note.date, note.body, nowIso()],
        );
      }
    } catch {
      // Restoration is best-effort; the original error is what the caller needs.
    }
  }

  async resetAll(): Promise<void> {
    await this.driver.execute(`DELETE FROM weight_entries`);
    await this.driver.execute(`DELETE FROM meal_logs`);
    await this.driver.execute(`DELETE FROM off_plan_days`);
    await this.driver.execute(`DELETE FROM fasting_days`);
    await this.driver.execute(`DELETE FROM notes`);
    await this.driver.execute(`DELETE FROM meal_templates`);
    await this.driver.execute(`DELETE FROM settings`);
    await this.driver.execute(
      `INSERT INTO settings
        (id, unit, start_weight_kg, goal_weight_kg, same_meal,
         meals_per_day, onboarded, updated_at)
       VALUES (1, 'lb', NULL, NULL, 1, 2, 0, ?)`,
      [nowIso()],
    );
    for (const slot of MEAL_SLOTS) {
      await this.driver.execute(
        `INSERT INTO meal_templates (slot, name, ingredients, updated_at)
         VALUES (?, '', '', ?)`,
        [slot, nowIso()],
      );
    }
  }
}
