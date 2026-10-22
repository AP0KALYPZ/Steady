import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getRepository } from "../db";
import type { SteadyRepository } from "../db";
import type {
  AppSettings,
  AppSnapshot,
  MealSlot,
  MealTemplateInput,
  OffPlanStatus,
} from "../types";

export interface SetupInput {
  settings: AppSettings;
  templates: MealTemplateInput[];
}

export interface AppActions {
  saveSettings(settings: AppSettings): Promise<void>;
  completeSetup(input: SetupInput): Promise<void>;
  saveWeighIn(date: string, weightKg: number): Promise<void>;
  deleteWeighIn(date: string): Promise<void>;
  setMealLogged(date: string, slot: MealSlot, logged: boolean): Promise<void>;
  setOffPlan(date: string, status: OffPlanStatus | null): Promise<void>;
  saveNote(date: string, body: string | null): Promise<void>;
  saveTemplate(template: MealTemplateInput): Promise<void>;
  importSnapshot(snapshot: AppSnapshot): Promise<void>;
  resetAll(): Promise<void>;
}

interface AppDataContextValue {
  snapshot: AppSnapshot | null;
  isLoading: boolean;
  error: string | null;
  storageKind: "sqlite" | "browser" | null;
  actions: AppActions;
  reload(): Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [repository, setRepository] = useState<SteadyRepository | null>(null);
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const repo = await getRepository();
        if (cancelled) return;
        setRepository(repo);
        const loaded = await repo.load();
        if (cancelled) return;
        setSnapshot(loaded);
        setError(null);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "STEADY could not open its local database.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!repository) return;
    const loaded = await repository.load();
    setSnapshot(loaded);
  }, [repository]);

  const run = useCallback(
    async (operation: (repo: SteadyRepository) => Promise<void>) => {
      if (!repository) {
        throw new Error("The local database is still opening. Try again in a moment.");
      }
      await operation(repository);
      const loaded = await repository.load();
      setSnapshot(loaded);
    },
    [repository],
  );

  const actions = useMemo<AppActions>(
    () => ({
      async saveSettings(settings) {
        await run((repo) => repo.saveSettings(settings));
      },
      async completeSetup(input) {
        await run(async (repo) => {
          await repo.saveSettings(input.settings);
          for (const template of input.templates) {
            if (template.name.trim()) {
              await repo.saveTemplate(template);
            }
          }
        });
      },
      async saveWeighIn(date, weightKg) {
        await run((repo) => repo.upsertWeighIn(date, weightKg));
      },
      async deleteWeighIn(date) {
        await run((repo) => repo.deleteWeighIn(date));
      },
      async setMealLogged(date, slot, logged) {
        await run((repo) => repo.setMealLogged(date, slot, logged));
      },
      async setOffPlan(date, status) {
        await run((repo) => repo.setOffPlan(date, status));
      },
      async saveNote(date, body) {
        await run((repo) => repo.saveNote(date, body));
      },
      async saveTemplate(template) {
        await run((repo) => repo.saveTemplate(template));
      },
      async importSnapshot(next) {
        await run((repo) => repo.replaceAll(next));
      },
      async resetAll() {
        await run((repo) => repo.resetAll());
      },
    }),
    [run],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      snapshot,
      isLoading,
      error,
      storageKind: repository?.kind ?? null,
      actions,
      reload,
    }),
    [snapshot, isLoading, error, repository, actions, reload],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider.");
  }
  return context;
}

/** Convenience for pages that only render once a snapshot exists. */
export function useSnapshot(): AppSnapshot {
  const { snapshot } = useAppData();
  if (!snapshot) {
    throw new Error("The application snapshot is not ready.");
  }
  return snapshot;
}
