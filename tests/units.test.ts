import { describe, expect, it } from "vitest";
import {
  formatSignedDelta,
  formatWeight,
  formatWeightValue,
  KG_PER_LB,
  parseWeightInput,
  toDisplayWeight,
  toKilograms,
  WEIGHT_MAX_KG,
} from "../src/lib/units";

describe("weight units", () => {
  it("uses the exact international pound", () => {
    expect(KG_PER_LB).toBe(0.45359237);
    expect(toKilograms(175.1, "lb")).toBe(175.1 * KG_PER_LB);
    expect(toDisplayWeight(175.1 * KG_PER_LB, "lb")).toBeCloseTo(175.1, 9);
  });

  it("round-trips kg and lb without meaningful loss", () => {
    const kg = 83.687792265;
    expect(toKilograms(toDisplayWeight(kg, "kg"), "kg")).toBe(kg);
    const viaPounds = toKilograms(toDisplayWeight(kg, "lb"), "lb");
    expect(viaPounds).toBeCloseTo(kg, 10);
  });

  it("formats weights and deltas with units", () => {
    expect(formatWeightValue(79.424, "lb")).toBe("175.1");
    expect(formatWeightValue(79.424, "kg")).toBe("79.4");
    expect(formatWeight(79.424, "lb")).toBe("175.1\u00A0lb");
    expect(formatSignedDelta(-1.814, "lb")).toBe("−4.0\u00A0lb");
    expect(formatSignedDelta(0, "kg")).toBe("0.0\u00A0kg");
    expect(formatWeight(null, "kg")).toBe("—");
  });

  it("validates and converts user input without rounding prematurely", () => {
    const pounds = parseWeightInput("175.1", "lb");
    expect(pounds.ok).toBe(true);
    if (pounds.ok) expect(pounds.kg).toBe(175.1 * KG_PER_LB);

    const kilograms = parseWeightInput("83.7", "kg");
    expect(kilograms.ok).toBe(true);
    if (kilograms.ok) expect(kilograms.kg).toBe(83.7);
  });

  it("rejects blank, non-numeric, zero and out-of-range input", () => {
    expect(parseWeightInput("", "lb").ok).toBe(false);
    expect(parseWeightInput("abc", "lb").ok).toBe(false);
    expect(parseWeightInput("0", "lb").ok).toBe(false);
    expect(parseWeightInput("-5", "kg").ok).toBe(false);
    expect(parseWeightInput("9999", "lb").ok).toBe(false);
    expect(parseWeightInput(String(WEIGHT_MAX_KG + 1), "kg").ok).toBe(false);
  });

  it("accepts a decimal comma", () => {
    const parsed = parseWeightInput("79,4", "kg");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.kg).toBeCloseTo(79.4, 6);
  });
});
