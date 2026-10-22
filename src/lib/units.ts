import type { Unit } from "../types";

/** Exact international avoirdupois pound. Weights live in kilograms. */
export const KG_PER_LB = 0.45359237;

/** A generous upper bound that still catches mistyped entries. */
export const WEIGHT_MAX_KG = 635;

export function toDisplayWeight(weightKg: number, unit: Unit): number {
  return unit === "lb" ? weightKg / KG_PER_LB : weightKg;
}

export function toKilograms(value: number, unit: Unit): number {
  return unit === "lb" ? value * KG_PER_LB : value;
}

export function unitLabel(unit: Unit): string {
  return unit;
}

/** One decimal place, matching the prototype's weight precision. */
export function formatWeightValue(
  weightKg: number | null | undefined,
  unit: Unit,
  digits = 1,
): string {
  if (weightKg == null || !Number.isFinite(weightKg)) return "—";
  return toDisplayWeight(weightKg, unit).toFixed(digits);
}

export function formatWeight(
  weightKg: number | null | undefined,
  unit: Unit,
  digits = 1,
): string {
  if (weightKg == null || !Number.isFinite(weightKg)) return "—";
  // Non-breaking space keeps the unit visually attached in tight table cells.
  return `${formatWeightValue(weightKg, unit, digits)}\u00A0${unit}`;
}

/** A delta with a true minus sign, e.g. "−4.0 lb". */
export function formatSignedDelta(
  deltaKg: number | null | undefined,
  unit: Unit,
  digits = 1,
): string {
  if (deltaKg == null || !Number.isFinite(deltaKg)) return "—";
  const display = toDisplayWeight(deltaKg, unit);
  const sign = display < 0 ? "−" : display > 0 ? "+" : "";
  return `${sign}${Math.abs(display).toFixed(digits)}\u00A0${unit}`;
}

/** Correct plural labels for local copy. */
export function describeWeightUnit(unit: Unit): string {
  return unit === "lb" ? "pounds" : "kilograms";
}

export function weightBounds(unit: Unit): { min: number; max: number } {
  return {
    min: unit === "lb" ? 1 : 0.5,
    max: unit === "lb" ? Math.floor(WEIGHT_MAX_KG / KG_PER_LB) : WEIGHT_MAX_KG,
  };
}

/**
 * Validate a display-unit weight entered by the user. Returns the canonical
 * kilogram value (unrounded) or a human-readable error.
 */
export function parseWeightInput(
  raw: string,
  unit: Unit,
): { ok: true; kg: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a weight to continue." };
  }
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value)) {
    return { ok: false, error: "Enter a number, for example 175.2." };
  }
  const bounds = weightBounds(unit);
  if (value < bounds.min || value > bounds.max) {
    return {
      ok: false,
      error: `Enter a weight between ${bounds.min} and ${bounds.max} ${unit}.`,
    };
  }
  const kg = toKilograms(value, unit);
  if (!Number.isFinite(kg) || kg <= 0 || kg > WEIGHT_MAX_KG + 0.001) {
    return { ok: false, error: "That weight is outside the supported range." };
  }
  return { ok: true, kg };
}
