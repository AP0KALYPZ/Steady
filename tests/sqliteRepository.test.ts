// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MIGRATIONS, migrate } from "../src/db/migrations";
import { SqliteRepository } from "../src/db/sqliteRepository";
import type { SqlDriver } from "../src/db/driver";
import { createTestDatabase, type TestDatabase } from "./helpers/sqliteDriver";
import { makeSnapshot, meal, note, weighIn } from "./fixtures";

let testDb: TestDatabase;
let repo: SqliteRepository;

beforeEach(async () => {
  testDb = createTestDatabase();
  await migrate(testDb.driver);
  repo = new SqliteRepository(testDb.driver);
});

afterEach(() => {
  try {
    testDb.db.close();
  } catch {
    // already closed
  }
});

async function seedTemplate(): Promise<void> {
  await repo.saveTemplate({
    slot: 1,
    name: "Beef plate",
    ingredients: "Beef, eggs, cheddar",
    calories: 620,
    protein: 52,
    fat: 40,
  });
}

describe("SQLite migrations", () => {
  it("creates the schema and seeds empty defaults", async () => {
    const snapshot = await repo.load();
    expect(snapshot.settings).toEqual({
      unit: "lb",
      startWeightKg: null,
      goalWeightKg: null,
      sameMeal: true,
      onboarded: false,
    });
    expect(snapshot.weighIns).toEqual([]);
    expect(snapshot.meals).toEqual([]);
    expect(snapshot.notes).toEqual([]);
    expect(snapshot.templates).toHaveLength(2);
    expect(snapshot.templates[0].name).toBe("");

    const version = await testDb.driver.select<{ user_version: number }>(
      "PRAGMA user_version",
    );
    expect(version[0].user_version).toBe(
      MIGRATIONS[MIGRATIONS.length - 1].version,
    );
  });

  it("is idempotent and preserves data across repeated startup", async () => {
    await repo.upsertWeighIn("2026-01-01", 80);
    await migrate(testDb.driver);
    await migrate(testDb.driver);
    const snapshot = await repo.load();
    expect(snapshot.weighIns).toHaveLength(1);
    expect(snapshot.weighIns[0].weightKg).toBe(80);
  });
});

describe("settings and weigh-ins", () => {
  it("saves and reloads preferences", async () => {
    await repo.saveSettings({
      unit: "kg",
      startWeightKg: 83.687792265,
      goalWeightKg: 68.0388555,
      sameMeal: false,
      onboarded: true,
    });
    const snapshot = await repo.load();
    expect(snapshot.settings.unit).toBe("kg");
    expect(snapshot.settings.startWeightKg).toBeCloseTo(83.687792265, 9);
    expect(snapshot.settings.sameMeal).toBe(false);
    expect(snapshot.settings.onboarded).toBe(true);
  });

  it("refuses a goal at or above the starting weight", async () => {
    await expect(
      repo.saveSettings({
        unit: "lb",
        startWeightKg: 80,
        goalWeightKg: 80,
        sameMeal: true,
        onboarded: true,
      }),
    ).rejects.toThrow(/below/);
  });

  it("stores one weigh-in per date and replaces edits", async () => {
    await repo.upsertWeighIn("2026-01-02", 80.1);
    await repo.upsertWeighIn("2026-01-01", 81.2);
    await repo.upsertWeighIn("2026-01-02", 79.8);
    const snapshot = await repo.load();
    expect(snapshot.weighIns).toHaveLength(2);
    expect(snapshot.weighIns.map((entry) => entry.date)).toEqual([
      "2026-01-01",
      "2026-01-02",
    ]);
    expect(snapshot.weighIns[1].weightKg).toBeCloseTo(79.8, 9);
  });

  it("deletes only the requested weigh-in", async () => {
    await seedTemplate();
    await repo.upsertWeighIn("2026-01-01", 80);
    await repo.upsertWeighIn("2026-01-02", 79);
    await repo.setMealLogged("2026-01-01", 1, true);
    await repo.deleteWeighIn("2026-01-01");
    const snapshot = await repo.load();
    expect(snapshot.weighIns.map((entry) => entry.date)).toEqual([
      "2026-01-02",
    ]);
    expect(snapshot.meals).toHaveLength(1);
  });

  it("rejects invalid dates and weights", async () => {
    await expect(repo.upsertWeighIn("not-a-date", 80)).rejects.toThrow();
    await expect(repo.upsertWeighIn("2026-01-01", 0)).rejects.toThrow();
    await expect(repo.upsertWeighIn("2026-01-01", 9999)).rejects.toThrow();
  });
});

describe("meal templates and logs", () => {
  it("requires a template before logging", async () => {
    await expect(repo.setMealLogged("2026-01-01", 1, true)).rejects.toThrow(
      /Set up your meal/,
    );
  });

  it("snapshots the recipe so later edits cannot rewrite history", async () => {
    await seedTemplate();
    await repo.setMealLogged("2026-01-01", 1, true);
    await repo.setMealLogged("2026-01-02", 1, true);

    await repo.saveTemplate({
      slot: 1,
      name: "New recipe",
      ingredients: "Different portions",
      calories: 700,
      protein: null,
      fat: null,
    });

    const snapshot = await repo.load();
    const first = snapshot.meals.find(
      (entry) => entry.date === "2026-01-01",
    );
    const second = snapshot.meals.find(
      (entry) => entry.date === "2026-01-02",
    );
    expect(first?.name).toBe("Beef plate");
    expect(first?.calories).toBe(620);
    expect(second?.name).toBe("Beef plate");
    expect(first?.loggedAt).not.toBeNull();
    expect(snapshot.templates[0].name).toBe("New recipe");
  });

  it("uses Meal 1 for both slots when the routine is shared", async () => {
    await seedTemplate();
    await repo.setMealLogged("2026-01-01", 2, true);
    const snapshot = await repo.load();
    expect(snapshot.meals).toHaveLength(1);
    expect(snapshot.meals[0].slot).toBe(2);
    expect(snapshot.meals[0].name).toBe("Beef plate");
  });

  it("uses an independent Meal 2 template when sharing is off", async () => {
    await seedTemplate();
    await repo.saveSettings({
      unit: "lb",
      startWeightKg: null,
      goalWeightKg: null,
      sameMeal: false,
      onboarded: true,
    });
    await repo.saveTemplate({
      slot: 2,
      name: "Evening eggs",
      ingredients: "4 eggs",
      calories: null,
      protein: null,
      fat: null,
    });
    await repo.setMealLogged("2026-01-01", 2, true);
    const snapshot = await repo.load();
    expect(snapshot.meals[0].name).toBe("Evening eggs");
  });

  it("unmarks a meal without touching the other serving", async () => {
    await seedTemplate();
    await repo.setMealLogged("2026-01-01", 1, true);
    await repo.setMealLogged("2026-01-01", 2, true);
    await repo.setMealLogged("2026-01-01", 1, false);
    const snapshot = await repo.load();
    expect(snapshot.meals).toHaveLength(1);
    expect(snapshot.meals[0].slot).toBe(2);
  });

  it("validates template names and nutrition values", async () => {
    await expect(
      repo.saveTemplate({
        slot: 1,
        name: "   ",
        ingredients: "",
        calories: null,
        protein: null,
        fat: null,
      }),
    ).rejects.toThrow(/name/);

    await expect(
      repo.saveTemplate({
        slot: 1,
        name: "Steak",
        ingredients: "",
        calories: -10,
        protein: null,
        fat: null,
      }),
    ).rejects.toThrow();
  });
});

describe("off-plan and notes", () => {
  it("stores explicit statuses and clears them without wiping meals", async () => {
    await seedTemplate();
    await repo.setMealLogged("2026-01-01", 1, true);
    await repo.setOffPlan("2026-01-01", "off");
    await repo.setOffPlan("2026-01-02", "on");
    let snapshot = await repo.load();
    expect(snapshot.offPlanDays).toEqual([
      { date: "2026-01-01", status: "off" },
      { date: "2026-01-02", status: "on" },
    ]);
    await repo.setOffPlan("2026-01-01", "on");
    snapshot = await repo.load();
    expect(snapshot.offPlanDays[0].status).toBe("on");
    await repo.setOffPlan("2026-01-01", null);
    snapshot = await repo.load();
    expect(snapshot.offPlanDays).toHaveLength(1);
    expect(snapshot.meals).toHaveLength(1);
  });

  it("saves, trims and clears per-date notes", async () => {
    await repo.saveNote("2026-01-01", "  Good energy  ");
    let snapshot = await repo.load();
    expect(snapshot.notes[0].body).toBe("Good energy");
    await repo.saveNote("2026-01-01", "   ");
    snapshot = await repo.load();
    expect(snapshot.notes).toEqual([]);
  });

  it("rejects notes beyond the limit", async () => {
    await expect(
      repo.saveNote("2026-01-01", "x".repeat(2001)),
    ).rejects.toThrow(/2,000/);
  });
});

describe("restore and reset", () => {
  it("replaces every table with a valid imported snapshot", async () => {
    await seedTemplate();
    await repo.upsertWeighIn("2026-01-01", 80);

    const replacement = makeSnapshot({
      settings: {
        unit: "kg",
        startWeightKg: 90,
        goalWeightKg: 80,
        sameMeal: false,
        onboarded: true,
      },
      weighIns: [weighIn("2026-02-01", 198), weighIn("2026-02-02", 197)],
      meals: [meal("2026-02-02", 1)],
      offPlanDays: [{ date: "2026-02-02", status: "off" }],
      notes: [note("2026-02-02", "Restored")],
    });

    await repo.replaceAll(replacement);
    const snapshot = await repo.load();
    expect(snapshot.settings.unit).toBe("kg");
    expect(snapshot.weighIns).toHaveLength(2);
    expect(snapshot.meals).toHaveLength(1);
    expect(snapshot.offPlanDays).toHaveLength(1);
    expect(snapshot.notes).toHaveLength(1);
    expect(snapshot.templates[0].name).toBe("Beef plate");
  });

  it("rolls back to the previous snapshot if an import write fails", async () => {
    await seedTemplate();
    await repo.saveSettings({
      unit: "lb",
      startWeightKg: 90,
      goalWeightKg: 80,
      sameMeal: true,
      onboarded: true,
    });
    await repo.upsertWeighIn("2026-01-01", 88);
    await repo.setMealLogged("2026-01-01", 1, true);
    await repo.saveNote("2026-01-01", "Original note");
    const before = await repo.load();

    let failed = false;
    const flakyDriver: SqlDriver = {
      select: (sql, params) => testDb.driver.select(sql, params),
      execute: async (sql, params = []) => {
        if (!failed && sql.includes("INSERT INTO meal_logs")) {
          failed = true;
          throw new Error("simulated disk failure");
        }
        await testDb.driver.execute(sql, params);
      },
    };
    const flakyRepo = new SqliteRepository(flakyDriver);

    const replacement = makeSnapshot({
      weighIns: [weighIn("2026-03-01", 180)],
      meals: [
        meal("2026-03-01", 1),
        meal("2026-03-01", 2),
      ],
      notes: [note("2026-03-01", "Replacement")],
    });

    await expect(flakyRepo.replaceAll(replacement)).rejects.toThrow(
      "simulated disk failure",
    );

    const after = await repo.load();
    expect(after.weighIns).toEqual(before.weighIns);
    expect(after.meals).toEqual(before.meals);
    expect(after.notes).toEqual(before.notes);
    expect(after.settings.startWeightKg).toBe(before.settings.startWeightKg);
  });

  it("resets all data and preferences behind an explicit reset", async () => {
    await seedTemplate();
    await repo.upsertWeighIn("2026-01-01", 80);
    await repo.setOffPlan("2026-01-01", "off");
    await repo.saveNote("2026-01-01", "x");
    await repo.saveSettings({
      unit: "kg",
      startWeightKg: 90,
      goalWeightKg: 80,
      sameMeal: false,
      onboarded: true,
    });

    await repo.resetAll();
    const snapshot = await repo.load();
    expect(snapshot.settings).toEqual({
      unit: "lb",
      startWeightKg: null,
      goalWeightKg: null,
      sameMeal: true,
      onboarded: false,
    });
    expect(snapshot.weighIns).toEqual([]);
    expect(snapshot.meals).toEqual([]);
    expect(snapshot.offPlanDays).toEqual([]);
    expect(snapshot.notes).toEqual([]);
    expect(snapshot.templates.every((template) => template.name === "")).toBe(
      true,
    );
  });
});
