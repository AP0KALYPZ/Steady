import { useMemo, useState } from "react";
import {
  Download,
  Pencil,
  Plus,
  Scale,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useSnapshot, useAppData } from "../hooks/useAppData";
import { useToday } from "../hooks/useToday";
import { useDialogs } from "../components/dialogs/DialogProvider";
import { useToast } from "../components/ui/Toast";
import { useExports } from "../features/useExports";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Segmented } from "../components/ui/Segmented";
import { WeightChart } from "../components/charts/WeightChart";
import {
  buildChartData,
  latestWeighIn,
  visibleChartStart,
} from "../lib/analytics/weights";
import { formatHistoryDate, formatMediumDate } from "../lib/dates";
import {
  formatSignedDelta,
  formatWeight,
  formatWeightValue,
} from "../lib/units";

type Range = 30 | 60 | 90 | "all";

export function WeightProgressPage() {
  const snapshot = useSnapshot();
  const today = useToday();
  const { actions } = useAppData();
  const { showToast } = useToast();
  const { openWeight, confirm } = useDialogs();
  const { exportCsv } = useExports();
  const [range, setRange] = useState<Range>(30);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [query, setQuery] = useState("");

  const { unit } = snapshot.settings;
  const latest = latestWeighIn(snapshot.weighIns);
  const chartData = buildChartData(snapshot.weighIns, today, range);
  const startDate = visibleChartStart(snapshot.weighIns, today, range);

  const ordered = useMemo(
    () =>
      [...snapshot.weighIns].sort((a, b) =>
        sort === "newest"
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date),
      ),
    [snapshot.weighIns, sort],
  );

  const previousByDate = useMemo(() => {
    const ascending = [...snapshot.weighIns].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const map = new Map<string, number>();
    for (let index = 1; index < ascending.length; index += 1) {
      map.set(
        ascending[index].date,
        ascending[index].weightKg - ascending[index - 1].weightKg,
      );
    }
    return map;
  }, [snapshot.weighIns]);

  const filtered = ordered.filter((entry) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return (
      entry.date.includes(needle) ||
      formatHistoryDate(entry.date).toLowerCase().includes(needle) ||
      formatMediumDate(entry.date).toLowerCase().includes(needle) ||
      formatWeightValue(entry.weightKg, unit).includes(needle)
    );
  });

  const startWeight = snapshot.settings.startWeightKg;
  const totalChange =
    startWeight != null && latest ? latest.weightKg - startWeight : null;

  const handleDelete = async (date: string) => {
    const confirmed = await confirm({
      title: "Delete this weigh-in?",
      description: `The measurement from ${formatMediumDate(date)} will be removed. Your meals, notes and off-plan status for that day stay intact.`,
      confirmLabel: "Delete weigh-in",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await actions.deleteWeighIn(date);
      showToast(`Weigh-in from ${formatMediumDate(date)} deleted`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "The weigh-in could not be deleted.",
        "error",
      );
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Beyond the number"
        title="Weight progress"
        subtitle="The bigger picture, with daily detail whenever you need it."
        actions={
          <Button variant="primary" onClick={() => openWeight(today)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New weigh-in
          </Button>
        }
      />

      <section
        className="surface p-[22px] sm:px-[26px] sm:pb-4 sm:pt-[23px]"
        aria-labelledby="long-term-trend-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="long-term-trend-title" className="card-title">
              Your long-term trend
            </h2>
            <p className="card-sub">
              Only recorded measurements are shown; missing days remain unfilled
            </p>
          </div>
          <Segmented
            label="Progress chart range"
            value={range}
            onChange={(value) => setRange(value as Range)}
            options={[
              { value: 30, label: "30D" },
              { value: 60, label: "60D" },
              { value: 90, label: "90D" },
              { value: "all", label: "ALL" },
            ]}
          />
        </div>

        <div className="mt-7">
          <WeightChart
            data={chartData}
            unit={unit}
            height={310}
            startDate={startDate}
            endDate={today}
            emptyState={
              <div className="empty-state">
                <TrendingUp className="h-6 w-6 text-[#9db4a6]" aria-hidden="true" />
                <strong>
                  {snapshot.weighIns.length === 0
                    ? "No weigh-ins yet"
                    : "Not enough weigh-ins in this range"}
                </strong>
                <span>
                  {snapshot.weighIns.length === 0
                    ? "Add your first measurement to start a meaningful timeline."
                    : "Choose a wider range, or add another weigh-in to see the trend."}
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
              <span className="legend-dot trend" aria-hidden="true" /> 7-day rolling average
            </span>
          </div>
          <span className="text-[10px] text-[#8e9e94]">
            Move across the graph for exact values
          </span>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <div className="stat-mini">
          <span>Starting weight</span>
          <strong>
            {startWeight != null ? formatWeight(startWeight, unit) : "—"}
          </strong>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[#9aa89e]">
            {startWeight != null
              ? "Configured baseline"
              : "Set this in Settings"}
          </p>
        </div>
        <div className="stat-mini">
          <span>Latest weight</span>
          <strong>{latest ? formatWeight(latest.weightKg, unit) : "—"}</strong>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[#9aa89e]">
            {latest ? `Recorded ${formatMediumDate(latest.date)}` : "No weigh-ins yet"}
          </p>
        </div>
        <div className="stat-mini">
          <span>Total change</span>
          <strong>{totalChange != null ? formatSignedDelta(totalChange, unit) : "—"}</strong>
          <p className="mt-1.5 text-[10px] leading-relaxed text-[#9aa89e]">
            {totalChange != null
              ? "From your configured starting weight"
              : "Needs a start weight and a weigh-in"}
          </p>
        </div>
      </div>

      <section className="surface mt-5 p-5 sm:p-6" aria-labelledby="weighin-history-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="weighin-history-title" className="card-title">
              Weigh-in history
            </h2>
            <p className="card-sub">
              Edit or delete any recorded weight. Missing days stay missing.
            </p>
          </div>
          <Button size="small" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9baa9f]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input py-2 pl-9 text-[12px]"
              placeholder="Search dates or weights"
              aria-label="Search weigh-in history"
            />
          </div>
          <Segmented
            label="Sort weigh-in history"
            value={sort}
            onChange={(value) => setSort(value as "newest" | "oldest")}
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
            ]}
          />
          <span className="ml-auto text-[10px] text-[#98a79d]">
            {snapshot.weighIns.length} weigh-in
            {snapshot.weighIns.length === 1 ? "" : "s"} recorded
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          {filtered.length > 0 ? (
            <table className="data-table">
              <caption className="sr-only">
                Recorded weigh-ins, with weight and change from the previous
                recorded measurement.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Change vs previous</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const delta = previousByDate.get(entry.date);
                  return (
                    <tr key={entry.date}>
                      <td>
                        <strong>{formatHistoryDate(entry.date)}</strong>
                      </td>
                      <td>{formatWeight(entry.weightKg, unit)}</td>
                      <td>{delta != null ? formatSignedDelta(delta, unit) : "—"}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            onClick={() => openWeight(entry.date)}
                            aria-label={`Edit weigh-in from ${formatMediumDate(entry.date)}`}
                          >
                            <Pencil className="mr-1 inline h-3 w-3" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete"
                            onClick={() => void handleDelete(entry.date)}
                            aria-label={`Delete weigh-in from ${formatMediumDate(entry.date)}`}
                          >
                            <Trash2 className="mr-1 inline h-3 w-3" aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : snapshot.weighIns.length === 0 ? (
            <div className="empty-state">
              <Scale className="h-6 w-6 text-[#9db4a6]" aria-hidden="true" />
              <strong>No weigh-ins recorded yet</strong>
              <span>Add your first measurement to start a meaningful timeline.</span>
              <Button size="small" variant="primary" onClick={() => openWeight(today)}>
                Log weight
              </Button>
            </div>
          ) : (
            <div className="empty-state">
              <Search className="h-6 w-6 text-[#9db4a6]" aria-hidden="true" />
              <strong>No weigh-ins match “{query}”</strong>
              <span>Try a date such as “Oct 22” or clear the search.</span>
              <Button size="small" onClick={() => setQuery("")}>
                Clear search
              </Button>
            </div>
          )}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-[#9aa79f]">
          Change compares each entry with the previous recorded weigh-in — not
          the previous calendar day. No measurements are estimated or filled in.
        </p>
      </section>
    </>
  );
}
