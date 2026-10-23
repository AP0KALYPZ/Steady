import { useState } from "react";
import { Moon } from "lucide-react";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../ui/Toast";
import { cn } from "../../lib/cn";

interface FastingControlProps {
  date: string;
  fasting: boolean;
  variant?: "compact" | "full";
}

export function FastingControl({
  date,
  fasting,
  variant = "compact",
}: FastingControlProps) {
  const { actions } = useAppData();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await actions.setFastingDay(date, !fasting);
      showToast(
        fasting
          ? "Fasting day cleared — meals are available again."
          : "Fasting day recorded. No meals expected today.",
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "The fasting day could not be saved.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        variant === "compact"
          ? "mt-4 border-t border-[#eff2ee] pt-3.5"
          : "mt-4 rounded-xl border border-[#e3dcf3] bg-[#faf8ff] p-4",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-[9px]",
            fasting
              ? "bg-[#e9e2f8] text-[#5b4b91]"
              : "bg-[#f3f1fa] text-[#8579ad]",
            variant === "compact" ? "h-7 w-7" : "h-9 w-9",
          )}
          aria-hidden="true"
        >
          <Moon className={variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
        <div>
          <strong className="block text-[12px] font-bold text-ink">
            {fasting ? "Fasting day" : "Fasting day?"}
          </strong>
          <span className="mt-1 block text-[10px] leading-relaxed text-[#92a097]">
            {fasting
              ? "No meals expected. This day is tracked separately."
              : "Mark a day you intentionally go without food."}
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-pressed={fasting}
        aria-label={fasting ? "Clear fasting day" : "Mark as a fasting day"}
        disabled={busy}
        onClick={() => void toggle()}
        className={cn(
          "shrink-0 rounded-[9px] font-bold transition disabled:opacity-60",
          variant === "compact" ? "px-3 py-2 text-[10px]" : "px-4 py-2.5 text-[12px]",
          fasting
            ? "bg-[#e9e2f8] text-[#5b4b91] hover:bg-[#e0d7f4]"
            : "border border-[#d8d0ea] bg-white text-[#6c5d9c] hover:border-[#b9acd8] hover:bg-[#faf8ff]",
        )}
      >
        {busy ? "Saving…" : fasting ? "Undo fast" : "Mark fasting"}
      </button>
    </div>
  );
}
