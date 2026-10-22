import { describe, expect, it } from "vitest";
import {
  BACKUP_VERSION,
  buildBackup,
  parseBackup,
  serializeBackup,
} from "../src/lib/backup";
import { toKilograms } from "../src/lib/units";
import { meal, makeSnapshot, note, offPlan, weighIn } from "./fixtures";

const TODAY = "2026-10-22";

function snapshot() {
  return makeSnapshot({
    weighIns: [weighIn("2026-10-20", 180), weighIn("2026-10-21", 179.4)],
    meals: [meal("2026-10-21", 1), meal("2026-10-21", 2)],
    offPlanDays: [offPlan("2026-10-21", "off")],
    notes: [note("2026-10-21", "Energy steady.")],
  });
}

describe("JSON backups", () => {
  it("serializes a versioned backup and restores the same data", () => {
    const source = snapshot();
    const json = serializeBackup(source, "1.0.0", new Date("2026-10-22T12:00:00Z"));
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe("steady-backup");
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.appVersion).toBe("1.0.0");

    const result = parseBackup(json, TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.settings.startWeightKg).toBeCloseTo(
      source.settings.startWeightKg as number,
      9,
    );
    expect(result.snapshot.settings.mealsPerDay).toBe(2);
    expect(result.snapshot.templates).toHaveLength(6);
    expect(result.snapshot.weighIns).toHaveLength(2);
    expect(result.snapshot.meals[0].name).toBe("Beef plate");
    expect(result.snapshot.notes[0].body).toBe("Energy steady.");
  });

  it("restores a three-meal routine and fills untouched slots", () => {
    const base = makeSnapshot();
    const source = makeSnapshot({
      settings: { ...base.settings, mealsPerDay: 3, sameMeal: false },
      meals: [meal("2026-10-21", 1), meal("2026-10-21", 3)],
    });
    const result = parseBackup(serializeBackup(source, "1.0.0"), TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.settings.mealsPerDay).toBe(3);
    expect(result.snapshot.settings.sameMeal).toBe(false);
    expect(result.snapshot.templates).toHaveLength(6);
    expect(result.snapshot.meals.map((entry) => entry.slot)).toEqual([1, 3]);
  });

  it("defaults an older backup without a meal count to two", () => {
    const backup = buildBackup(snapshot(), "1.0.0");
    backup.version = 2;
    delete (backup.data.settings as unknown as Record<string, unknown>)
      .mealsPerDay;
    const result = parseBackup(JSON.stringify(backup), TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.settings.mealsPerDay).toBe(2);
    expect(result.snapshot.templates).toHaveLength(6);
  });

  it("includes a schema version and refuses files from a newer schema", () => {
    const backup = buildBackup(snapshot(), "1.0.0");
    const json = JSON.stringify({ ...backup, version: BACKUP_VERSION + 1 });
    const result = parseBackup(json, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("newer");
    }
  });

  it("rejects invalid JSON without touching data", () => {
    const result = parseBackup("{not json", TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain("not valid JSON");
  });

  it("rejects unknown formats and missing sections", () => {
    expect(parseBackup(JSON.stringify({ format: "other" }), TODAY).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ format: "steady-backup", version: 2, data: {} }), TODAY).ok).toBe(false);
  });

  it("validates weights, dates, duplicates and future records", () => {
    const base = buildBackup(snapshot(), "1.0.0");
    const mutate = (change: (data: typeof base.data) => void) => {
      const copy = JSON.parse(JSON.stringify(base));
      change(copy.data);
      return parseBackup(JSON.stringify(copy), TODAY);
    };

    const future = mutate((data) => {
      data.weighIns.push({ date: "2026-10-23", weightKg: 80 });
    });
    expect(future.ok).toBe(false);

    const futureNote = mutate((data) => {
      data.notes.push({ date: "2026-12-01", body: "later" });
    });
    expect(futureNote.ok).toBe(false);

    const duplicate = mutate((data) => {
      data.weighIns.push({ ...data.weighIns[0] });
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.errors[0]).toContain("Duplicate");

    const negative = mutate((data) => {
      data.weighIns[0].weightKg = -4;
    });
    expect(negative.ok).toBe(false);

    const badDate = mutate((data) => {
      data.weighIns[0].date = "2026-02-30";
    });
    expect(badDate.ok).toBe(false);
  });

  it("enforces a weight-loss target below the start and complete settings", () => {
    const backup = buildBackup(snapshot(), "1.0.0");
    backup.data.settings.goalWeightKg = backup.data.settings.startWeightKg;
    const result = parseBackup(JSON.stringify(backup), TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("below");

    const halfConfigured = buildBackup(snapshot(), "1.0.0");
    halfConfigured.data.settings.goalWeightKg = null;
    expect(parseBackup(JSON.stringify(halfConfigured), TODAY).ok).toBe(false);
  });

  it("validates meal slots and saved descriptions", () => {
    const backup = buildBackup(snapshot(), "1.0.0");
    backup.data.meals[0].name = "";
    const result = parseBackup(JSON.stringify(backup), TODAY);
    expect(result.ok).toBe(false);

    const badSlot = buildBackup(snapshot(), "1.0.0");
    // Force an unsupported slot past the type system.
    (badSlot.data.meals[0] as unknown as { slot: number }).slot = 7;
    expect(parseBackup(JSON.stringify(badSlot), TODAY).ok).toBe(false);
  });

  it("rejects an out-of-range daily meal count", () => {
    const backup = buildBackup(snapshot(), "1.0.0");
    (backup.data.settings as unknown as { mealsPerDay: number }).mealsPerDay = 7;
    const result = parseBackup(JSON.stringify(backup), TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("1 to 6");
  });

  it("limits notes and rejects an invalid completion timestamp", () => {
    const backup = buildBackup(snapshot(), "1.0.0");
    backup.data.notes[0].body = "x".repeat(5001);
    expect(parseBackup(JSON.stringify(backup), TODAY).ok).toBe(false);

    const badTime = buildBackup(snapshot(), "1.0.0");
    badTime.data.meals[0].loggedAt = "not-a-time";
    expect(parseBackup(JSON.stringify(badTime), TODAY).ok).toBe(false);
  });

  it("converts a legacy browser prototype backup from pounds", () => {
    const legacy = {
      format: "steady-v1",
      exportedAt: "2026-01-10T10:00:00.000Z",
      data: {
        unit: "lb",
        startWeight: 200,
        goalWeight: 180,
        weights: { "2026-01-01": 200, "2026-01-02": 199, "2026-01-09": 1500 },
        meals: {
          "2026-01-01": { meal1: true, meal2: false },
          "2026-01-02": { meal1: true, meal2: true },
        },
        offplan: {
          "2026-01-01": { status: "off" },
          "2026-01-02": { status: "unknown" },
        },
        notes: { "2026-01-01": "First day", "2026-01-02": "" },
        sameMeal: true,
        templates: [
          {
            name: "Steak",
            ingredients: "300 g",
            calories: "",
            protein: "50",
            fat: "",
          },
          { name: "Eggs", ingredients: "", calories: "", protein: "", fat: "" },
        ],
      },
    };
    const result = parseBackup(JSON.stringify(legacy), TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings[0]).toContain("pounds");
    expect(result.snapshot.settings.startWeightKg).toBeCloseTo(
      toKilograms(200, "lb"),
      9,
    );
    expect(result.snapshot.weighIns).toHaveLength(2);
    expect(result.snapshot.meals).toHaveLength(3);
    expect(result.snapshot.meals[0].name).toBe("Steak");
    expect(result.snapshot.offPlanDays).toEqual([
      { date: "2026-01-01", status: "off" },
    ]);
    expect(result.snapshot.notes).toHaveLength(1);
    expect(result.snapshot.templates[0].protein).toBe(50);
    expect(result.snapshot.templates[0].calories).toBeNull();
  });

  it("leaves an invalid legacy goal unset rather than inventing one", () => {
    const legacy = {
      format: "steady-v1",
      data: {
        unit: "kg",
        startWeight: 180,
        goalWeight: 200,
        weights: {},
        meals: {},
        offplan: {},
        notes: {},
        sameMeal: true,
        templates: [],
      },
    };
    const result = parseBackup(JSON.stringify(legacy), TODAY);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.settings.goalWeightKg).toBeNull();
      expect(result.warnings.join(" ")).toContain("not below");
    }
  });
});
