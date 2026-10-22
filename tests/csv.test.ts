import { describe, expect, it } from "vitest";
import { buildCsv, backupFilename, csvFilename } from "../src/lib/csv";
import { makeSnapshot, meal, note, offPlan, weighIn } from "./fixtures";

describe("CSV export", () => {
  const snapshot = makeSnapshot({
    weighIns: [weighIn("2026-01-02", 180), weighIn("2026-01-05", 179)],
    meals: [meal("2026-01-05", 1), meal("2026-01-03", 2)],
    offPlanDays: [offPlan("2026-01-05", "off"), offPlan("2026-01-03", "on")],
    notes: [note("2026-01-05", 'Kept it simple, "steady" all day')],
  });

  it("exports recorded dates newest first with a full header", () => {
    const lines = buildCsv(snapshot).split("\r\n");
    expect(lines[0]).toBe(
      '"Date","Weight (lb)","Meal 1 logged","Meal 1 completed at","Meal 2 logged","Meal 2 completed at","Off-plan status","Daily note"',
    );
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('"2026-01-05"');
    expect(lines[2]).toContain('"2026-01-03"');
    expect(lines[3]).toContain('"2026-01-02"');
  });

  it("leaves unrecorded meal slots blank and names off-plan absence", () => {
    const rows = buildCsv(snapshot).split("\r\n");
    const weightOnly = rows.find((row) => row.startsWith('"2026-01-02"'));
    expect(weightOnly).toBe(
      '"2026-01-02","180.0","","","","","not recorded",""',
    );
    const mealDay = rows.find((row) => row.startsWith('"2026-01-03"'));
    expect(mealDay).toContain('"no","","yes"');
    expect(mealDay).toContain('"on plan"');
  });

  it("records an explicit off-plan day and tips for the other slot", () => {
    const row = buildCsv(snapshot)
      .split("\r\n")
      .find((line) => line.startsWith('"2026-01-05"'));
    expect(row).toContain('"yes","2026-01-05T12:00:00.000Z","no",""');
    expect(row).toContain('"off plan"');
  });

  it("escapes quotes and uses RFC4180 line endings", () => {
    const csv = buildCsv(snapshot);
    expect(csv).toContain('"Kept it simple, ""steady"" all day"');
    expect(csv).not.toContain("\n\n");
    expect(csv.includes("\r\n")).toBe(true);
  });

  it("uses the selected display unit without changing stored values", () => {
    const kg = buildCsv(
      makeSnapshot({
        settings: { ...makeSnapshot().settings, unit: "kg" },
        weighIns: [weighIn("2026-01-02", 180)],
      }),
    );
    expect(kg.split("\r\n")[0]).toContain('"Weight (kg)"');
    expect(kg).toContain('"81.6"');
  });

  it("exports only dates that have at least one record", () => {
    const empty = buildCsv(makeSnapshot());
    expect(empty.split("\r\n")).toHaveLength(1);
  });

  it("adds meal columns for a three-meal routine", () => {
    const base = makeSnapshot();
    const rows = buildCsv(
      makeSnapshot({
        settings: { ...base.settings, mealsPerDay: 3 },
        meals: [meal("2026-01-05", 1), meal("2026-01-05", 3)],
      }),
    ).split("\r\n");
    expect(rows[0]).toContain('"Meal 3 logged","Meal 3 completed at"');
    expect(rows[1]).toContain(
      '"yes","2026-01-05T12:00:00.000Z","no","","yes"',
    );
  });

  it("builds date-stamped filenames", () => {
    expect(csvFilename("2026-10-22")).toBe("steady-progress-2026-10-22.csv");
    expect(backupFilename("2026-10-22")).toBe(
      "steady-backup-2026-10-22.json",
    );
  });
});
