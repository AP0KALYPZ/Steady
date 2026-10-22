import type {
  AppSnapshot,
  DailyNote,
  MealLog,
  MealSlot,
  OffPlanDay,
  WeighIn,
} from "../src/types";
import { createDefaultSnapshot } from "../src/types";
import { toKilograms } from "../src/lib/units";

export function lbs(value: number): number {
  return toKilograms(value, "lb");
}

export function weighIn(date: string, lbValue: number): WeighIn {
  return { date, weightKg: lbs(lbValue) };
}

export function meal(
  date: string,
  slot: MealSlot,
  overrides: Partial<MealLog> = {},
): MealLog {
  return {
    date,
    slot,
    loggedAt: `${date}T12:00:00.000Z`,
    name: "Beef plate",
    ingredients: "Beef, eggs, cheddar",
    calories: null,
    protein: null,
    fat: null,
    ...overrides,
  };
}

export function offPlan(date: string, status: "on" | "off"): OffPlanDay {
  return { date, status };
}

export function note(date: string, body: string): DailyNote {
  return { date, body };
}

export function makeSnapshot(
  overrides: Partial<AppSnapshot> = {},
): AppSnapshot {
  const base = createDefaultSnapshot();
  return {
    ...base,
    settings: {
      unit: "lb",
      startWeightKg: lbs(184.5),
      goalWeightKg: lbs(150),
      sameMeal: true,
      mealsPerDay: 2,
      onboarded: true,
      ...overrides.settings,
    },
    templates:
      overrides.templates ??
      createDefaultSnapshot().templates.map((template) =>
        template.slot === 1
          ? {
              ...template,
              name: "Beef plate",
              ingredients: "Beef, eggs, cheddar",
              calories: 620,
              protein: 52,
              fat: 40,
            }
          : template,
      ),
    weighIns: overrides.weighIns ?? [],
    meals: overrides.meals ?? [],
    offPlanDays: overrides.offPlanDays ?? [],
    notes: overrides.notes ?? [],
  };
}
