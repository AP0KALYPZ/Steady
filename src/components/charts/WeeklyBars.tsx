import type { WeeklyBlock } from "../../lib/analytics/meals";

export function WeeklyBars({ blocks }: { blocks: WeeklyBlock[] }) {
  return (
    <div className="mt-7 flex flex-col gap-[18px]">
      {blocks.map((block) => {
        const percent = block.percent ?? 0;
        return (
          <div
            key={block.label}
            className="grid grid-cols-[82px_minmax(0,1fr)_66px] items-center gap-3.5"
          >
            <span className="text-[11px] leading-tight text-[#809185]">
              {block.label}
            </span>
            <div
              className="h-[14px] overflow-hidden rounded-lg bg-[#edf3ed]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
              aria-label={`${block.label}: ${block.loggedServings} of ${block.possibleServings} recorded servings`}
            >
              <div
                className="h-full rounded-lg bg-[#91caac]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <strong className="text-right text-[12px] font-bold text-ink">
              {block.possibleServings > 0
                ? `${block.loggedServings}/${block.possibleServings}`
                : "No data"}
            </strong>
          </div>
        );
      })}
      <p className="text-[10px] leading-relaxed text-[#9ba9a0]">
        Percentages are served on days with at least one meal record. Unlogged
        days are left out rather than counted as missed servings.
      </p>
    </div>
  );
}
