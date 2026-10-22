import { Link, useNavigate } from "react-router-dom";
import type { AppSnapshot } from "../../types";
import { buildConsistencyHeatmap } from "../../lib/analytics/meals";
import { formatLongDateWithYear } from "../../lib/dates";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function ConsistencyHeatmap({
  snapshot,
  today,
}: {
  snapshot: AppSnapshot;
  today: string;
}) {
  const navigate = useNavigate();
  const mealCount = snapshot.settings.mealsPerDay;
  const cells = buildConsistencyHeatmap(
    snapshot.meals,
    snapshot.offPlanDays,
    today,
    mealCount,
  );

  return (
    <section className="surface flex min-h-[252px] flex-col p-[22px]" aria-labelledby="consistency-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="consistency-title" className="card-title">
          Your consistency
        </h2>
        <Link to="/journal" className="btn-link">
          View journal →
        </Link>
      </div>

      <div className="mt-4">
        <div className="heat-week">
          {WEEKDAYS.map((letter, index) => (
            <div key={`${letter}-${index}`} className="week-letter" aria-hidden="true">
              {letter}
            </div>
          ))}
          {cells.map((cell) => {
            const mealCopy =
              cell.loggedCount === mealCount
                ? mealCount === 1
                  ? "meal logged"
                  : "all meals logged"
                : cell.loggedCount > 0
                  ? `${cell.loggedCount} of ${mealCount} meals logged`
                  : "no meals logged";
            const offPlanCopy =
              cell.offPlanStatus === "off"
                ? ", off-plan meal recorded"
                : cell.offPlanStatus === "on"
                  ? ", marked on plan"
                  : ", off-plan status not recorded";
            return (
              <button
                key={cell.date}
                type="button"
                className="heat-cell"
                data-level={cell.level}
                data-selected={cell.isToday}
                disabled={cell.isFuture}
                onClick={() => navigate(`/journal?date=${cell.date}`)}
                aria-label={`${formatLongDateWithYear(cell.date)}: ${mealCopy}${offPlanCopy}`}
                title={`${formatLongDateWithYear(cell.date)} · ${mealCopy}${
                  cell.offPlanStatus === "off" ? " · off-plan" : ""
                }`}
              >
                {cell.offPlanStatus === "off" && (
                  <span className="heat-mark" aria-hidden="true" />
                )}
                {cell.loggedCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-[3px] text-center text-[9px] font-extrabold leading-none"
                    style={{
                      color:
                        cell.level === "full" ? "#377b5c" : "#9a6b37",
                    }}
                  >
                    {cell.loggedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3.5 text-[10px] text-[#9ba9a0]">
        <span className="inline-flex items-center gap-1.5">
          <span className="legend-dot bg-[#bde4cc]" aria-hidden="true" />{" "}
          {mealCount === 1 ? "Meal logged" : "All meals"}
        </span>
        {mealCount > 1 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="legend-dot bg-[#f5dfba]" aria-hidden="true" /> Some
            meals
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[5px] w-[5px] rounded-full bg-[#bd725a]" aria-hidden="true" /> Off-plan
        </span>
      </div>
    </section>
  );
}
