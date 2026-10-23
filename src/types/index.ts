export type Unit = "lb" | "kg";

export type OffPlanStatus = "on" | "off";

export const MIN_MEALS_PER_DAY = 1;
export const MAX_MEALS_PER_DAY = 6;

/** One serving per day. STEADY supports up to six scheduled servings. */
export type MealSlot = 1 | 2 | 3 | 4 | 5 | 6;

export const MEAL_SLOTS: readonly MealSlot[] = [1, 2, 3, 4, 5, 6];

/** Clamp a persisted or imported value to the supported daily meal range. */
export function normalizeMealsPerDay(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) return 2;
  return Math.min(MAX_MEALS_PER_DAY, Math.max(MIN_MEALS_PER_DAY, numeric));
}

export function mealSlotsForCount(count: number): MealSlot[] {
  return MEAL_SLOTS.slice(0, normalizeMealsPerDay(count));
}

export function mealCountLabel(count: number): string {
  return (
    ["zero", "one", "two", "three", "four", "five", "six"][
      normalizeMealsPerDay(count)
    ] ?? String(count)
  );
}

export interface AppSettings {
  unit: Unit;
  /** Canonical kilograms. Null until the user sets a starting point. */
  startWeightKg: number | null;
  /** Canonical kilograms. Must be below the starting weight. */
  goalWeightKg: number | null;
  sameMeal: boolean;
  /** Scheduled servings per day, from 1 to 6. */
  mealsPerDay: number;
  onboarded: boolean;
}

export interface WeighIn {
  date: string;
  weightKg: number;
  updatedAt?: string;
}

export interface MealSnapshot {
  name: string;
  ingredients: string;
  calories: number | null;
  protein: number | null;
  fat: number | null;
}

export interface MealTemplate extends MealSnapshot {
  slot: MealSlot;
  updatedAt?: string;
}

export type MealTemplateInput = Omit<MealTemplate, "updatedAt">;

export interface MealLog extends MealSnapshot {
  date: string;
  slot: MealSlot;
  loggedAt: string | null;
}

export interface OffPlanDay {
  date: string;
  status: OffPlanStatus;
}

export interface DailyNote {
  date: string;
  body: string;
}

export interface AppSnapshot {
  settings: AppSettings;
  weighIns: WeighIn[];
  meals: MealLog[];
  templates: MealTemplate[];
  offPlanDays: OffPlanDay[];
  /** Calendar keys for intentional no-food fasting days. */
  fastingDays: string[];
  notes: DailyNote[];
}

export interface GoalSettingsInput {
  unit: Unit;
  startWeightKg: number;
  goalWeightKg: number;
}

export function createDefaultSnapshot(): AppSnapshot {
  return {
    settings: {
      unit: "lb",
      startWeightKg: null,
      goalWeightKg: null,
      sameMeal: true,
      mealsPerDay: 2,
      onboarded: false,
    },
    weighIns: [],
    meals: [],
    templates: MEAL_SLOTS.map((slot) => ({
      slot,
      name: "",
      ingredients: "",
      calories: null,
      protein: null,
      fat: null,
    })),
    offPlanDays: [],
    fastingDays: [],
    notes: [],
  };
}
