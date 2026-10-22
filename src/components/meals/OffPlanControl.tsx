import { useState } from "react";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../ui/Toast";
import type { OffPlanStatus } from "../../types";
import { cn } from "../../lib/cn";

interface OffPlanControlProps {
  date: string;
  status: OffPlanStatus | null;
  variant?: "compact" | "full";
}

export function OffPlanControl({
  date,
  status,
  variant = "compact",
}: OffPlanControlProps) {
  const { actions } = useAppData();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const choose = async (next: OffPlanStatus) => {
    if (busy) return;
    const target = status === next ? null : next;
    setBusy(true);
    try {
      await actions.setOffPlan(date, target);
      showToast(
        target === "off"
          ? "Off-plan meal recorded — thanks for checking in."
          : target === "on"
            ? "Stayed-on-plan day recorded."
            : "Off-plan status cleared.",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "The off-plan status could not be saved.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const caption =
    status === "on"
      ? "This day is marked on-plan"
      : status === "off"
        ? "This day includes an off-plan meal"
        : "Not recorded yet";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        variant === "full"
          ? "mt-4"
          : "mt-4 border-t border-[#eff2ee] pt-3.5",
      )}
    >
      <div>
        <strong className="block text-[12px] font-bold text-ink">
          Off-plan meal?
        </strong>
        {variant === "compact" ? (
          <span className="mt-1 block text-[10px] text-[#92a097]">
            {status === "on"
              ? "On-plan day · no judgment, just data."
              : status === "off"
                ? "Off-plan recorded · no judgment, just data."
                : "Not recorded · no judgment, just data."}
          </span>
        ) : (
          <span className="mt-1 block text-[11px] leading-relaxed text-[#8e9d93]">
            Separate from your routine meals. {caption}.
          </span>
        )}
      </div>
      <div
        className="inline-flex shrink-0 items-center gap-[3px] rounded-[9px] bg-[#f3f6f3] p-[3px]"
        role="group"
        aria-label="Off-plan meal status"
      >
        <button
          type="button"
          aria-pressed={status === "on"}
          aria-label="Mark this day as stayed on plan"
          disabled={busy}
          onClick={() => void choose("on")}
          title={
            status === "on"
              ? "Tap again to clear this status"
              : "Record that this day stayed on plan"
          }
          className={cn(
            "rounded-[7px] font-bold transition disabled:opacity-60",
            variant === "full"
              ? "px-4 py-2.5 text-[12px]"
              : "px-[9px] py-[7px] text-[10px]",
            status === "on"
              ? "bg-[#ddf1e3] text-[#0d7152]"
              : "text-[#8a9890] hover:text-ink",
          )}
        >
          No
        </button>
        <button
          type="button"
          aria-pressed={status === "off"}
          aria-label="Mark this day as having an off-plan meal"
          disabled={busy}
          onClick={() => void choose("off")}
          title={
            status === "off"
              ? "Tap again to clear this status"
              : "Record an off-plan meal"
          }
          className={cn(
            "rounded-[7px] font-bold transition disabled:opacity-60",
            variant === "full"
              ? "px-4 py-2.5 text-[12px]"
              : "px-[9px] py-[7px] text-[10px]",
            status === "off"
              ? "bg-[#fae9de] text-[#a85b41]"
              : "text-[#8a9890] hover:text-ink",
          )}
        >
          Yes
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        Off-plan status: {caption}.
      </p>
    </div>
  );
}
