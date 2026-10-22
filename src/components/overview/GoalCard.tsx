import { Sparkles, Target } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppSnapshot } from "../../types";
import { goalProgress } from "../../lib/analytics/goal";
import { latestWeighIn } from "../../lib/analytics/weights";
import { formatWeight, formatWeightValue } from "../../lib/units";
import { ProgressBar } from "../ui/ProgressBar";

export function GoalCard({ snapshot }: { snapshot: AppSnapshot }) {
  const { settings } = snapshot;
  const latest = latestWeighIn(snapshot.weighIns);
  const progress = goalProgress(
    settings.startWeightKg,
    settings.goalWeightKg,
    latest?.weightKg ?? null,
  );
  const goalConfigured =
    settings.startWeightKg != null && settings.goalWeightKg != null;

  return (
    <section className="surface flex min-h-[252px] flex-col p-[22px]" aria-labelledby="destination-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="destination-title" className="card-title">
          Your destination
        </h2>
        <Target className="h-[18px] w-[18px] text-[#8fa79a]" aria-hidden="true" />
      </div>

      <div className="mt-5 flex items-end gap-2">
        <strong className="text-[34px] font-extrabold leading-none tracking-[-1.6px] text-ink">
          {latest ? formatWeightValue(latest.weightKg, settings.unit) : "—"}
        </strong>
        {latest && (
          <span className="mb-1 text-[13px] font-semibold tracking-normal text-[#88958e]">
            {settings.unit}
          </span>
        )}
        <span className="mb-1 text-[11px] text-[#9ca99f]">
          {latest ? "Latest weight" : "No weigh-in yet"}
        </span>
      </div>

      <div className="mb-2.5 mt-[18px] flex justify-between gap-2 text-[11px] text-[#84958a]">
        <span>
          Start{" "}
          <b className="font-bold text-ink">
            {goalConfigured
              ? formatWeight(settings.startWeightKg, settings.unit)
              : "—"}
          </b>
        </span>
        <span>
          Goal{" "}
          <b className="font-bold text-ink">
            {goalConfigured
              ? formatWeight(settings.goalWeightKg, settings.unit)
              : "—"}
          </b>
        </span>
      </div>
      <ProgressBar
        percent={progress?.percent ?? 0}
        label="Progress from your starting weight toward your goal"
      />

      <div className="mt-auto flex items-start gap-2 border-t border-[#f0f2ee] pt-[15px] text-[11px] leading-relaxed text-[#758a7e]">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7ea38f]" aria-hidden="true" />
        <span>
          {!goalConfigured ? (
            <>
              Set a starting weight and goal in{" "}
              <Link to="/settings" className="font-bold text-forest hover:underline">
                Settings
              </Link>
              .
            </>
          ) : !latest ? (
            "Log a weight to see your progress."
          ) : progress?.reachedGoal ? (
            "Goal reached — keep tracking what supports you."
          ) : progress && progress.aboveStart ? (
            "Your latest weight is above your starting point. Trends matter more than any single week."
          ) : (
            <>
              {formatWeight(progress?.remainingKg, settings.unit)} to your goal ·{" "}
              {Math.round(progress?.percent ?? 0)}% of the way
            </>
          )}
        </span>
      </div>
    </section>
  );
}
