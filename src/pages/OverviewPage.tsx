import { useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { useSnapshot } from "../hooks/useAppData";
import { useToday } from "../hooks/useToday";
import { PageHeader } from "../components/layout/PageHeader";
import { MetricCards } from "../components/overview/MetricCards";
import { TodayCheckIn } from "../components/overview/TodayCheckIn";
import { GoalCard } from "../components/overview/GoalCard";
import { ConsistencyHeatmap } from "../components/overview/ConsistencyHeatmap";
import { AtAGlance } from "../components/overview/AtAGlance";
import { WeightChart } from "../components/charts/WeightChart";
import { Segmented } from "../components/ui/Segmented";
import { Button } from "../components/ui/Button";
import { useDialogs } from "../components/dialogs/DialogProvider";
import {
  buildChartData,
  latestWeighIn,
  rollingAverageAt,
  visibleChartStart,
} from "../lib/analytics/weights";
import { formatWeightValue } from "../lib/units";

type Range = 30 | 60 | 90;

export function OverviewPage() {
  const snapshot = useSnapshot();
  const today = useToday();
  const { openWeight } = useDialogs();
  const [range, setRange] = useState<Range>(30);

  const latest = latestWeighIn(snapshot.weighIns);
  const chartData = buildChartData(snapshot.weighIns, today, range);
  const startDate = visibleChartStart(snapshot.weighIns, today, range);
  const currentAverage = latest
    ? rollingAverageAt(snapshot.weighIns, latest.date)
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Your daily overview"
        title="Small steps. Real progress."
        subtitle="Track your routine, understand your trends, and stay consistent."
        help={
          <div className="hidden max-w-[340px] items-center gap-2 rounded-[11px] bg-[#ecf5ee] px-[15px] py-3 text-[11px] font-semibold text-[#739083] wide:flex">
            <Sparkles className="h-4 w-4 shrink-0 text-[#7fa793]" aria-hidden="true" />
            Focus on the trend — not a single weigh-in.
          </div>
        }
      />

      <div className="grid gap-[19px]">
        <MetricCards snapshot={snapshot} today={today} />

        <div className="grid grid-cols-1 gap-[19px] dash:grid-cols-[minmax(0,1.82fr)_minmax(320px,1fr)]">
          <section className="surface min-h-[390px] p-[22px] sm:px-[26px] sm:pb-4 sm:pt-[23px]" aria-labelledby="weight-journey-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="weight-journey-title" className="card-title">
                  Weight journey
                </h2>
                <p className="card-sub">
                  Daily weigh-ins and your smoothed 7-day average
                </p>
              </div>
              <Segmented
                label="Overview chart range"
                value={range}
                onChange={(value) => setRange(value as Range)}
                options={[
                  { value: 30, label: "30D" },
                  { value: 60, label: "60D" },
                  { value: 90, label: "90D" },
                ]}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-baseline gap-2.5">
              <strong className="text-[26px] font-extrabold leading-none tracking-[-1px] text-ink">
                {currentAverage != null
                  ? formatWeightValue(currentAverage, snapshot.settings.unit)
                  : "—"}
                {currentAverage != null && (
                  <span className="ml-1 text-[13px] font-semibold tracking-normal text-[#88958e]">
                    {snapshot.settings.unit}
                  </span>
                )}
              </strong>
              <span className="text-[11px] text-muted">
                {latest ? "Most recent 7-day average" : "Log your first weight"}
              </span>
            </div>

            <div className="mt-3">
              <WeightChart
                data={chartData}
                unit={snapshot.settings.unit}
                height={225}
                startDate={startDate}
                endDate={today}
                emptyState={
                  <div className="empty-state">
                    <TrendingUp className="h-6 w-6 text-[#9db4a6]" aria-hidden="true" />
                    <strong>Your story starts with a weigh-in</strong>
                    <span>
                      {snapshot.weighIns.length === 1
                        ? "One weigh-in recorded. Add another to see your trend."
                        : "Log at least two weights to see an accurate trend chart."}
                    </span>
                    <Button size="small" variant="primary" onClick={() => openWeight(today)}>
                      Log weight
                    </Button>
                  </div>
                }
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#f1f3f0] pt-3.5">
              <div className="flex flex-wrap gap-[18px]">
                <span className="inline-flex items-center gap-2 text-[11px] text-[#7b8b81]">
                  <span className="legend-dot" aria-hidden="true" /> Daily weight
                </span>
                <span className="inline-flex items-center gap-2 text-[11px] text-[#7b8b81]">
                  <span className="legend-dot trend" aria-hidden="true" /> 7-day average
                </span>
              </div>
              <span className="text-[10px] text-[#99a69e]">Changes are normal</span>
            </div>
          </section>

          <TodayCheckIn snapshot={snapshot} today={today} />
        </div>

        <div className="grid grid-cols-1 gap-[19px] md:grid-cols-2 dash:grid-cols-3">
          <GoalCard snapshot={snapshot} />
          <ConsistencyHeatmap snapshot={snapshot} today={today} />
          <div className="md:col-span-2 dash:col-span-1">
            <AtAGlance snapshot={snapshot} today={today} />
          </div>
        </div>
      </div>
    </>
  );
}
