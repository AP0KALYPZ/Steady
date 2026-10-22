import { useState } from "react";
import { Check } from "lucide-react";
import type { AppSnapshot, MealSlot } from "../../types";
import { formatShortDate } from "../../lib/dates";
import { mealLogsForDate } from "../../lib/analytics/meals";
import { offPlanStatusForDate } from "../../lib/analytics/meals";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../ui/Toast";
import { useDialogs } from "../dialogs/DialogProvider";
import { OffPlanControl } from "../meals/OffPlanControl";

interface TodayCheckInProps {
  snapshot: AppSnapshot;
  today: string;
}

export function TodayCheckIn({ snapshot, today }: TodayCheckInProps) {
  const { actions } = useAppData();
  const { showToast } = useToast();
  const { openMealTemplate } = useDialogs();
  const [busySlot, setBusySlot] = useState<MealSlot | null>(null);

  const logs = mealLogsForDate(snapshot.meals, today);
  const offPlan = offPlanStatusForDate(snapshot.offPlanDays, today);
  const completed = (logs.meal1 ? 1 : 0) + (logs.meal2 ? 1 : 0);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  const templateFor = (slot: MealSlot) => {
    const index = snapshot.settings.sameMeal ? 0 : slot - 1;
    return snapshot.templates[index];
  };

  const toggleMeal = async (slot: MealSlot) => {
    const logged = slot === 1 ? Boolean(logs.meal1) : Boolean(logs.meal2);
    const template = templateFor(slot);
    if (!logged && !template?.name.trim()) {
      openMealTemplate(slot);
      return;
    }
    setBusySlot(slot);
    try {
      await actions.setMealLogged(today, slot, !logged);
      showToast(!logged ? `Meal ${slot} logged` : `Meal ${slot} unmarked`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "The meal could not be saved.",
        "error",
      );
    } finally {
      setBusySlot(null);
    }
  };

  return (
    <section className="surface flex min-h-[390px] flex-col p-[22px]" aria-labelledby="today-checkin-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="today-checkin-title" className="card-title">
          Today&apos;s check-in
        </h2>
        <span className="rounded-full bg-[#f2f6f2] px-2.5 py-2 text-[10px] font-bold text-[#7b8d81]">
          {formatShortDate(today)}
        </span>
      </div>

      <div className="my-[18px] grid grid-cols-[62px_1fr] items-center gap-3">
        <div className="relative grid h-[62px] w-[62px] place-items-center">
          <svg viewBox="0 0 62 62" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="31" cy="31" r={radius} fill="none" stroke="#e6f1e9" strokeWidth="6" />
            <circle
              cx="31"
              cy="31"
              r={radius}
              fill="none"
              stroke="#146b54"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - completed / 2)}
              className="transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <b className="text-[17px] font-extrabold tracking-[-0.4px] text-ink">{completed}/2</b>
          <span className="sr-only">{completed} of 2 meals logged today</span>
        </div>
        <div>
          <strong className="block text-[13px] font-bold text-ink">
            {completed === 2
              ? "Both meals checked in"
              : completed === 1
                ? "One meal logged"
                : "Your routine, at a glance"}
          </strong>
          <span className="mt-1 block text-[11px] text-[#8a988f]">
            {completed === 2
              ? "Two meals logged today"
              : completed === 1
                ? "One more meal to log"
                : "Tap a meal when you finish it"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {([1, 2] as const).map((slot) => {
          const log = slot === 1 ? logs.meal1 : logs.meal2;
          const template = templateFor(slot);
          const logged = Boolean(log);
          const name =
            log?.name || template?.name || "Set up your meal in Meal routine";
          return (
            <button
              key={slot}
              type="button"
              aria-pressed={logged}
              aria-label={`Meal ${slot}: ${logged ? "logged, activate to undo" : "not logged, activate to log"}`}
              onClick={() => void toggleMeal(slot)}
              disabled={busySlot === slot}
              className="group flex w-full items-center gap-[11px] rounded-xl border border-[#e9eee9] bg-white px-3 py-3 text-left transition hover:border-[#bddcca] hover:bg-[#f7faf8] disabled:opacity-60"
            >
              <span
                aria-hidden="true"
                className={
                  logged
                    ? "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] border border-forest bg-forest text-white"
                    : "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] border-[1.5px] border-[#cbdad0] bg-white text-transparent"
                }
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold text-ink">Meal {slot}</span>
                <span className="mt-0.5 block truncate text-[10px] text-[#97a399]">
                  {name}
                </span>
              </span>
              <span className="ml-auto whitespace-nowrap text-[10px] font-bold text-forest">
                {busySlot === slot ? "Saving…" : logged ? "Logged ✓" : "Log +"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto">
        <OffPlanControl date={today} status={offPlan} />
      </div>
    </section>
  );
}
