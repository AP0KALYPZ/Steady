export interface GoalProgress {
  /** Clamped to 0–100. */
  percent: number;
  remainingKg: number;
  reachedGoal: boolean;
  /** True when the latest weight is above the configured starting point. */
  aboveStart: boolean;
}

export function isGoalConfigured(
  startWeightKg: number | null,
  goalWeightKg: number | null,
): boolean {
  return (
    startWeightKg != null &&
    goalWeightKg != null &&
    Number.isFinite(startWeightKg) &&
    Number.isFinite(goalWeightKg) &&
    startWeightKg > goalWeightKg
  );
}

/**
 * `(start - current) / (start - goal)`, clamped to 0–100%.
 * Returns null unless all three values are valid and the target is below the
 * starting weight (this is a weight-loss oriented view).
 */
export function goalProgress(
  startWeightKg: number | null,
  goalWeightKg: number | null,
  currentWeightKg: number | null,
): GoalProgress | null {
  if (
    !isGoalConfigured(startWeightKg, goalWeightKg) ||
    currentWeightKg == null ||
    !Number.isFinite(currentWeightKg) ||
    currentWeightKg <= 0
  ) {
    return null;
  }
  const start = startWeightKg as number;
  const goal = goalWeightKg as number;
  const rawPercent = ((start - currentWeightKg) / (start - goal)) * 100;
  const percent = Math.min(100, Math.max(0, rawPercent));
  return {
    percent,
    remainingKg: Math.max(0, currentWeightKg - goal),
    reachedGoal: currentWeightKg <= goal,
    aboveStart: currentWeightKg > start,
  };
}

export function describeGoalDirection(
  startWeightKg: number | null,
  goalWeightKg: number | null,
): string {
  if (startWeightKg == null || goalWeightKg == null) {
    return "Set a starting weight and a goal to see progress.";
  }
  if (goalWeightKg >= startWeightKg) {
    return "Your goal needs to be below your starting weight.";
  }
  return "Only recorded weigh-ins move this bar.";
}
