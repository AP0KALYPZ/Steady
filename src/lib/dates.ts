/**
 * Calendar-date helpers.
 *
 * STEADY stores every date as a timezone-local calendar key (`YYYY-MM-DD`).
 * Dates are parsed at local noon so daylight-saving transitions and leap days
 * can never move a record onto the neighbouring day.
 */

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad2 = (value: number): string => String(value).padStart(2, "0");

export function isValidDateKey(key: string): boolean {
  const match = DATE_KEY_RE.exec(key);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day, 12);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Parse a calendar key at local noon. Throws on an invalid key. */
export function parseDateKey(key: string): Date {
  if (!isValidDateKey(key)) {
    throw new Error(`Invalid calendar date: ${key}`);
  }
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/** Format a Date as its local calendar key. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

/** Add whole calendar days without leaving local time or losing DST days. */
export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function compareDateKeys(a: string, b: string): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

export function isAfter(a: string, b: string): boolean {
  return compareDateKeys(a, b) > 0;
}

export function isBefore(a: string, b: string): boolean {
  return compareDateKeys(a, b) < 0;
}

/** Whole-day difference between two calendar keys (b - a). */
export function differenceInDays(a: string, b: string): number {
  const from = parseDateKey(a).getTime();
  const to = parseDateKey(b).getTime();
  return Math.round((to - from) / 86_400_000);
}

/**
 * Calendar keys in the inclusive window ending on `endKey`.
 * A window of 7 returns end-6 … end.
 */
export function windowKeys(endKey: string, days: number): string[] {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error(`Window size must be a positive integer, received ${days}`);
  }
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    keys.push(addDays(endKey, -offset));
  }
  return keys;
}

/** `YYYY-MM` key for a calendar day or month. */
export function monthKey(key: string): string {
  return key.slice(0, 7);
}

/** Move a `YYYY-MM` key by whole months. */
export function addMonths(key: string, months: number): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) {
    throw new Error(`Invalid calendar month: ${key}`);
  }
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1, 12);
  date.setMonth(date.getMonth() + months);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** Monday–Sunday grid for a month, padded with empty leading/trailing cells. */
export function monthGridKeys(key: string): (string | null)[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) {
    throw new Error(`Invalid calendar month: ${key}`);
  }
  const first = `${key}-01`;
  if (!isValidDateKey(first)) {
    throw new Error(`Invalid calendar month: ${key}`);
  }
  const date = parseDateKey(first);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const leading = (date.getDay() + 6) % 7;
  const cells: (string | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${key}-${pad2(day)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Monday that begins the ISO-style week containing `key`. */
export function startOfMondayWeek(key: string): string {
  const date = parseDateKey(key);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return addDays(key, -daysSinceMonday);
}

const shortFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const mediumFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const mediumWithYearFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const historyFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const longFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const longWithYearFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

/** A calendar key rendered through Intl, e.g. "Oct 22". */
export function formatShortDate(key: string): string {
  return shortFormatter.format(parseDateKey(key));
}

/** e.g. "Thu, Oct 22". */
export function formatMediumDate(key: string): string {
  return mediumFormatter.format(parseDateKey(key));
}

/** e.g. "Thu, Oct 22, 2026". */
export function formatMediumDateWithYear(key: string): string {
  return mediumWithYearFormatter.format(parseDateKey(key));
}

/** e.g. "Oct 22, 2026". */
export function formatHistoryDate(key: string): string {
  return historyFormatter.format(parseDateKey(key));
}

/** e.g. "Thu". */
export function formatWeekday(key: string): string {
  return weekdayFormatter.format(parseDateKey(key));
}

/** e.g. "October 2026". */
export function formatMonthYear(key: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) {
    throw new Error(`Invalid calendar month: ${key}`);
  }
  return monthFormatter.format(parseDateKey(`${key}-01`));
}

/** e.g. "Thursday, October 22". */
export function formatLongDate(key: string): string {
  return longFormatter.format(parseDateKey(key));
}

/** e.g. "Thursday, October 22, 2026". */
export function formatLongDateWithYear(key: string): string {
  return longWithYearFormatter.format(parseDateKey(key));
}

/** Relative day label used by the journal header. */
export function describeJournalDate(key: string, today: string): string {
  if (key === today) {
    return `Today · ${formatMediumDateWithYear(key)}`;
  }
  if (key === addDays(today, -1)) {
    return `Yesterday · ${formatMediumDateWithYear(key)}`;
  }
  return formatMediumDateWithYear(key);
}

/** Local time of a stored ISO timestamp, or null if it cannot be parsed. */
export function formatLoggedTime(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Milliseconds until the next local midnight (for live "today" rollover). */
export function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    50,
  );
  return Math.max(1000, next.getTime() - now.getTime());
}
