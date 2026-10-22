import { Scale, Target, Utensils } from "lucide-react";
import { useSnapshot } from "../hooks/useAppData";
import { useToday } from "../hooks/useToday";
import { PageHeader } from "../components/layout/PageHeader";
import { WeeklyBars } from "../components/charts/WeeklyBars";
import {
  compareWeeks,
  countWeighInsInWindow,
  describeWeekComparisonGap,
  latestWeighIn,
} from "../lib/analytics/weights";
import {
  buildWeeklyBlocks,
  summarizeMeals,
  summarizeOffPlan,
} from "../lib/analytics/meals";
import { goalProgress } from "../lib/analytics/goal";
import { formatSignedDelta } from "../lib/units";

export function InsightsPage() {
  const snapshot = useSnapshot();
  const today = useToday();
  const { unit } = snapshot.settings;

  const meal7 = summarizeMeals(snapshot.meals, today, 7);
  const meal30 = summarizeMeals(snapshot.meals, today, 30);
  const offPlan = summarizeOffPlan(snapshot.offPlanDays, today, 30);
  const weighInCount = countWeighInsInWindow(snapshot.weighIns, today, 30);
  const week = compareWeeks(snapshot.weighIns, today);
  const latest = latestWeighIn(snapshot.weighIns);
  const goal = goalProgress(
    snapshot.settings.startWeightKg,
    snapshot.settings.goalWeightKg,
    latest?.weightKg ?? null,
  );
  const blocks = buildWeeklyBlocks(snapshot.meals, today);

  const tiles = [
    {
      label: "7-day meal logging",
      value: meal7.percent != null ? `${Math.round(meal7.percent)}%` : "—",
      description:
        meal7.possibleServings > 0
          ? `${meal7.loggedServings}/${meal7.possibleServings} servings on days with meal records`
          : "No meal days recorded in the last 7 days",
    },
    {
      label: "30-day meal logging",
      value: meal30.percent != null ? `${Math.round(meal30.percent)}%` : "—",
      description:
        meal30.possibleServings > 0
          ? `${meal30.loggedServings}/${meal30.possibleServings} servings on days with meal records`
          : "No meal days recorded in the last 30 days",
    },
    {
      label: "Off-plan days · 30D",
      value: offPlan.recordedDays > 0 ? String(offPlan.offPlanDays) : "—",
      description:
        offPlan.recordedDays > 0
          ? `${offPlan.recordedDays} of the last 30 days have an explicit on/off-plan status`
          : "No explicit off-plan status recorded in the last 30 days",
    },
    {
      label: "Weigh-ins · 30D",
      value: String(weighInCount),
      description: "Entries during the last 30 calendar days",
    },
    {
      label: "7-day weight trend",
      value:
        week.changeKg != null
          ? formatSignedDelta(week.changeKg, unit)
          : "—",
      description:
        week.changeKg != null
          ? "Change in average versus the previous seven days"
          : describeWeekComparisonGap(week),
    },
    {
      label: "Goal completion",
      value: goal != null ? `${Math.round(goal.percent)}%` : "—",
      description:
        goal != null
          ? "Based on your starting, latest, and goal weights"
          : "Set a start weight, goal, and log a weigh-in",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Stats that matter"
        title="Patterns & insights"
        subtitle="Measure consistency without turning every day into a pass-or-fail score."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 dash:grid-cols-3">
        {tiles.map((tile) => (
          <section
            key={tile.label}
            className="surface rounded-[13px] p-5"
            aria-label={tile.label}
          >
            <span className="text-[11px] text-[#84948a]">{tile.label}</span>
            <strong className="mt-2.5 block text-[30px] font-extrabold leading-none tracking-[-1px] text-ink">
              {tile.value}
            </strong>
            <p className="mt-2 text-[11px] leading-relaxed text-[#8b9e91]">
              {tile.description}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-[19px] grid grid-cols-1 gap-[19px] dash:grid-cols-[1.25fr_minmax(0,1fr)]">
        <section className="surface p-5 sm:p-6" aria-labelledby="weekly-meals-title">
          <h2 id="weekly-meals-title" className="card-title">
            Meal logs by week
          </h2>
          <p className="card-sub">
            Logged servings out of two per day on days with a meal record
          </p>
          <WeeklyBars blocks={blocks} />
        </section>

        <section className="surface p-5 sm:p-6" aria-labelledby="reading-numbers-title">
          <h2 id="reading-numbers-title" className="card-title">
            How to read these numbers
          </h2>

          <div className="mt-[18px] flex items-start gap-3">
            <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-[#e8f5ec] text-forest" aria-hidden="true">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <strong className="block text-[12px] font-bold leading-snug text-ink">
                Watch the seven-day weight average
              </strong>
              <span className="mt-1 block text-[10px] leading-relaxed text-[#8e9d93]">
                It reduces the noise from water, sodium and everyday variation.
                Normal daily fluctuations are not failures.
              </span>
            </div>
          </div>

          <div className="mt-[18px] flex items-start gap-3">
            <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-sand text-amber" aria-hidden="true">
              <Utensils className="h-4 w-4" />
            </div>
            <div>
              <strong className="block text-[12px] font-bold leading-snug text-ink">
                Unlogged is not the same as missed
              </strong>
              <span className="mt-1 block text-[10px] leading-relaxed text-[#8e9d93]">
                Meal percentages use only days where you entered a meal record.
                They measure logging, not whether you met a nutritional goal.
              </span>
            </div>
          </div>

          <div className="mt-[18px] flex items-start gap-3">
            <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-[#e8f5ec] text-forest" aria-hidden="true">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <strong className="block text-[12px] font-bold leading-snug text-ink">
                Off-plan is a separate status
              </strong>
              <span className="mt-1 block text-[10px] leading-relaxed text-[#8e9d93]">
                A day with no status is never automatically treated as on-plan.
                Off-plan meals are recorded without judgment.
              </span>
            </div>
          </div>

          <div className="info-banner">
            <strong>No projected goal date.</strong> Short-term scale changes are
            too variable for a trustworthy countdown, so STEADY intentionally
            leaves one out.
          </div>
        </section>
      </div>
    </>
  );
}
