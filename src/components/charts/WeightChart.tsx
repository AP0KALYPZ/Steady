import { useId, type ReactNode } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Unit } from "../../types";
import type { ChartDatum } from "../../lib/analytics/weights";
import { chartSummary } from "../../lib/analytics/weights";
import { formatMediumDate, formatShortDate } from "../../lib/dates";
import {
  formatWeight,
  toDisplayWeight,
  toKilograms,
} from "../../lib/units";

interface WeightChartProps {
  data: ChartDatum[];
  unit: Unit;
  height: number;
  startDate: string;
  endDate: string;
  emptyState: ReactNode;
}

const NICE_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 5, 10, 15, 20, 25, 50, 100];

function yTicks(min: number, max: number): number[] {
  const span = Math.max(max - min, 0.1);
  let step = NICE_STEPS[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of NICE_STEPS) {
    const count = Math.floor(span / candidate) + 1;
    const score = Math.abs(count - 5) + (count < 3 ? 10 : 0);
    if (score < bestScore) {
      step = candidate;
      bestScore = score;
    }
  }
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + step * 0.001; value += step) {
    ticks.push(Number(value.toFixed(4)));
  }
  return ticks;
}

function tickLabel(value: number, unit: Unit): string {
  const display = Math.abs(toDisplayWeight(value, unit));
  return display >= 10 ? display.toFixed(0) : display.toFixed(1);
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ payload?: ChartDatum }>;
  unit: Unit;
}

function WeightTooltip({ active, payload, unit }: TooltipPayload) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="chart-tooltip">
      <strong className="block text-[11px] font-bold">
        {formatMediumDate(datum.date)}
      </strong>
      <span className="block">Weight: {formatWeight(datum.weightKg, unit)}</span>
      <span className="block text-white/75">
        7-day avg: {formatWeight(datum.averageKg, unit)}
      </span>
    </div>
  );
}

export function WeightChart({
  data,
  unit,
  height,
  startDate,
  endDate,
  emptyState,
}: WeightChartProps) {
  const gradientId = `steady-weight-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  if (data.length < 2) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ minHeight: height }}
      >
        {emptyState}
      </div>
    );
  }

  const displayValues = data.flatMap((datum) => {
    const values = [toDisplayWeight(datum.weightKg, unit)];
    if (datum.averageKg != null) {
      values.push(toDisplayWeight(datum.averageKg, unit));
    }
    return values;
  });
  const rawMin = Math.min(...displayValues);
  const rawMax = Math.max(...displayValues);
  const span = Math.max(2.5, rawMax - rawMin);
  const padding = span * 0.18;
  const yMin = rawMin - padding;
  const yMax = rawMax + padding;
  const ticks = yTicks(yMin, yMax);

  const startTs = new Date(`${startDate}T12:00:00`).getTime();
  const endTs = new Date(`${endDate}T12:00:00`).getTime();
  const tickCount = 5;
  const xTicks = Array.from({ length: tickCount }, (_, index) => {
    const fraction = index / (tickCount - 1);
    return Math.round(startTs + (endTs - startTs) * fraction);
  });
  const summary = chartSummary(data, unit, (kg) => toDisplayWeight(kg, unit));
  const domainMin = toKilograms(yMin, unit);
  const domainMax = toKilograms(yMax, unit);
  const axisTicks = ticks
    .filter((tick) => tick >= yMin && tick <= yMax)
    .map((tick) => toKilograms(tick, unit));

  return (
    <div className="h-full w-full" style={{ height }}>
      <div aria-hidden="true" className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#cfeee0" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#f7fbf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#EEF2EE"
              strokeWidth={1}
              horizontal
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={[startTs, endTs]}
              ticks={xTicks}
              tickFormatter={(value: number) =>
                formatShortDate(
                  `${new Date(value).getFullYear()}-${String(
                    new Date(value).getMonth() + 1,
                  ).padStart(2, "0")}-${String(new Date(value).getDate()).padStart(2, "0")}`,
                )
              }
              tick={{ fill: "#9DAC9F", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={18}
              height={30}
            />
            <YAxis
              type="number"
              domain={[domainMin, domainMax]}
              ticks={axisTicks}
              tickFormatter={(value: number) => tickLabel(value, unit)}
              tick={{ fill: "#A3AFA5", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={42}
            />
            <Tooltip
              content={<WeightTooltip unit={unit} />}
              cursor={{ stroke: "#789C88", strokeDasharray: "4 5", strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Area
              type="linear"
              dataKey="averageKg"
              stroke="#146B54"
              strokeWidth={3.2}
              fill={`url(#${gradientId})`}
              baseValue="dataMin"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#146B54",
                stroke: "#FFFFFF",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
              name="7-day average"
            />
            <Line
              type="linear"
              dataKey="weightKg"
              stroke="#C9D9CC"
              strokeWidth={1.5}
              dot={{
                r: 2.6,
                fill: "#AFC8B8",
                stroke: "#FFFFFF",
                strokeWidth: 1.2,
              }}
              activeDot={false}
              isAnimationActive={false}
              name="Daily weight"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{summary}</p>
    </div>
  );
}

