import { cn } from "../../lib/cn";

interface ProgressBarProps {
  percent: number;
  label: string;
  gradient?: boolean;
  className?: string;
}

export function ProgressBar({
  percent,
  label,
  gradient = true,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={cn(
        "h-[11px] overflow-hidden rounded-[10px] bg-[#e7f1e8]",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
    >
      <div
        className={cn(
          "h-full rounded-[10px] bg-forest transition-[width] duration-500",
          gradient && "bg-gradient-to-r from-[#9acfb0] to-[#166c51]",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
