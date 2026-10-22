export type Unit = "lb" | "kg";

export type OffPlanStatus = "on" | "off";

export type MealSlot = 1 | 2;

export interface AppSettings {
  unit: Unit;
  /** Canonical kilograms. Null until the user sets a starting point. */
  startWeightKg: number | null;
  /** Canonical kilograms. Must be below the starting weight. */
  goalWeightKg: number | null;
  sameMeal: boolean;
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
      onboarded: false,
    },
    weighIns: [],
    meals: [],
    templates: [
      {
        slot: 1,
        name: "",
        ingredients: "",
        calories: null,
        protein: null,
        fat: null,
      },
      {
        slot: 2,
        name: "",
        ingredients: "",
        calories: null,
        protein: null,
        fat: null,
      },
    ],
    offPlanDays: [],
    notes: [],
  };
}
