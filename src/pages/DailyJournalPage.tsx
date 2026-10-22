import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  PenLine,
  Plus,
  Scale,
} from "lucide-react";
import { useSnapshot, useAppData } from "../hooks/useAppData";
import { useToday } from "../hooks/useToday";
import { useDialogs } from "../components/dialogs/DialogProvider";
import { useToast } from "../components/ui/Toast";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { OffPlanControl } from "../components/meals/OffPlanControl";
import {
  addDays,
  describeJournalDate,
  formatLoggedTime,
  formatShortDate,
  formatWeekday,
  isValidDateKey,
  windowKeys,
} from "../lib/dates";
import {
  mealLogsForDate,
  offPlanStatusForDate,
} from "../lib/analytics/meals";
import { formatWeight } from "../lib/units";
import type { MealSlot } from "../types";

export function DailyJournalPage() {
  const snapshot = useSnapshot();
  const today = useToday();
  const { actions } = useAppData();
  const { showToast } = useToast();
  const { openWeight, openMealTemplate, openNote } = useDialogs();
  const [params, setParams] = useSearchParams();
  const [busySlot, setBusySlot] = useState<MealSlot | null>(null);

  const requested = params.get("date");
  const selected =
    requested && isValidDateKey(requested) && requested <= today
      ? requested
      : today;

  const selectDate = (date: string) => {
    if (date > today) return;
    const next = new URLSearchParams(params);
    next.set("date", date);
    setParams(next, { replace: true });
  };

  const logs = mealLogsForDate(snapshot.meals, selected);
  const offPlan = offPlanStatusForDate(snapshot.offPlanDays, selected);
  const weighIn = snapshot.weighIns.find((entry) => entry.date === selected);
  const note = snapshot.notes.find((entry) => entry.date === selected);
  const completed = (logs.meal1 ? 1 : 0) + (logs.meal2 ? 1 : 0);

  const templateFor = (slot: MealSlot) => {
    const index = snapshot.settings.sameMeal ? 0 : slot - 1;
    return snapshot.templates[index];
  };

  const toggleMeal = async (slot: MealSlot) => {
    const log = slot === 1 ? logs.meal1 : logs.meal2;
    const template = templateFor(slot);
    if (!log && !template?.name.trim()) {
      openMealTemplate(slot);
      return;
    }
    setBusySlot(slot);
    try {
      await actions.setMealLogged(selected, slot, !log);
      showToast(!log ? `Meal ${slot} logged` : `Meal ${slot} unmarked`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "The meal could not be saved.",
        "error",
      );
    } finally {
      setBusySlot(null);
    }
  };

  const lastFourteen = windowKeys(today, 14);

  return (
    <>
      <PageHeader
        eyebrow="Daily consistency"
        title="Daily journal"
        subtitle="One clear place for your weight, two meals, and any off-plan moments."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => selectDate(addDays(selected, -1))}
              className="grid h-[36px] w-[36px] place-items-center rounded-[9px] border border-[#dfe8e0] bg-white text-forest transition hover:border-[#b8d8c6]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span
              className="min-w-[184px] text-center text-[13px] font-bold text-ink"
              aria-live="polite"
            >
              {describeJournalDate(selected, today)}
            </span>
            <button
              type="button"
              aria-label="Next day"
              disabled={selected >= today}
              onClick={() => selectDate(addDays(selected, 1))}
              className="grid h-[36px] w-[36px] place-items-center rounded-[9px] border border-[#dfe8e0] bg-white text-forest transition hover:border-[#b8d8c6] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            {selected !== today && (
              <Button size="small" onClick={() => selectDate(today)}>
                Today
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-[19px] dash:grid-cols-[1.25fr_minmax(0,1fr)]">
        <section className="surface p-5 sm:p-6" aria-labelledby="journal-meals-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="journal-meals-title" className="card-title">
                Your two meals
              </h2>
              <p className="card-sub">Track each serving with a single click</p>
            </div>
            <span className="rounded-lg bg-[#ecf7ef] px-2.5 py-1.5 text-[10px] font-bold text-[#43836a]">
              {completed} / 2 logged
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2.5">
            {([1, 2] as const).map((slot) => {
              const log = slot === 1 ? logs.meal1 : logs.meal2;
              const template = templateFor(slot);
              const logged = Boolean(log);
              const name = log?.name || template?.name || "No meal set up yet";
              const details =
                log?.ingredients ||
                template?.ingredients ||
                "Add the ingredients you actually eat in Meal routine.";
              const loggedTime = formatLoggedTime(log?.loggedAt ?? null);
              return (
                <div
                  key={slot}
                  className="flex flex-wrap items-center gap-3.5 rounded-[13px] border border-edge p-[17px]"
                >
                  <span
                    aria-hidden="true"
                    className={
                      logged
                        ? "grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-forest text-white"
                        : "grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] border-[1.5px] border-[#cbdad0] bg-white text-transparent"
                    }
                  >
                    <Check className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-[13px] font-bold text-ink">
                      Meal {slot} · {name}
                    </strong>
                    <span className="mt-1 block text-[11px] leading-relaxed text-[#8e9e93]">
                      {details}
                    </span>
                    {loggedTime && (
                      <span className="mt-1 block text-[10px] font-semibold text-[#799987]">
                        Logged at {loggedTime}
                      </span>
                    )}
                  </div>
                  <Button
                    size="small"
                    variant={logged ? "subtle" : "primary"}
                    className="min-w-[92px]"
                    disabled={busySlot === slot}
                    onClick={() => void toggleMeal(slot)}
                    aria-label={
                      logged ? `Undo meal ${slot} log` : `Log meal ${slot}`
                    }
                  >
                    {busySlot === slot
                      ? "Saving…"
                      : logged
                        ? "Undo"
                        : template?.name.trim()
                          ? "Log meal"
                          : "Set up meal"}
                  </Button>
                </div>
              );
            })}
          </div>

          <hr className="my-6 border-[#edf1ec]" />

          <div>
            <h2 className="card-title">Off-plan / cheat meal</h2>
            <p className="card-sub">Track the day, without moralizing the food.</p>
            <OffPlanControl date={selected} status={offPlan} variant="full" />
          </div>
        </section>

        <section className="surface flex flex-col p-5 sm:p-6" aria-labelledby="journal-day-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="journal-day-title" className="card-title">
                Weigh-in
              </h2>
              <p className="card-sub">Optional, but useful for spotting trends</p>
            </div>
            <Scale className="mt-1 h-[18px] w-[18px] text-[#8fa79a]" aria-hidden="true" />
          </div>

          <div className="mt-3 rounded-xl border border-[#e9eee9] bg-[#fafdfe] p-[19px]">
            <span className="block text-[10px] font-semibold text-[#8d9d92]">
              Weight on {formatShortDate(selected)}
            </span>
            <strong className="my-2 block text-[26px] font-extrabold tracking-[-1px] text-ink">
              {weighIn ? formatWeight(weighIn.weightKg, snapshot.settings.unit) : "—"}
            </strong>
            <span className="block text-[10px] text-[#91a095]">
              {weighIn
                ? "Saved measurement for this date"
                : "No weigh-in recorded for this date"}
            </span>
          </div>
          <Button
            className={weighIn ? "mt-3.5 self-start" : "mt-3.5 self-start"}
            variant={weighIn ? "default" : "primary"}
            onClick={() => openWeight(selected)}
          >
            {weighIn ? (
              <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {weighIn ? "Edit weigh-in" : "Add weight"}
          </Button>

          <hr className="my-6 border-[#edf1ec]" />

          <div className="flex items-start justify-between gap-3">
            <h2 className="card-title">Daily note</h2>
            <button
              type="button"
              className="btn-link"
              onClick={() => openNote(selected)}
            >
              {note ? "Edit note" : "Add note"} →
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[11px] leading-[1.7] text-[#92a197]">
            {note
              ? note.body
              : "Keep track of energy, hunger, an unusual day, or anything that could help you understand your progress."}
          </p>
        </section>
      </div>

      <section className="surface mt-[19px] p-5 sm:p-6" aria-labelledby="journal-history-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 id="journal-history-title" className="card-title">
            Last 14 days
          </h2>
          <span className="text-[11px] text-[#9aa79f]">Choose a day to edit it</span>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-7">
          {lastFourteen.map((date) => {
            const dayLogs = mealLogsForDate(snapshot.meals, date);
            const checked = (dayLogs.meal1 ? 1 : 0) + (dayLogs.meal2 ? 1 : 0);
            const hasWeight = snapshot.weighIns.some((entry) => entry.date === date);
            const dayOffPlan = offPlanStatusForDate(snapshot.offPlanDays, date);
            return (
              <button
                key={date}
                type="button"
                className="day-cell"
                data-active={selected === date}
                aria-label={`${formatShortDate(date)}: ${checked} of 2 meals logged${hasWeight ? ", weight recorded" : ""}${dayOffPlan === "off" ? ", off-plan meal" : ""}`}
                aria-current={selected === date ? "date" : undefined}
                onClick={() => selectDate(date)}
              >
                <div className="text-[10px] font-semibold text-[#91a096]">
                  {formatWeekday(date)}
                </div>
                <div className="my-2 text-[18px] font-extrabold tracking-[-0.5px] text-ink">
                  {Number(date.slice(8, 10))}
                </div>
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-[#69947c]">
                  <span>{checked}/2</span>
                  {hasWeight && (
                    <Scale className="h-3 w-3 text-[#88a294]" aria-label="weight recorded" />
                  )}
                  {dayOffPlan === "off" && (
                    <span className="h-[5px] w-[5px] rounded-full bg-[#bd725a]" aria-label="off-plan meal" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
