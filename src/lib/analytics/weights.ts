import type { WeighIn } from "../../types";
import {
  addDays,
  compareDateKeys,
  formatShortDate,
  windowKeys,
} from "../dates";

export const ROLLING_WINDOW_DAYS = 7;
export const MIN_READINGS_PER_WINDOW = 3;

/** Ascending by calendar date; never mutates the input. */
export function sortWeighIns(entries: WeighIn[]): WeighIn[] {
  return [...entries]
    .filter((entry) => Number.isFinite(entry.weightKg) && entry.weightKg > 0)
    .sort((a, b) => compareDateKeys(a.date, b.date));
}

export function latestWeighIn(entries: WeighIn[]): WeighIn | null {
  const sorted = sortWeighIns(entries);
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}

export function earliestWeighIn(entries: WeighIn[]): WeighIn | null {
  const sorted = sortWeighIns(entries);
  return sorted.length > 0 ? sorted[0] : null;
}

/** Entries in the inclusive calendar window [end - (days - 1), end]. */
export function weighInsInWindow(
  entries: WeighIn[],
  endDate: string,
  days: number,
): WeighIn[] {
  if (days < 1) return [];
  const startDate = addDays(endDate, -(days - 1));
  return sortWeighIns(entries).filter(
    (entry) => entry.date >= startDate && entry.date <= endDate,
  );
}

export function meanWeight(entries: WeighIn[]): number | null {
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, entry) => sum + entry.weightKg, 0);
  return total / entries.length;
}

/**
 * Mean of recorded weigh-ins in the trailing seven calendar days ending on
 * `dateKey`. This is deliberately calendar-based: a gap of two weeks produces
 * null rather than averaging the last seven measurements from long ago.
 */
export function rollingAverageAt(
  entries: WeighIn[],
  dateKey: string,
): number | null {
  const window = weighInsInWindow(entries, dateKey, ROLLING_WINDOW_DAYS);
  return meanWeight(window);
}

export interface RollingPoint {
  date: string;
  averageKg: number | null;
}

/**
 * A rolling average at each actual weigh-in date. No intermediate dates are
 * fabricated: the chart only carries points where a measurement exists.
 */
export function rollingAverageSeries(entries: WeighIn[]): RollingPoint[] {
  return sortWeighIns(entries).map((entry) => ({
    date: entry.date,
    averageKg: rollingAverageAt(entries, entry.date),
  }));
}

export interface WeekComparison {
  currentAvgKg: number | null;
  previousAvgKg: number | null;
  changeKg: number | null;
  currentCount: number;
  previousCount: number;
  sufficientData: boolean;
}

/**
 * Current trailing seven days versus the seven days before that.
 * A change is only reported with at least three readings in each window.
 */
export function compareWeeks(
  entries: WeighIn[],
  endDate: string,
  minimumReadings: number = MIN_READINGS_PER_WINDOW,
): WeekComparison {
  const current = weighInsInWindow(entries, endDate, ROLLING_WINDOW_DAYS);
  const previous = weighInsInWindow(
    entries,
    addDays(endDate, -ROLLING_WINDOW_DAYS),
    ROLLING_WINDOW_DAYS,
  );
  const currentAvgKg = meanWeight(current);
  const previousAvgKg = meanWeight(previous);
  const sufficientData =
    current.length >= minimumReadings && previous.length >= minimumReadings;
  return {
    currentAvgKg,
    previousAvgKg,
    changeKg:
      sufficientData && currentAvgKg != null && previousAvgKg != null
        ? currentAvgKg - previousAvgKg
        : null,
    currentCount: current.length,
    previousCount: previous.length,
    sufficientData,
  };
}

export interface WindowChange {
  firstDate: string;
  lastDate: string;
  firstWeightKg: number;
  lastWeightKg: number;
  changeKg: number;
  count: number;
}

/**
 * Change between the first and last actual weigh-in inside a calendar window.
 * Requires at least two measurements; never interpolates a missing day.
 */
export function changeOverWindow(
  entries: WeighIn[],
  endDate: string,
  days: number,
): WindowChange | null {
  const window = weighInsInWindow(entries, endDate, days);
  if (window.length < 2) return null;
  const first = window[0];
  const last = window[window.length - 1];
  return {
    firstDate: first.date,
    lastDate: last.date,
    firstWeightKg: first.weightKg,
    lastWeightKg: last.weightKg,
    changeKg: last.weightKg - first.weightKg,
    count: window.length,
  };
}

export function countWeighInsInWindow(
  entries: WeighIn[],
  endDate: string,
  days: number,
): number {
  return weighInsInWindow(entries, endDate, days).length;
}

/** Human explanation for a missing week-over-week delta. */
export function describeWeekComparisonGap(comparison: WeekComparison): string {
  if (comparison.sufficientData) {
    return "Compared with the previous seven days";
  }
  const missingCurrent = comparison.currentCount < MIN_READINGS_PER_WINDOW;
  const missingPrevious = comparison.previousCount < MIN_READINGS_PER_WINDOW;
  if (missingCurrent && missingPrevious) {
    return "Needs at least 3 weigh-ins in each of the last two 7-day windows.";
  }
  if (missingCurrent) {
    return `Needs at least 3 weigh-ins in the last 7 days.`;
  }
  if (missingPrevious) {
    return `Needs at least 3 weigh-ins in the previous 7 days.`;
  }
  return "Not enough data to compare weeks.";
}

export interface ChartDatum {
  date: string;
  timestamp: number;
  weightKg: number;
  averageKg: number | null;
}

/**
 * Chart-ready rows for a calendar range. Averages are computed from the full
 * history (including days before the visible window) so the line is accurate at
 * the left edge, while rows remain limited to actual weigh-ins in the window.
 */
export function buildChartData(
  entries: WeighIn[],
  endDate: string,
  days: number | "all",
): ChartDatum[] {
  const sorted = sortWeighIns(entries);
  if (sorted.length === 0) return [];
  const startDate =
    days === "all"
      ? sorted[0].date
      : addDays(endDate, -(Math.max(1, days) - 1));
  return sorted
    .filter((entry) => entry.date >= startDate && entry.date <= endDate)
    .map((entry) => {
      const [year, month, day] = entry.date.split("-").map(Number);
      return {
        date: entry.date,
        timestamp: new Date(year, month - 1, day, 12).getTime(),
        weightKg: entry.weightKg,
        averageKg: rollingAverageAt(sorted, entry.date),
      };
    });
}

/** Date labels for the x-axis of a window, evenly spaced. */
export function axisDateKeys(
  startDate: string,
  endDate: string,
  ticks = 5,
): string[] {
  const totalDays = Math.max(
    1,
    Math.round(
      (Date.parse(`${endDate}T12:00:00`) -
        Date.parse(`${startDate}T12:00:00`)) /
        86_400_000,
    ),
  );
  const keys: string[] = [];
  for (let index = 0; index < ticks; index += 1) {
    const offset = Math.round((totalDays * index) / (ticks - 1));
    const key = addDays(startDate, offset);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

export function visibleChartStart(
  entries: WeighIn[],
  endDate: string,
  days: number | "all",
): string {
  if (days === "all") {
    return earliestWeighIn(entries)?.date ?? endDate;
  }
  return addDays(endDate, -(Math.max(1, days) - 1));
}

/** Accessible summary for the weight chart. */
export function chartSummary(
  data: ChartDatum[],
  unitLabelText: string,
  convert: (kg: number) => number,
): string {
  if (data.length === 0) {
    return "No weigh-ins are recorded in this range.";
  }
  const latest = data[data.length - 1];
  const average =
    latest.averageKg == null
      ? "no seven-day average available"
      : `${convert(latest.averageKg).toFixed(1)} ${unitLabelText} seven-day average`;
  return `Weight chart with ${data.length} weigh-in${
    data.length === 1 ? "" : "s"
  } from ${formatShortDate(data[0].date)} to ${formatShortDate(
    latest.date,
  )}. Latest weight ${convert(latest.weightKg).toFixed(1)} ${unitLabelText}, ${average}.`;
}

/**
 * Calendar-day keys for a heatmap row set aligned to Monday. Returns 28 days
 * covering the current week and the three weeks before it.
 */
export function fourWeekCalendarKeys(today: string): string[] {
  // Shift the window end to Sunday so all four rows align Monday–Sunday.
  const day = new Date(Date.parse(`${today}T12:00:00`)).getDay();
  const daysToSunday = (7 - day) % 7;
  return windowKeys(addDays(today, daysToSunday), 28);
}
