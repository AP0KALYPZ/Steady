import type {
  AppSettings,
  AppSnapshot,
  MealSlot,
  MealTemplateInput,
  OffPlanStatus,
} from "../types";

/**
 * Typed, transactional-by-operation persistence boundary. UI code never sees
 * SQL and never writes to storage directly.
 */
export interface SteadyRepository {
  readonly kind: "sqlite" | "browser";
  load(): Promise<AppSnapshot>;
  saveSettings(settings: AppSettings): Promise<void>;
  upsertWeighIn(date: string, weightKg: number): Promise<void>;
  deleteWeighIn(date: string): Promise<void>;
  setMealLogged(date: string, slot: MealSlot, logged: boolean): Promise<void>;
  setOffPlan(date: string, status: OffPlanStatus | null): Promise<void>;
  setFastingDay(date: string, fasting: boolean): Promise<void>;
  saveNote(date: string, body: string | null): Promise<void>;
  saveTemplate(template: MealTemplateInput): Promise<void>;
  replaceAll(snapshot: AppSnapshot): Promise<void>;
  resetAll(): Promise<void>;
}
