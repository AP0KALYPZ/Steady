import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  describeJournalDate,
  formatMonthYear,
  monthGridKeys,
  differenceInDays,
  formatShortDate,
  isValidDateKey,
  parseDateKey,
  startOfMondayWeek,
  todayKey,
  windowKeys,
} from "../src/lib/dates";
import { fourWeekCalendarKeys } from "../src/lib/analytics/weights";

describe("calendar date keys", () => {
  it("formats local dates with zero padding", () => {
    expect(todayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayKey(new Date(2026, 11, 31, 0, 1))).toBe("2026-12-31");
  });

  it("round-trips a key through local noon", () => {
    const date = parseDateKey("2026-10-22");
    expect(date.getHours()).toBe(12);
    expect(todayKey(date)).toBe("2026-10-22");
  });

  it("rejects impossible and malformed dates", () => {
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("2025-13-01")).toBe(false);
    expect(isValidDateKey("2026-1-01")).toBe(false);
    expect(isValidDateKey("2026-10-22T00:00:00Z")).toBe(false);
    expect(() => parseDateKey("nope")).toThrow();
  });

  it("adds days across leap day, month and year boundaries", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-03-10", -1)).toBe("2024-03-09");
  });

  it("adds days successfully across a daylight-saving transition", () => {
    // These dates cover spring-forward and fall-back in US timezones. Local
    // noon parsing must keep one calendar day of movement.
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(differenceInDays("2026-03-07", "2026-03-09")).toBe(2);
    expect(differenceInDays("2026-10-31", "2026-11-02")).toBe(2);
  });

  it("builds inclusive trailing windows", () => {
    expect(windowKeys("2026-10-22", 7)).toEqual([
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
    ]);
    expect(windowKeys("2026-10-22", 1)).toEqual(["2026-10-22"]);
    expect(() => windowKeys("2026-10-22", 0)).toThrow();
  });

  it("moves across month and year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2024-02", 1)).toBe("2024-03");
    expect(formatMonthYear("2026-10")).toBe("October 2026");
    expect(() => addMonths("2026-13", 1)).toThrow();
  });

  it("builds a Monday-first month grid padded to whole weeks", () => {
    const october = monthGridKeys("2026-10");
    expect(october).toHaveLength(35);
    expect(october.slice(0, 3)).toEqual([null, null, null]);
    expect(october[3]).toBe("2026-10-01");
    expect(october[33]).toBe("2026-10-31");
    expect(october[34]).toBeNull();

    const february = monthGridKeys("2026-02");
    expect(february.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(february[6]).toBe("2026-02-01");
    expect(february[33]).toBe("2026-02-28");
    expect(february).toHaveLength(35);
  });

  it("finds the Monday that starts a week", () => {
    expect(startOfMondayWeek("2026-10-22")).toBe("2026-10-19");
    expect(startOfMondayWeek("2026-10-19")).toBe("2026-10-19");
    expect(startOfMondayWeek("2026-10-25")).toBe("2026-10-19");
    expect(startOfMondayWeek("2026-01-01")).toBe("2025-12-29");
  });

  it("aligns the heatmap to four Monday–Sunday weeks", () => {
    const keys = fourWeekCalendarKeys("2026-10-22");
    expect(keys).toHaveLength(28);
    expect(keys[0]).toBe("2026-09-28");
    expect(keys[27]).toBe("2026-10-25");
    expect(new Date(`${keys[27]}T12:00:00`).getDay()).toBe(0);
  });

  it("formats human-readable dates without UTC drift", () => {
    expect(formatShortDate("2026-10-22")).toBe("Oct 22");
  });

  it("describes relative journal dates", () => {
    expect(describeJournalDate("2026-10-22", "2026-10-22")).toContain("Today");
    expect(describeJournalDate("2026-10-21", "2026-10-22")).toContain(
      "Yesterday",
    );
    expect(describeJournalDate("2026-10-20", "2026-10-22")).not.toContain(
      "Yesterday",
    );
  });
});
