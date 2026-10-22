import { ArrowDown, ArrowUpRight, Scale, TrendingUp, Utensils } from "lucide-react";
import type { AppSnapshot } from "../../types";
import {
  changeOverWindow,
  compareWeeks,
  latestWeighIn,
  describeWeekComparisonGap,
} from "../../lib/analytics/weights";
import { summarizeMeals } from "../../lib/analytics/meals";
import { formatHistoryDate } from "../../lib/dates";
import { formatWeightValue, toDisplayWeight } from "../../lib/units";

function splitDelta(changeKg: number, unit: "lb" | "kg") {
  const value = toDisplayWeight(changeKg, unit);
  return {
    text: `${value < 0 ? "−" : value > 0 ? "+" : ""}${Math.abs(value).toFixed(1)}`,
    unit,
  };
}

export function MetricCards({
  snapshot,
  today,
}: {
  snapshot: AppSnapshot;
  today: string;
}) {
  const { unit } = snapshot.settings;
  const latest = latestWeighIn(snapshot.weighIns);
  const change30 = changeOverWindow(snapshot.weighIns, today, 30);
  const week = compareWeeks(snapshot.weighIns, today);
  const meal7 = summarizeMeals(
    snapshot.meals,
    today,
    7,
    snapshot.settings.mealsPerDay,
  );

  const changeCard = change30
    ? splitDelta(change30.changeKg, unit)
    : { text: "—", unit: "" };
  const changeCaption = change30
    ? change30.changeKg < 0
      ? "Down across recorded period"
      : change30.changeKg > 0
        ? "Up across recorded period"
        : "Stable across recorded period"
    : "Needs two weigh-ins in the last 30 days";

  const weekCard =
    week.changeKg != null ? splitDelta(week.changeKg, unit) : { text: "—", unit: "" };
  const weekCaption =
    week.changeKg != null
      ? "Last 7 days vs the previous 7 days"
      : describeWeekComparisonGap(week);

  const cards = [
    {
      label: "Current weight",
      value: latest ? formatWeightValue(latest.weightKg, unit) : "—",
      unit: latest ? unit : "",
      caption: latest
        ? `Last logged ${formatHistoryDate(latest.date).replace(/, \d{4}$/, "")}`
        : "Add your first weigh-in",
      Icon: Scale,
      tone: "mint" as const,
    },
    {
      label: "Weight change · 30D",
      value: changeCard.text,
      unit: changeCard.unit,
      caption: changeCaption,
      Icon: change30 && change30.changeKg > 0 ? ArrowUpRight : ArrowDown,
      tone: "mint" as const,
    },
    {
      label: "Weekly trend",
      value: weekCard.text,
      unit: weekCard.unit,
      caption: weekCaption,
      Icon: TrendingUp,
      tone: "mint" as const,
    },
    {
      label: "Meals tracked · 7D",
      value: meal7.percent != null ? `${Math.round(meal7.percent)}%` : "—",
      unit: "",
      caption:
        meal7.possibleServings > 0
          ? `${meal7.loggedServings} of ${meal7.possibleServings} servings on ${meal7.daysWithRecords} logged day${meal7.daysWithRecords === 1 ? "" : "s"}`
          : "No meal days recorded in the last 7 days",
      Icon: Utensils,
      tone: "gold" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-[17px] sm:grid-cols-2 dash:grid-cols-4">
      {cards.map(({ label, value, unit: cardUnit, caption, Icon, tone }) => (
        <section
          key={label}
          className="surface flex min-h-[150px] flex-col justify-between p-[22px]"
          aria-label={label}
        >
          <div className="flex items-center justify-between gap-2.5">
            <span className="metric-label">{label}</span>
            <span
              className={
                tone === "gold"
                  ? "grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-[#fff4e9] text-[#bd8151]"
                  : "grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-[#eff7f1] text-forest"
              }
              aria-hidden="true"
            >
              <Icon className="h-[17px] w-[17px]" />
            </span>
          </div>
          <div>
            <div className="metric-value">
              {value}{" "}
              {cardUnit && (
                <small className="text-[14px] font-semibold tracking-[-0.2px] text-[#88958e]">
                  {cardUnit}
                </small>
              )}
            </div>
            <div className="mt-2.5 text-[11px] leading-snug text-[#96a29a]">
              {caption}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
