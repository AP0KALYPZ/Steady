import { useState, type FormEvent } from "react";
import { ArrowLeft, Check, Leaf } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Segmented } from "../ui/Segmented";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../ui/Toast";
import {
  MEAL_SLOTS,
  type MealTemplateInput,
  type Unit,
} from "../../types";
import {
  formatWeightValue,
  KG_PER_LB,
  parseWeightInput,
} from "../../lib/units";
import { cn } from "../../lib/cn";

type Step = 1 | 2;

export function OnboardingDialog() {
  const { snapshot, actions } = useAppData();
  const { showToast } = useToast();
  const currentSettings = snapshot?.settings;

  const [step, setStep] = useState<Step>(1);
  const [unit, setUnit] = useState<Unit>(currentSettings?.unit ?? "lb");
  const [startWeight, setStartWeight] = useState(
    currentSettings?.startWeightKg != null
      ? formatWeightValue(currentSettings.startWeightKg, currentSettings.unit)
      : "",
  );
  const [goalWeight, setGoalWeight] = useState(
    currentSettings?.goalWeightKg != null
      ? formatWeightValue(currentSettings.goalWeightKg, currentSettings.unit)
      : "",
  );
  const [mealsPerDay, setMealsPerDay] = useState(
    currentSettings?.mealsPerDay ?? 2,
  );
  const [mealName, setMealName] = useState("");
  const [mealIngredients, setMealIngredients] = useState("");
  const [startKg, setStartKg] = useState<number | null>(
    currentSettings?.startWeightKg ?? null,
  );
  const [goalKg, setGoalKg] = useState<number | null>(
    currentSettings?.goalWeightKg ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const unitChange = (nextUnit: Unit) => {
    if (nextUnit === unit) return;
    const factor = nextUnit === "kg" ? 1 / KG_PER_LB : KG_PER_LB;
    const convert = (value: string) => {
      const numeric = Number(value);
      return value.trim() && Number.isFinite(numeric)
        ? (numeric * factor).toFixed(1)
        : value;
    };
    setStartWeight((value) => convert(value));
    setGoalWeight((value) => convert(value));
    setUnit(nextUnit);
    setError(null);
  };

  const continueToMeal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsedStart = parseWeightInput(startWeight, unit);
    if (!parsedStart.ok) {
      setError(`Starting weight: ${parsedStart.error}`);
      return;
    }
    const parsedGoal = parseWeightInput(goalWeight, unit);
    if (!parsedGoal.ok) {
      setError(`Goal weight: ${parsedGoal.error}`);
      return;
    }
    if (parsedGoal.kg >= parsedStart.kg) {
      setError("Your goal must be below your starting weight.");
      return;
    }
    setStartKg(parsedStart.kg);
    setGoalKg(parsedGoal.kg);
    setStep(2);
  };

  const persistSettings = async (onboarded: boolean) => {
    if (startKg == null || goalKg == null) {
      throw new Error("Set a starting weight and a goal first.");
    }
    const templates: MealTemplateInput[] = [];
    if (mealName.trim()) {
      templates.push({
        slot: 1,
        name: mealName.trim(),
        ingredients: mealIngredients.trim(),
        calories: null,
        protein: null,
        fat: null,
      });
    }
    await actions.completeSetup({
      settings: {
        unit,
        startWeightKg: startKg,
        goalWeightKg: goalKg,
        sameMeal: true,
        mealsPerDay,
        onboarded,
      },
      templates,
    });
  };

  const finish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!mealName.trim()) {
      setError("Name your recurring meal, or choose “Set this up later”.");
      return;
    }
    setSaving(true);
    try {
      await persistSettings(true);
      showToast("You're set up. Start with a weigh-in whenever you're ready.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Setup could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const skipSetup = async () => {
    setSaving(true);
    try {
      await actions.saveSettings({
        unit,
        startWeightKg: startKg,
        goalWeightKg: goalKg,
        sameMeal: true,
        mealsPerDay,
        onboarded: true,
      });
      showToast("You can finish setup any time in Settings.", "info");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Setup could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const skipEntirely = async () => {
    setSaving(true);
    try {
      await actions.saveSettings({
        unit,
        startWeightKg: null,
        goalWeightKg: null,
        sameMeal: true,
        mealsPerDay,
        onboarded: true,
      });
      showToast("You can set your goal and meal any time in Settings.", "info");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Setup could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      titleId="onboarding-title"
      descriptionId="onboarding-description"
      dismissible={false}
      wide
      onClose={() => undefined}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#125a49] text-white">
          <Leaf className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[2px] text-forest">
            Welcome to STEADY
          </div>
          <h2
            id="onboarding-title"
            className="mt-1 text-[23px] font-extrabold tracking-[-0.8px] text-ink"
          >
            {step === 1 ? "Set your direction" : "Define your routine"}
          </h2>
        </div>
      </div>
      <p
        id="onboarding-description"
        className="mt-3 text-[12px] leading-relaxed text-[#8f9f97]"
      >
        {step === 1
          ? "Choose your units and a goal. Nothing is shared, and no account is needed."
          : `Save the carnivore ${mealsPerDay === 1 ? "meal" : "meals"} you actually eat. You will log each of your ${mealsPerDay} daily ${mealsPerDay === 1 ? "serving" : "servings"} with one tap.`}
      </p>

      <div className="mt-5 flex items-center gap-2" aria-hidden="true">
        {[1, 2].map((dot) => (
          <span
            key={dot}
            className={cn(
              "h-1.5 rounded-full transition-all",
              step === dot ? "w-7 bg-forest" : "w-3 bg-[#dbe7df]",
            )}
          />
        ))}
      </div>

      {step === 1 ? (
        <form onSubmit={continueToMeal} className="mt-5" noValidate>
          <div className="field">
            <span className="field-label" id="onboarding-unit-label">
              Preferred unit
            </span>
            <div>
              <Segmented
                label="Preferred weight unit"
                value={unit}
                onChange={unitChange}
                options={[
                  { value: "lb", label: "Pounds (lb)" },
                  { value: "kg", label: "Kilograms (kg)" },
                ]}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="onboarding-start" className="field-label">
                Starting weight ({unit})
              </label>
              <input
                id="onboarding-start"
                className="input"
                type="number"
                inputMode="decimal"
                step={unit === "lb" ? 0.1 : 0.05}
                value={startWeight}
                onChange={(event) => {
                  setStartWeight(event.target.value);
                  setError(null);
                }}
                placeholder={unit === "lb" ? "e.g. 184.5" : "e.g. 83.7"}
                data-autofocus
                required
              />
            </div>
            <div className="field">
              <label htmlFor="onboarding-goal" className="field-label">
                Goal weight ({unit})
              </label>
              <input
                id="onboarding-goal"
                className="input"
                type="number"
                inputMode="decimal"
                step={unit === "lb" ? 0.1 : 0.05}
                value={goalWeight}
                onChange={(event) => {
                  setGoalWeight(event.target.value);
                  setError(null);
                }}
                placeholder={unit === "lb" ? "e.g. 150" : "e.g. 68"}
                required
              />
            </div>
          </div>
          <p className="field-hint mt-2">
            Your starting weight is the baseline for progress; it is not added to
            your weigh-in history.
          </p>
          {error && (
            <p className="field-error mt-3" role="alert">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="btn-link text-[#8b9b92]"
              onClick={skipEntirely}
              disabled={saving}
            >
              Set this up later
            </button>
            <Button type="submit" variant="primary">
              Continue
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={finish} className="mt-5" noValidate>
          <div className="field">
            <span className="field-label" id="onboarding-meals-label">
              Meals per day
            </span>
            <div>
              <Segmented
                label="Meals per day"
                value={mealsPerDay}
                onChange={(value) => setMealsPerDay(Number(value))}
                options={MEAL_SLOTS.map((slot) => ({
                  value: slot,
                  label: String(slot),
                }))}
              />
            </div>
            <p className="field-hint">
              You can change this later in Meal routine. Every page adapts to
              your plan.
            </p>
          </div>
          <div className="field mt-4">
            <label htmlFor="onboarding-meal" className="field-label">
              {mealsPerDay === 1 ? "Your meal" : "Your recurring meal"}
            </label>
            <input
              id="onboarding-meal"
              className="input"
              value={mealName}
              onChange={(event) => {
                setMealName(event.target.value);
                setError(null);
              }}
              placeholder="e.g. Beef, eggs and cheddar"
              maxLength={120}
              data-autofocus
            />
          </div>
          <div className="field mt-4">
            <label htmlFor="onboarding-meal-details" className="field-label">
              Ingredients &amp; portion <span className="font-normal">(optional)</span>
            </label>
            <textarea
              id="onboarding-meal-details"
              className="input"
              rows={3}
              value={mealIngredients}
              onChange={(event) => setMealIngredients(event.target.value)}
              placeholder="e.g. 250 g ground beef, 3 eggs, 40 g cheddar"
              maxLength={2000}
            />
          </div>
          <div className="info-banner">
            <strong>
              {mealsPerDay === 1
                ? "One simple meal."
                : `All ${mealsPerDay} daily servings use this recipe.`}
            </strong>{" "}
            You can add separate recipes for each meal later in Meal routine.
          </div>
          {error && (
            <p className="field-error mt-3" role="alert">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                disabled={saving}
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back
              </Button>
              <button
                type="button"
                className="btn-link text-[#8b9b92]"
                onClick={skipSetup}
                disabled={saving || startKg == null || goalKg == null}
              >
                Set this up later
              </button>
            </div>
            <Button type="submit" variant="primary" disabled={saving}>
              <Check className="h-4 w-4" aria-hidden="true" />
              {saving ? "Saving…" : "Finish setup"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
