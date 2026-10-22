import { describe, expect, it } from "vitest";
import {
  describeGoalDirection,
  goalProgress,
  isGoalConfigured,
} from "../src/lib/analytics/goal";

describe("goal progress", () => {
  it("computes a clamped percentage and remaining weight", () => {
    const progress = goalProgress(100, 50, 75);
    expect(progress).not.toBeNull();
    expect(progress?.percent).toBe(50);
    expect(progress?.remainingKg).toBe(25);
    expect(progress?.reachedGoal).toBe(false);
  });

  it("clamps below zero when the current weight exceeds the start", () => {
    const progress = goalProgress(100, 50, 110);
    expect(progress?.percent).toBe(0);
    expect(progress?.aboveStart).toBe(true);
  });

  it("clamps at 100 and reports reaching the goal", () => {
    const progress = goalProgress(100, 50, 45);
    expect(progress?.percent).toBe(100);
    expect(progress?.remainingKg).toBe(0);
    expect(progress?.reachedGoal).toBe(true);
  });

  it("returns null for missing or invalid inputs", () => {
    expect(goalProgress(null, 50, 75)).toBeNull();
    expect(goalProgress(100, null, 75)).toBeNull();
    expect(goalProgress(100, 50, null)).toBeNull();
    expect(goalProgress(100, 50, Number.NaN)).toBeNull();
    expect(goalProgress(100, 100, 90)).toBeNull();
    expect(goalProgress(100, 120, 90)).toBeNull();
  });

  it("validates that the goal is below the starting weight", () => {
    expect(isGoalConfigured(100, 50)).toBe(true);
    expect(isGoalConfigured(100, 100)).toBe(false);
    expect(isGoalConfigured(null, 50)).toBe(false);
    expect(describeGoalDirection(100, 50)).toContain("Only recorded weigh-ins");
    expect(describeGoalDirection(null, null)).toContain("Set a starting weight");
    expect(describeGoalDirection(50, 100)).toContain("below");
  });
});
