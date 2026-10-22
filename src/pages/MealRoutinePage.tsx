import { NotebookPen, RefreshCw, UtensilsCrossed } from "lucide-react";
import { useAppData, useSnapshot } from "../hooks/useAppData";
import { useToast } from "../components/ui/Toast";
import { useDialogs } from "../components/dialogs/DialogProvider";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Switch } from "../components/ui/Switch";
import type { MealTemplate } from "../types";

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

  const setSameMeal = async (next: boolean) => {
    try {
      await actions.saveSettings({ ...settings, sameMeal: next });
      showToast(
        next
          ? "One shared meal routine for both servings"
          : "Meal 2 now has its own template",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "The routine could not be saved.",
        "error",
      );
    }
  };

  const tiles = ([1, 2] as const).map((slot) => {
    const shared = settings.sameMeal && slot === 2;
    const template = templates[settings.sameMeal ? 0 : slot - 1];
    return { slot, shared, template };
  });

  return (
    <>
      <PageHeader
        eyebrow="Simplicity is the system"
        title="Your carnivore routine"
        subtitle="Save your go-to meal once. Track both daily servings in one tap."
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
            Two meals. One simple routine.
          </h2>
          <p className="mt-2 max-w-[475px] text-[12px] leading-relaxed text-[#cde3d7]">
            Build a meal template with the ingredients you actually eat. Mark each
            serving as eaten — no repetitive food entry required.
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

      <section className="surface mt-[19px] p-5 sm:p-6" aria-labelledby="routine-template-title">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#edf2ec] bg-[#f8fbf8] p-[15px]">
          <div>
            <h2 id="routine-template-title" className="text-[13px] font-bold text-ink">
              Repeat the same meal twice a day
            </h2>
            <p className="mt-1 text-[11px] text-[#8b9a91]">
              Switch off to set up a different second meal.
            </p>
          </div>
          <Switch
            checked={settings.sameMeal}
            onChange={(next) => void setSameMeal(next)}
            label="Repeat the same meal twice daily"
          />
        </div>

        <div className="mt-[18px] grid grid-cols-1 gap-[18px] md:grid-cols-2">
          {tiles.map(({ slot, shared, template }) => {
            const configured = Boolean(template?.name.trim());
            return (
              <div
                key={slot}
                className="flex flex-col rounded-[15px] border border-edge p-[21px]"
              >
                <div className="text-[10px] font-extrabold uppercase tracking-[1.3px] text-forest">
                  Meal {slot}
                </div>
                <h3 className="mb-2 mt-2 text-[19px] font-extrabold tracking-[-0.65px] text-ink">
                  {shared ? templates[0]?.name || "Uses Meal 1" : configured ? template.name : `Set up Meal ${slot}`}
                </h3>
                <p className="min-h-[40px] text-[12px] leading-relaxed text-[#8b9a91]">
                  {shared
                    ? templates[0]?.name
                      ? `Both servings use your Meal 1 recipe${templates[0].ingredients ? `: ${templates[0].ingredients}` : "."}`
                      : "Both servings will use your Meal 1 recipe once it is set up."
                    : template?.ingredients ||
                      "Add the ingredients and portions for this meal."}
                </p>
                <div>
                  <span className="my-2 inline-block rounded-lg bg-[#ecf7ef] px-2.5 py-[7px] text-[10px] font-bold text-[#43836a]">
                    {settings.sameMeal ? "Shared routine" : "Individual template"}
                  </span>
                </div>
                {!shared && template && <NutritionLine template={template} />}
                <div className="mt-auto pt-4">
                  <Button
                    size="small"
                    onClick={() => openMealTemplate(shared ? 1 : slot)}
                  >
                    <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
                    {shared
                      ? "Edit Meal 1 recipe"
                      : configured
                        ? "Edit recipe"
                        : `Set up Meal ${slot}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="info-banner">
          <strong>Nutrition is entirely optional.</strong> Values are shown only when
          you enter them for your actual recipe. STEADY does not estimate calories,
          protein or fat, and it never assumes every serving is identical. Each
          logged serving keeps a snapshot, so editing this recipe cannot rewrite
          your history.
        </div>
      </section>
    </>
  );
}
