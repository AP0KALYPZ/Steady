import { beforeEach, describe, expect, it } from "vitest";
import { BrowserRepository } from "../src/db/browserRepository";
import { makeSnapshot, note, weighIn } from "./fixtures";
import { createDefaultSnapshot } from "../src/types";

beforeEach(() => {
  localStorage.clear();
});

describe("browser preview repository", () => {
  it("starts empty with no invented records", async () => {
    const repo = new BrowserRepository();
    const snapshot = await repo.load();
    expect(snapshot.weighIns).toEqual([]);
    expect(snapshot.meals).toEqual([]);
    expect(snapshot.settings.onboarded).toBe(false);
  });

  it("persists actions for a subsequent load", async () => {
    const repo = new BrowserRepository();
    await repo.saveSettings({
      ...createDefaultSnapshot().settings,
      startWeightKg: 90,
      goalWeightKg: 80,
      onboarded: true,
    });
    await repo.saveTemplate({
      slot: 1,
      name: "Beef",
      ingredients: "250 g",
      calories: null,
      protein: null,
      fat: null,
    });
    await repo.upsertWeighIn("2026-01-01", 88.2);
    await repo.setMealLogged("2026-01-01", 1, true);
    await repo.setOffPlan("2026-01-01", "off");
    await repo.setFastingDay("2026-01-02", true);
    await repo.saveNote("2026-01-01", "Note");

    const reloaded = new BrowserRepository();
    const snapshot = await reloaded.load();
    expect(snapshot.settings.goalWeightKg).toBe(80);
    expect(snapshot.weighIns[0].weightKg).toBe(88.2);
    expect(snapshot.meals[0].name).toBe("Beef");
    expect(snapshot.offPlanDays[0].status).toBe("off");
    expect(snapshot.fastingDays).toEqual(["2026-01-02"]);
    expect(snapshot.notes[0].body).toBe("Note");
  });

  it("preserves meal snapshots when the template changes", async () => {
    const repo = new BrowserRepository(
      makeSnapshot({
        meals: [
          {
            date: "2026-01-01",
            slot: 1,
            loggedAt: null,
            name: "Old name",
            ingredients: "Old ingredients",
            calories: 500,
            protein: null,
            fat: null,
          },
        ],
      }),
    );
    await repo.saveTemplate({
      slot: 1,
      name: "New name",
      ingredients: "New ingredients",
      calories: 700,
      protein: null,
      fat: null,
    });
    const snapshot = await repo.load();
    expect(snapshot.templates[0].name).toBe("New name");
    expect(snapshot.meals[0].name).toBe("Old name");
    expect(snapshot.meals[0].calories).toBe(500);
  });

  it("persists a three-meal routine and logs each slot", async () => {
    const blank = makeSnapshot();
    const repo = new BrowserRepository(
      makeSnapshot({
        settings: { ...blank.settings, sameMeal: false, mealsPerDay: 3 },
        templates: [
          blank.templates[0],
          { ...blank.templates[1], name: "Eggs", ingredients: "4 eggs" },
          { ...blank.templates[2], name: "Steak", ingredients: "Ribeye" },
          ...blank.templates.slice(3),
        ],
      }),
    );
    await repo.setMealLogged("2026-01-01", 1, true);
    await repo.setMealLogged("2026-01-01", 2, true);
    await repo.setMealLogged("2026-01-01", 3, true);
    const snapshot = await repo.load();
    expect(snapshot.settings.mealsPerDay).toBe(3);
    expect(snapshot.meals.map((entry) => entry.slot)).toEqual([1, 2, 3]);
    expect(snapshot.meals[2].name).toBe("Steak");
    await expect(repo.setMealLogged("2026-01-01", 4, true)).rejects.toThrow(
      /outside/,
    );
  });

  it("requires a template, validates goals, and clears records", async () => {
    const blank = makeSnapshot();
    const repo = new BrowserRepository(
      makeSnapshot({
        templates: [
          { ...blank.templates[0], name: "", ingredients: "", calories: null, protein: null, fat: null },
          blank.templates[1],
        ],
      }),
    );
    await expect(repo.setMealLogged("2026-01-01", 2, true)).rejects.toThrow(
      /Set up/,
    );
    await expect(
      repo.saveSettings({
        ...makeSnapshot().settings,
        startWeightKg: 80,
        goalWeightKg: 90,
      }),
    ).rejects.toThrow(/below/);

    await repo.upsertWeighIn("2026-01-01", 80);
    await repo.setOffPlan("2026-01-01", "on");
    await repo.setFastingDay("2026-01-02", true);
    await repo.replaceAll(
      makeSnapshot({
        weighIns: [weighIn("2026-02-01", 180)],
        notes: [note("2026-02-01", "imported")],
      }),
    );
    const imported = await repo.load();
    expect(imported.weighIns[0].date).toBe("2026-02-01");
    await repo.resetAll();
    const reset = await repo.load();
    expect(reset.weighIns).toEqual([]);
    expect(reset.fastingDays).toEqual([]);
  });
});
