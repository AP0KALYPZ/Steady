import { describe, expect, it } from "vitest";
import {
  buildChartData,
  changeOverWindow,
  compareWeeks,
  countWeighInsInWindow,
  latestWeighIn,
  rollingAverageAt,
  rollingAverageSeries,
  visibleChartStart,
  weighInsInWindow,
} from "../src/lib/analytics/weights";
import { lbs, weighIn } from "./fixtures";

const entries = [
  weighIn("2026-01-01", 200),
  weighIn("2026-01-02", 199),
  weighIn("2026-01-03", 198),
  weighIn("2026-01-04", 197),
  weighIn("2026-01-05", 196),
  weighIn("2026-01-06", 195),
  weighIn("2026-01-07", 194),
  weighIn("2026-01-20", 190),
];

describe("weight analytics", () => {
  it("handles an empty history transparently", () => {
    expect(latestWeighIn([])).toBeNull();
    expect(rollingAverageAt([], "2026-01-10")).toBeNull();
    expect(compareWeeks([], "2026-01-10").changeKg).toBeNull();
    expect(changeOverWindow([], "2026-01-10", 30)).toBeNull();
    expect(buildChartData([], "2026-01-10", 30)).toEqual([]);
  });

  it("averages only readings in the trailing seven calendar days", () => {
    // A long gap must not be bridged by averaging the last seven measurements.
    expect(rollingAverageAt(entries, "2026-01-20")).toBeCloseTo(lbs(190), 9);
    expect(rollingAverageAt(entries, "2026-01-05")).toBeCloseTo(lbs(198), 9);
    expect(rollingAverageAt(entries, "2026-01-14")).toBeNull();
  });

  it("keeps rolling series limited to actual measurement dates", () => {
    const series = rollingAverageSeries(entries);
    expect(series).toHaveLength(entries.length);
    expect(series.map((point) => point.date)).toEqual(entries.map((e) => e.date));
    expect(series[0].averageKg).toBeCloseTo(lbs(200), 9);
  });

  it("requires three readings in each window before comparing weeks", () => {
    const insufficient = compareWeeks(
      [weighIn("2026-01-08", 190), weighIn("2026-01-09", 189), weighIn("2026-01-10", 188), weighIn("2026-01-02", 195)],
      "2026-01-10",
    );
    expect(insufficient.sufficientData).toBe(false);
    expect(insufficient.changeKg).toBeNull();
    expect(insufficient.currentCount).toBe(3);
    expect(insufficient.previousCount).toBe(1);

    const sufficient = compareWeeks(
      [
        weighIn("2026-01-01", 96),
        weighIn("2026-01-02", 96),
        weighIn("2026-01-03", 96),
        weighIn("2026-01-08", 91),
        weighIn("2026-01-09", 91),
        weighIn("2026-01-10", 91),
      ],
      "2026-01-10",
    );
    expect(sufficient.sufficientData).toBe(true);
    expect(sufficient.changeKg).toBeCloseTo(lbs(-5), 9);
  });

  it("uses the first and last actual weigh-in inside 30 days", () => {
    const change = changeOverWindow(
      [
        weighIn("2025-11-01", 220),
        weighIn("2026-01-05", 200),
        weighIn("2026-01-20", 195),
        weighIn("2026-01-31", 190),
      ],
      "2026-01-31",
      30,
    );
    expect(change?.firstDate).toBe("2026-01-05");
    expect(change?.lastDate).toBe("2026-01-31");
    expect(change?.changeKg).toBeCloseTo(weighIn("2026-01-31", 190).weightKg - weighIn("2026-01-05", 200).weightKg, 6);
    expect(change?.count).toBe(3);
  });

  it("returns null when only one measurement exists in the window", () => {
    expect(
      changeOverWindow([weighIn("2026-01-20", 190)], "2026-01-31", 30),
    ).toBeNull();
  });

  it("excludes out-of-window readings but computes averages from history", () => {
    const data = buildChartData(entries, "2026-01-07", 3);
    expect(data.map((row) => row.date)).toEqual([
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
    ]);
    // Jan 5 average uses Jan 1–5 (200, 199, 198, 197, 196 → 198).
    expect(data[0].averageKg).toBeCloseTo(lbs(198), 9);
  });

  it("uses the earliest record for the all-time range", () => {
    expect(visibleChartStart(entries, "2026-01-20", "all")).toBe("2026-01-01");
    expect(visibleChartStart(entries, "2026-01-20", 30)).toBe("2025-12-22");
  });

  it("counts only real entries in the window", () => {
    expect(weighInsInWindow(entries, "2026-01-07", 3)).toHaveLength(3);
    expect(countWeighInsInWindow(entries, "2026-01-20", 7)).toBe(1);
    expect(countWeighInsInWindow(entries, "2026-01-07", 7)).toBe(7);
  });

  it("does not treat missing days as zero or as a reading", () => {
    const window = weighInsInWindow(
      [weighIn("2026-01-01", 200), weighIn("2026-01-10", 190)],
      "2026-01-10",
      30,
    );
    expect(window).toHaveLength(2);
    expect(window.every((entry) => entry.weightKg > 0)).toBe(true);
  });
});
