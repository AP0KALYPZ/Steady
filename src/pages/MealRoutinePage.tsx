import { NotebookPen, RefreshCw, UtensilsCrossed } from "lucide-react";
import { useAppData, useSnapshot } from "../hooks/useAppData";
import { useToast } from "../components/ui/Toast";
import { useDialogs } from "../components/dialogs/DialogProvider";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Segmented } from "../components/ui/Segmented";
import { Switch } from "../components/ui/Switch";
import {
  MAX_MEALS_PER_DAY,
  MEAL_SLOTS,
  mealCountLabel,
  mealSlotsForCount,
  type MealSlot,
  type MealTemplate,
} from "../types";

function NutritionLine({ template }: { template: MealTemplate }) {
  const parts: string[] = [];
  if (template.calories != null) parts.push(`${template.calories} kcal`);
  if (template.protein != null) parts.push(`${template.protein} g protein`);
  if (template.fat != null) parts.push(`${template.fat} g fat`);
  if (parts.length === 0) return null;
  return (
    <p className="mt-2 text-[10px] font-semibold text-[#6f8a7c]">
      Per serving, from your recipe: {parts.join(" · ")}
    </p>
  );
}

export function MealRoutinePage() {
  const snapshot = useSnapshot();
  const { actions } = useAppData();
  const { showToast } = useToast();
  const { openMealTemplate } = useDialogs();
  const { settings, templates } = snapshot;

  const mealCount = settings.mealsPerDay;
  const activeSlots = mealSlotsForCount(mealCount);
  const mealWord = mealCount === 1 ? "meal" : "meals";
  const servingWord = mealCount === 1 ? "serving" : "servings";

  const templateFor = (slot: MealSlot) =>
    templates.find((template) => template.slot === slot);

  const setMealCount = async (next: number) => {
    if (next === mealCount) return;
    try {
      await actions.saveSettings({ ...settings, mealsPerDay: next });
      showToast(
        `${next} ${next === 1 ? "meal" : "meals"} per day · your pages are updated`,
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "The routine could not be saved.",
        "error",
      );
    }
  };

  const setSameMeal = async (next: boolean) => {
    try {
      await actions.saveSettings({ ...settings, sameMeal: next });
      showToast(
        next
          ? `One shared recipe for all ${mealCount} daily ${servingWord}`
          : `Each meal now has its own recipe`,
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "The routine could not be saved.",
        "error",
      );
    }
  };

  const shared = settings.sameMeal;
  const tiles = (shared ? [1] : activeSlots).map((slot) => ({
    slot: slot as MealSlot,
    template: templateFor(slot as MealSlot),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Simplicity is the system"
        title="Your carnivore routine"
        subtitle={`Save your go-to meal once, then track your ${mealCount === 1 ? "daily meal" : `${mealCount} daily meals`} in one tap.`}
      />

      <section
        className="relative flex min-h-[150px] flex-wrap items-center justify-between gap-5 overflow-hidden rounded-card bg-gradient-to-br from-[#125b49] to-[#2b8168] p-[26px] text-white"
        aria-labelledby="routine-hero-title"
      >
        <div className="relative z-10">
          <span className="text-[10px] font-extrabold uppercase tracking-[1.6px] text-white/75">
            Your daily plan
          </span>
          <h2
            id="routine-hero-title"
            className="mt-3 text-[22px] font-extrabold tracking-[-0.5px]"
          >
            {mealCountLabel(mealCount).replace(/^./, (letter) =>
              letter.toUpperCase(),
            )}{" "}
            {mealWord}. One simple routine.
          </h2>
          <p className="mt-2 max-w-[475px] text-[12px] leading-relaxed text-[#cde3d7]">
            Build a meal template with the ingredients you actually eat. Mark
            each of your {mealCount} daily {servingWord} as eaten — no repetitive
            food entry required.
          </p>
        </div>
        <div
          className="relative hidden h-[82px] w-[132px] shrink-0 sm:block"
          aria-hidden="true"
        >
          <div className="absolute right-1 top-0 grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-white/25 text-white/60">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <div className="absolute bottom-0 left-0 grid h-[60px] w-[60px] place-items-center rounded-full border-2 border-white/20 bg-white/5 text-white/50">
            <RefreshCw className="h-5 w-5" />
          </div>
        </div>
      </section>

      <section
        className="surface mt-[19px] p-5 sm:p-6"
        aria-labelledby="meal-count-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[480px]">
            <h2 id="meal-count-title" className="card-title">
              How many meals do you eat each day?
            </h2>
            <p className="card-sub">
              Choose 1 to {MAX_MEALS_PER_DAY} servings. Your daily check-in,
              journal, calendar, and insights all follow this plan.
            </p>
          </div>
          <Segmented
            label="Meals per day"
            value={mealCount}
            onChange={(value) => void setMealCount(value)}
            options={MEAL_SLOTS.map((slot) => ({
              value: slot,
              label: String(slot),
            }))}
          />
        </div>
        <div className="info-banner">
          <strong>Past records are kept.</strong> Changing your plan updates the
          denominator used for new check-ins and analytics; it does not delete
          meals you already logged.
        </div>
      </section>

      <section
        className="surface mt-[19px] p-5 sm:p-6"
        aria-labelledby="routine-template-title"
      >
        {mealCount > 1 && (
          <div className="mb-[18px] flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#edf2ec] bg-[#f8fbf8] p-[15px]">
            <div>
              <h2
                id="routine-template-title"
                className="text-[13px] font-bold text-ink"
              >
                Repeat the same meal for every serving
              </h2>
              <p className="mt-1 text-[11px] text-[#8b9a91]">
                Switch off to give each of your {mealCount} meals its own recipe.
              </p>
            </div>
            <Switch
              checked={settings.sameMeal}
              onChange={(next) => void setSameMeal(next)}
              label="Use the same recipe for every daily meal"
            />
          </div>
        )}

        <div
          className={
            shared
              ? "grid grid-cols-1 gap-[18px]"
              : "grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3"
          }
        >
          {tiles.map(({ slot, template }) => {
            const configured = Boolean(template?.name.trim());
            const sharedDescription =
              mealCount === 1
                ? "Used for your daily meal."
                : `Used for all ${mealCount} daily ${servingWord}.`;
            return (
              <div
                key={slot}
                className="flex flex-col rounded-[15px] border border-edge p-[21px]"
              >
                <div className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-forest">
                  {shared ? "Your recurring meal" : `Meal ${slot}`}
                </div>
                <h3 className="mb-2 mt-2 text-[19px] font-extrabold tracking-[-0.65px] text-ink">
                  {configured ? template?.name : shared ? "Set up your shared meal" : `Set up Meal ${slot}`}
                </h3>
                <p className="min-h-[40px] text-[12px] leading-relaxed text-[#8b9a91]">
                  {template?.ingredients ||
                    (shared
                      ? `Add the ingredients and portions you eat for all ${mealCount} daily ${servingWord}.`
                      : "Add the ingredients and portions for this meal.")}
                </p>
                <div>
                  <span className="my-2 inline-block rounded-lg bg-[#ecf7ef] px-2.5 py-[7px] text-[10px] font-bold text-[#43836a]">
                    {shared
                      ? mealCount === 1
                        ? "Your daily recipe"
                        : `Used for all ${mealCount} servings`
                      : "Individual recipe"}
                  </span>
                </div>
                {template && <NutritionLine template={template} />}
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                  <Button size="small" onClick={() => openMealTemplate(slot)}>
                    <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
                    {configured ? "Edit recipe" : "Set up meal"}
                  </Button>
                  {shared && (
                    <span className="text-[10px] leading-relaxed text-[#8b9a91]">
                      {sharedDescription}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="info-banner">
          <strong>Nutrition is entirely optional.</strong> Values are shown only
          when you enter them for your actual recipe. STEADY does not estimate
          calories, protein or fat, and it never assumes every serving is
          identical. Each logged serving keeps a snapshot, so editing this
          recipe cannot rewrite your history.
        </div>
      </section>
    </>
  );
}
