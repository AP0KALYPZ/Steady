import type { AppSnapshot } from "../types";
import { formatWeightValue } from "./units";

function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Full CSV export for spreadsheet analysis.
 *
 * Only dates with at least one recorded item appear. Meal columns are left
 * blank on days with no meal log rather than implying a skipped serving, and an
 * unrecorded off-plan status is always written as "not recorded".
 */
export function buildCsv(snapshot: AppSnapshot): string {
  const { unit } = snapshot.settings;
  const dates = new Set<string>();
  for (const entry of snapshot.weighIns) dates.add(entry.date);
  for (const entry of snapshot.meals) dates.add(entry.date);
  for (const entry of snapshot.offPlanDays) dates.add(entry.date);
  for (const entry of snapshot.notes) dates.add(entry.date);

  const weightByDate = new Map(
    snapshot.weighIns.map((entry) => [entry.date, entry.weightKg] as const),
  );
  const noteByDate = new Map(
    snapshot.notes.map((entry) => [entry.date, entry.body] as const),
  );
  const offPlanByDate = new Map(
    snapshot.offPlanDays.map((entry) => [entry.date, entry.status] as const),
  );

  const mealsByDate = new Map<
    string,
    { meal1: (typeof snapshot.meals)[number] | null; meal2: (typeof snapshot.meals)[number] | null }
  >();
  for (const log of snapshot.meals) {
    const record = mealsByDate.get(log.date) ?? {
      meal1: null,
      meal2: null,
    };
    if (log.slot === 1) record.meal1 = log;
    if (log.slot === 2) record.meal2 = log;
    mealsByDate.set(log.date, record);
  }

  const header = [
    "Date",
    `Weight (${unit})`,
    "Meal 1 logged",
    "Meal 1 completed at",
    "Meal 2 logged",
    "Meal 2 completed at",
    "Off-plan status",
    "Daily note",
  ];

  const rows = [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const weight = weightByDate.get(date);
      const record = mealsByDate.get(date);
      const meal1 = record?.meal1 ?? null;
      const meal2 = record?.meal2 ?? null;
      const offPlan = offPlanByDate.get(date);
      return [
        date,
        weight == null ? "" : formatWeightValue(weight, unit),
        record ? (meal1 ? "yes" : "no") : "",
        meal1?.loggedAt ?? "",
        record ? (meal2 ? "yes" : "no") : "",
        meal2?.loggedAt ?? "",
        offPlan === "on"
          ? "on plan"
          : offPlan === "off"
            ? "off plan"
            : "not recorded",
        noteByDate.get(date) ?? "",
      ];
    });

  return [header, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
}

export function csvFilename(today: string): string {
  return `steady-progress-${today}.csv`;
}

export function backupFilename(today: string): string {
  return `steady-backup-${today}.json`;
}
