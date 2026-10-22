import type {
  AppSettings,
  AppSnapshot,
  MealSlot,
  MealTemplateInput,
  OffPlanStatus,
} from "../types";
import { createDefaultSnapshot } from "../types";
import type { SteadyRepository } from "./repository";

const STORE_KEY = "steady-desktop-browser-preview-v1";

function clone(snapshot: AppSnapshot): AppSnapshot {
  return {
    settings: { ...snapshot.settings },
    weighIns: snapshot.weighIns.map((entry) => ({ ...entry })),
    meals: snapshot.meals.map((entry) => ({ ...entry })),
    templates: snapshot.templates.map((entry) => ({ ...entry })),
    offPlanDays: snapshot.offPlanDays.map((entry) => ({ ...entry })),
    notes: snapshot.notes.map((entry) => ({ ...entry })),
  };
}

function isSnapshot(value: unknown): value is AppSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AppSnapshot>;
  return (
    typeof candidate.settings === "object" &&
    candidate.settings !== null &&
    Array.isArray(candidate.weighIns) &&
    Array.isArray(candidate.meals) &&
    Array.isArray(candidate.templates) &&
    Array.isArray(candidate.offPlanDays) &&
    Array.isArray(candidate.notes)
  );
}

/**
 * Development preview only. The packaged desktop application always uses
 * SQLite; this adapter exists so the Vite UI can be exercised without a native
 * shell and is clearly labelled in the interface.
 */
export class BrowserRepository implements SteadyRepository {
  readonly kind = "browser" as const;
  private snapshot: AppSnapshot;

  constructor(initial?: AppSnapshot) {
    this.snapshot = clone(initial ?? this.read());
  }

  private read(): AppSnapshot {
    if (typeof localStorage === "undefined") return createDefaultSnapshot();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return createDefaultSnapshot();
      const parsed: unknown = JSON.parse(raw);
      return isSnapshot(parsed) ? parsed : createDefaultSnapshot();
    } catch {
      return createDefaultSnapshot();
    }
  }

  private persist(): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORE_KEY, JSON.stringify(this.snapshot));
  }

  private templateForSlot(slot: MealSlot) {
    const index = this.snapshot.settings.sameMeal ? 0 : slot - 1;
    return this.snapshot.templates[index];
  }

  async load(): Promise<AppSnapshot> {
    return clone(this.snapshot);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    if (
      settings.startWeightKg != null &&
      settings.goalWeightKg != null &&
      settings.goalWeightKg >= settings.startWeightKg
    ) {
      throw new Error("Your goal must be below your starting weight.");
    }
    this.snapshot.settings = { ...settings };
    this.persist();
  }

  async upsertWeighIn(date: string, weightKg: number): Promise<void> {
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      throw new Error("Enter a valid weight.");
    }
    this.snapshot.weighIns = this.snapshot.weighIns
      .filter((entry) => entry.date !== date)
      .concat({ date, weightKg, updatedAt: new Date().toISOString() })
      .sort((a, b) => a.date.localeCompare(b.date));
    this.persist();
  }

  async deleteWeighIn(date: string): Promise<void> {
    this.snapshot.weighIns = this.snapshot.weighIns.filter(
      (entry) => entry.date !== date,
    );
    this.persist();
  }

  async setMealLogged(
    date: string,
    slot: MealSlot,
    logged: boolean,
  ): Promise<void> {
    if (!logged) {
      this.snapshot.meals = this.snapshot.meals.filter(
        (entry) => !(entry.date === date && entry.slot === slot),
      );
      this.persist();
      return;
    }
    const template = this.templateForSlot(slot);
    if (!template || !template.name.trim()) {
      throw new Error(
        "Set up your meal in Meal routine before logging a serving.",
      );
    }
    this.snapshot.meals = this.snapshot.meals
      .filter((entry) => !(entry.date === date && entry.slot === slot))
      .concat({
        date,
        slot,
        loggedAt: new Date().toISOString(),
        name: template.name,
        ingredients: template.ingredients,
        calories: template.calories,
        protein: template.protein,
        fat: template.fat,
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot);
    this.persist();
  }

  async setOffPlan(
    date: string,
    status: OffPlanStatus | null,
  ): Promise<void> {
    this.snapshot.offPlanDays = this.snapshot.offPlanDays.filter(
      (entry) => entry.date !== date,
    );
    if (status) this.snapshot.offPlanDays.push({ date, status });
    this.snapshot.offPlanDays.sort((a, b) => a.date.localeCompare(b.date));
    this.persist();
  }

  async saveNote(date: string, body: string | null): Promise<void> {
    const trimmed = (body ?? "").trim();
    this.snapshot.notes = this.snapshot.notes.filter(
      (entry) => entry.date !== date,
    );
    if (trimmed) this.snapshot.notes.push({ date, body: trimmed });
    this.snapshot.notes.sort((a, b) => a.date.localeCompare(b.date));
    this.persist();
  }

  async saveTemplate(template: MealTemplateInput): Promise<void> {
    if (!template.name.trim()) throw new Error("Give your meal a name.");
    this.snapshot.templates = this.snapshot.templates.map((entry) =>
      entry.slot === template.slot ? { ...template } : entry,
    );
    this.persist();
  }

  async replaceAll(snapshot: AppSnapshot): Promise<void> {
    this.snapshot = clone(snapshot);
    this.persist();
  }

  async resetAll(): Promise<void> {
    this.snapshot = createDefaultSnapshot();
    this.persist();
  }
}
