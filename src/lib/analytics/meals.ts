import type {
  MealLog,
  MealSlot,
  OffPlanDay,
  OffPlanStatus,
} from "../../types";
import {
  mealSlotsForCount,
  normalizeMealsPerDay,
} from "../../types";
import { addDays, windowKeys } from "../dates";
import { fourWeekCalendarKeys } from "./weights";

export interface MealSummary {
  loggedServings: number;
  /** Scheduled servings on each day that has a meal record. */
  possibleServings: number;
  daysWithRecords: number;
  completedDays: number;
  /** Percentage of scheduled servings logged on recorded days. */
  percent: number | null;
  mealsPerDay: number;
}

export function mealLogForSlot(
  meals: MealLog[],
  date: string,
  slot: MealSlot,
): MealLog | null {
  return (
    meals.find((log) => log.date === date && log.slot === slot) ?? null
  );
}

/**
 * Unique recorded slots for a date, limited to the current daily routine.
 * Historical servings above a reduced meal count stay in storage but do not
 * distort today's denominators.
 */
export function loggedMealSlots(
  meals: MealLog[],
  date: string,
  mealsPerDay: number,
): MealSlot[] {
  const active = new Set(mealSlotsForCount(mealsPerDay));
  const slots = new Set<MealSlot>();
  for (const log of meals) {
    if (log.date === date && active.has(log.slot)) slots.add(log.slot);
  }
  return [...slots].sort((a, b) => a - b);
}

export function loggedMealCount(
  meals: MealLog[],
  date: string,
  mealsPerDay: number,
): number {
  return loggedMealSlots(meals, date, mealsPerDay).length;
}

/**
 * "Meals tracked" measures logging, not diet quality. The denominator counts
 * the user's scheduled servings only on days with at least one explicit meal
 * record. A day that was never opened contributes nothing and is never treated
 * as a skipped or failed day.
 */
export function summarizeMeals(
  meals: MealLog[],
  endDate: string,
  days: number,
  mealsPerDay: number,
): MealSummary {
  const scheduled = normalizeMealsPerDay(mealsPerDay);
  const byDate = new Map<string, Set<MealSlot>>();
  for (const log of meals) {
    if (log.slot > scheduled) continue;
    const slots = byDate.get(log.date) ?? new Set<MealSlot>();
    slots.add(log.slot);
    byDate.set(log.date, slots);
  }

  let loggedServings = 0;
  let daysWithRecords = 0;
  let completedDays = 0;

  for (const key of windowKeys(endDate, days)) {
    const slots = byDate.get(key);
    if (!slots || slots.size === 0) continue;
    daysWithRecords += 1;
    loggedServings += slots.size;
    if (slots.size >= scheduled) completedDays += 1;
  }

  const possibleServings = daysWithRecords * scheduled;
  return {
    loggedServings,
    possibleServings,
    daysWithRecords,
    completedDays,
    mealsPerDay: scheduled,
    percent:
      possibleServings === 0
        ? null
        : (loggedServings / possibleServings) * 100,
  };
}

export interface OffPlanSummary {
  offPlanDays: number;
  /** Days with an explicit on-plan or off-plan status. */
  recordedDays: number;
}

export function summarizeOffPlan(
  offPlanDays: OffPlanDay[],
  endDate: string,
  days: number,
): OffPlanSummary {
  const byDate = new Map(
    offPlanDays.map((entry) => [entry.date, entry.status] as const),
  );
  let offPlanCount = 0;
  let recordedDays = 0;
  for (const key of windowKeys(endDate, days)) {
    const status = byDate.get(key);
    if (status === "on" || status === "off") {
      recordedDays += 1;
      if (status === "off") offPlanCount += 1;
    }
  }
  return { offPlanDays: offPlanCount, recordedDays };
}

export function offPlanStatusForDate(
  offPlanDays: OffPlanDay[],
  date: string,
): OffPlanStatus | null {
  return offPlanDays.find((entry) => entry.date === date)?.status ?? null;
}

export type HeatLevel = "none" | "partial" | "full";

export function isFastingDay(fastingDays: string[], date: string): boolean {
  return fastingDays.includes(date);
}

/** Count intentionally recorded fasting days in an inclusive window. */
export function summarizeFasting(
  fastingDays: string[],
  endDate: string,
  days: number,
): number {
  const window = new Set(windowKeys(endDate, days));
  return new Set(fastingDays.filter((date) => window.has(date))).size;
}

export interface HeatCell {
  date: string;
  level: HeatLevel;
  loggedCount: number;
  offPlanStatus: OffPlanStatus | null;
  isFasting: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * Four Monday–Sunday calendar weeks, ending with the current week. Future days
 * are present but marked so the UI can disable them.
 */
export function buildConsistencyHeatmap(
  meals: MealLog[],
  offPlanDays: OffPlanDay[],
  today: string,
  mealsPerDay: number,
  fastingDays: string[] = [],
): HeatCell[] {
  const scheduled = normalizeMealsPerDay(mealsPerDay);
  const fasting = new Set(fastingDays);
  const keys = fourWeekCalendarKeys(today);
  const mealsByDate = new Map<string, Set<MealSlot>>();
  for (const log of meals) {
    if (log.slot > scheduled) continue;
    const slots = mealsByDate.get(log.date) ?? new Set<MealSlot>();
    slots.add(log.slot);
    mealsByDate.set(log.date, slots);
  }
  const offByDate = new Map(
    offPlanDays.map((entry) => [entry.date, entry.status] as const),
  );

  return keys.map((date) => {
    const slots = mealsByDate.get(date);
    const loggedCount = slots?.size ?? 0;
    return {
      date,
      loggedCount,
      level:
        loggedCount >= scheduled
          ? "full"
          : loggedCount > 0
            ? "partial"
            : "none",
      offPlanStatus: offByDate.get(date) ?? null,
      isFasting: fasting.has(date),
      isToday: date === today,
      isFuture: date > today,
    };
  });
}

export interface WeeklyBlock extends MealSummary {
  label: string;
  startDate: string;
  endDate: string;
}

/**
 * Four rolling seven-day blocks ending today. These are explicitly rolling
 * windows, not Monday–Sunday calendar weeks.
 */
export function buildWeeklyBlocks(
  meals: MealLog[],
  today: string,
  mealsPerDay: number,
  blocks = 4,
): WeeklyBlock[] {
  const result: WeeklyBlock[] = [];
  for (let index = 0; index < blocks; index += 1) {
    const endDate = addDays(today, -index * 7);
    const startDate = addDays(endDate, -6);
    result.push({
      ...summarizeMeals(meals, endDate, 7, mealsPerDay),
      label:
        index === 0
          ? "Last 7 days"
          : `${index * 7 + 1}–${index * 7 + 7} days ago`,
      startDate,
      endDate,
    });
  }
  return result;
}

/** Records a meal with a template snapshot so later edits cannot rewrite it. */
export function snapshotMeal(
  template: {
    name: string;
    ingredients: string;
    calories: number | null;
    protein: number | null;
    fat: number | null;
  },
  date: string,
  slot: MealSlot,
  loggedAt: string | null = new Date().toISOString(),
): MealLog {
  return {
    date,
    slot,
    loggedAt,
    name: template.name,
    ingredients: template.ingredients,
    calories: template.calories,
    protein: template.protein,
    fat: template.fat,
  };
}
