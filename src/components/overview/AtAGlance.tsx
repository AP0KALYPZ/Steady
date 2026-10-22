import { Lightbulb, NotebookPen, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { AppSnapshot } from "../../types";
import { compareWeeks, describeWeekComparisonGap } from "../../lib/analytics/weights";
import { summarizeOffPlan } from "../../lib/analytics/meals";
import { formatSignedDelta } from "../../lib/units";

export function AtAGlance({
  snapshot,
  today,
}: {
  snapshot: AppSnapshot;
  today: string;
}) {
  const week = compareWeeks(snapshot.weighIns, today);
  const offPlan = summarizeOffPlan(snapshot.offPlanDays, today, 30);
  const trendTitle =
    week.changeKg == null
      ? "Trend still forming"
      : week.changeKg < 0
        ? "Your weekly average is trending down"
        : week.changeKg > 0
          ? "Your weekly average is trending up"
          : "Your weekly average is stable";
  const trendBody =
    week.changeKg == null
      ? describeWeekComparisonGap(week)
      : `${formatSignedDelta(week.changeKg, snapshot.settings.unit)} compared with the previous 7 days`;

  return (
    <section className="surface flex min-h-[252px] flex-col p-[22px]" aria-labelledby="glance-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="glance-title" className="card-title">
          At a glance
        </h2>
        <Lightbulb className="h-[18px] w-[18px] text-[#8fa79a]" aria-hidden="true" />
      </div>

      <div className="mt-[18px] flex items-start gap-3">
        <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-[#e8f5ec] text-forest" aria-hidden="true">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div>
          <strong className="block text-[12px] font-bold leading-snug text-ink">
            {trendTitle}
          </strong>
          <span className="mt-1 block text-[10px] leading-relaxed text-[#8e9d93]">
            {trendBody}
          </span>
        </div>
      </div>

      <div className="mt-[18px] flex items-start gap-3">
        <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-sand text-amber" aria-hidden="true">
          <NotebookPen className="h-4 w-4" />
        </div>
        <div>
          <strong className="block text-[12px] font-bold leading-snug text-ink">
            {offPlan.recordedDays > 0
              ? `${offPlan.offPlanDays} off-plan ${offPlan.offPlanDays === 1 ? "day" : "days"} recorded`
              : "No off-plan status recorded"}
          </strong>
          <span className="mt-1 block text-[10px] leading-relaxed text-[#8e9d93]">
            {offPlan.recordedDays > 0
              ? `Across ${offPlan.recordedDays} of the last 30 days with an explicit status.`
              : "Check in to spot patterns over time. Unrecorded days are never assumed to be on plan."}
          </span>
        </div>
      </div>

      <Link
        to="/insights"
        className="mt-auto inline-flex items-center gap-1 pt-4 text-[11px] font-bold text-forest hover:underline"
      >
        Explore insights <span aria-hidden="true">›</span>
      </Link>
    </section>
  );
}
