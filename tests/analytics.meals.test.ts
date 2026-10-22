import { describe, expect, it } from "vitest";
import {
  buildConsistencyHeatmap,
  buildWeeklyBlocks,
  mealLogsForDate,
  offPlanStatusForDate,
  summarizeMeals,
  summarizeOffPlan,
} from "../src/lib/analytics/meals";
import { meal, offPlan } from "./fixtures";

describe("meal logging analytics", () => {
  const meals = [
    meal("2025-12-31", 1),
    meal("2026-01-04", 1),
    meal("2026-01-04", 2),
    meal("2026-01-05", 1),
    meal("2026-01-07", 2),
  ];

  it("counts two slots only on days with a meal record", () => {
    const summary = summarizeMeals(meals, "2026-01-10", 7);
    expect(summary.daysWithRecords).toBe(3);
    expect(summary.loggedServings).toBe(4);
    expect(summary.possibleServings).toBe(6);
    expect(summary.completedDays).toBe(1);
    expect(summary.percent).toBeCloseTo(66.666, 2);
  });

  it("returns an explicit empty state instead of 0%", () => {
    const summary = summarizeMeals([], "2026-01-10", 7);
    expect(summary.percent).toBeNull();
    expect(summary.possibleServings).toBe(0);
    expect(summary.daysWithRecords).toBe(0);
  });

  it("does not infer missing days as failed servings", () => {
    // One recorded day with both servings = 100%, not 2/14 for a week.
    const summary = summarizeMeals(
      [meal("2026-01-10", 1), meal("2026-01-10", 2)],
      "2026-01-10",
      7,
    );
    expect(summary.percent).toBe(100);
    expect(summary.possibleServings).toBe(2);
  });

  it("finds logs by date and slot without inventing entries", () => {
    const logs = mealLogsForDate(meals, "2026-01-04");
    expect(logs.meal1?.date).toBe("2026-01-04");
    expect(logs.meal2?.date).toBe("2026-01-04");
    expect(mealLogsForDate(meals, "2026-01-06")).toEqual({
      meal1: null,
      meal2: null,
    });
  });

  it("counts only explicit off-plan statuses and their denominator", () => {
    const records = [
      offPlan("2026-01-05", "on"),
      offPlan("2026-01-06", "off"),
      offPlan("2026-01-07", "off"),
    ];
    const summary = summarizeOffPlan(records, "2026-01-10", 7);
    expect(summary.offPlanDays).toBe(2);
    expect(summary.recordedDays).toBe(3);

    // A day with only a meal log has NO off-plan status.
    expect(offPlanStatusForDate(records, "2026-01-04")).toBeNull();
    expect(summarizeOffPlan([], "2026-01-10", 30)).toEqual({
      offPlanDays: 0,
      recordedDays: 0,
    });
  });

  it("aligns the four-week heatmap Monday through Sunday", () => {
    const cells = buildConsistencyHeatmap(
      [meal("2026-10-22", 1), meal("2026-10-22", 2), meal("2026-10-21", 2)],
      [offPlan("2026-10-22", "off")],
      "2026-10-22",
    );
    expect(cells).toHaveLength(28);
    expect(cells[0].date).toBe("2026-09-28");
    expect(cells[27].date).toBe("2026-10-25");

    const today = cells.find((cell) => cell.date === "2026-10-22");
    expect(today?.isToday).toBe(true);
    expect(today?.level).toBe("full");
    expect(today?.offPlanStatus).toBe("off");
    expect(today?.isFuture).toBe(false);

    const yesterday = cells.find((cell) => cell.date === "2026-10-21");
    expect(yesterday?.level).toBe("partial");

    expect(cells.find((cell) => cell.date === "2026-10-23")?.isFuture).toBe(
      true,
    );
    expect(cells.find((cell) => cell.date === "2026-10-23")?.level).toBe(
      "none",
    );
  });

  it("builds four rolling seven-day blocks, not calendar weeks", () => {
    const blocks = buildWeeklyBlocks(
      [
        meal("2026-01-10", 1),
        meal("2026-01-10", 2),
        meal("2026-01-03", 1),
      ],
      "2026-01-10",
    );
    expect(blocks).toHaveLength(4);
    expect(blocks[0].label).toBe("Last 7 days");
    expect(blocks[0].startDate).toBe("2026-01-04");
    expect(blocks[0].endDate).toBe("2026-01-10");
    expect(blocks[0].loggedServings).toBe(2);
    expect(blocks[1].label).toBe("8–14 days ago");
    expect(blocks[1].startDate).toBe("2025-12-28");
    expect(blocks[1].loggedServings).toBe(1);
    expect(blocks[3].possibleServings).toBe(0);
    expect(blocks[3].percent).toBeNull();
  });
});
