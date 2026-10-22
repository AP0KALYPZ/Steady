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
    Map<number, (typeof snapshot.meals)[number]>
  >();
  for (const log of snapshot.meals) {
    const record = mealsByDate.get(log.date) ?? new Map();
    record.set(log.slot, log);
    mealsByDate.set(log.date, record);
  }

  // Include the active routine plus any preserved historical slots so a
  // reduced meal count never drops older records from the export.
  const mealCount = Math.max(
    snapshot.settings.mealsPerDay,
    ...snapshot.meals.map((log) => log.slot),
    1,
  );
  const mealHeaders = Array.from({ length: mealCount }, (_, index) => {
    const slot = index + 1;
    return [`Meal ${slot} logged`, `Meal ${slot} completed at`];
  }).flat();

  const header = [
    "Date",
    `Weight (${unit})`,
    ...mealHeaders,
    "Off-plan status",
    "Daily note",
  ];

  const rows = [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const weight = weightByDate.get(date);
      const record = mealsByDate.get(date);
      const mealCells = Array.from({ length: mealCount }, (_, index) => {
        const log = record?.get(index + 1) ?? null;
        return [record ? (log ? "yes" : "no") : "", log?.loggedAt ?? ""];
      }).flat();
      const offPlan = offPlanByDate.get(date);
      return [
        date,
        weight == null ? "" : formatWeightValue(weight, unit),
        ...mealCells,
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
