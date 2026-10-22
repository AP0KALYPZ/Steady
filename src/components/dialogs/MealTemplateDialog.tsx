import { useState, type FormEvent } from "react";
import { NotebookPen } from "lucide-react";
import { useAppData } from "../../hooks/useAppData";
import { useToast } from "../ui/Toast";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { MealSlot } from "../../types";

interface MealTemplateDialogProps {
  slot: MealSlot;
  onClose(): void;
}

function parseOptionalMacro(
  raw: string,
  label: string,
  max: number,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > max) {
    return {
      ok: false,
      error: `${label} must be a number from 0 to ${max.toLocaleString("en-US")}, or left blank.`,
    };
  }
  return { ok: true, value };
}

export function MealTemplateDialog({ slot, onClose }: MealTemplateDialogProps) {
  const { snapshot, actions } = useAppData();
  const { showToast } = useToast();
  const settings = snapshot?.settings;
  const effectiveSlot: MealSlot =
    settings?.sameMeal === true ? 1 : slot;
  const template =
    snapshot?.templates.find((item) => item.slot === effectiveSlot) ??
    snapshot?.templates[0];

  const [name, setName] = useState(template?.name ?? "");
  const [ingredients, setIngredients] = useState(template?.ingredients ?? "");
  const [calories, setCalories] = useState(
    template?.calories != null ? String(template.calories) : "",
  );
  const [protein, setProtein] = useState(
    template?.protein != null ? String(template.protein) : "",
  );
  const [fat, setFat] = useState(
    template?.fat != null ? String(template.fat) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const targetedMeal = settings?.sameMeal ? "both daily servings" : `Meal ${slot}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give this meal a name so it is easy to recognise.");
      return;
    }
    if (name.trim().length > 120) {
      setError("Meal names are limited to 120 characters.");
      return;
    }
    const caloriesResult = parseOptionalMacro(calories, "Calories", 100_000);
    if (!caloriesResult.ok) {
      setError(caloriesResult.error);
      return;
    }
    const proteinResult = parseOptionalMacro(protein, "Protein", 5_000);
    if (!proteinResult.ok) {
      setError(proteinResult.error);
      return;
    }
    const fatResult = parseOptionalMacro(fat, "Fat", 5_000);
    if (!fatResult.ok) {
      setError(fatResult.error);
      return;
    }
    setSaving(true);
    try {
      await actions.saveTemplate({
        slot: effectiveSlot,
        name: name.trim(),
        ingredients: ingredients.trim(),
        calories: caloriesResult.value,
        protein: proteinResult.value,
        fat: fatResult.value,
      });
      showToast("Meal routine saved");
      onClose();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Your meal could not be saved.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      titleId="meal-dialog-title"
      descriptionId="meal-dialog-description"
      onClose={onClose}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-forest">
          <NotebookPen className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2
            id="meal-dialog-title"
            className="text-[21px] font-extrabold tracking-[-0.7px] text-ink"
          >
            {settings?.sameMeal ? "Your recurring meal" : `Meal ${slot}`}
          </h2>
          <p
            id="meal-dialog-description"
            className="mt-1.5 text-[12px] leading-relaxed text-[#90a098]"
          >
            Describe the exact meal you eat. This template will be used for{" "}
            {targetedMeal}; nutrition fields are optional.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5" noValidate>
        <div className="field">
          <label htmlFor="meal-name" className="field-label">
            Meal name
          </label>
          <input
            id="meal-name"
            className="input"
            maxLength={120}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="e.g. Beef, eggs and cheddar"
            aria-invalid={Boolean(error && !name.trim())}
            data-autofocus
            required
          />
        </div>

        <div className="field mt-4">
          <label htmlFor="meal-ingredients" className="field-label">
            Ingredients &amp; portion
          </label>
          <textarea
            id="meal-ingredients"
            className="input"
            maxLength={2000}
            rows={3}
            value={ingredients}
            onChange={(event) => setIngredients(event.target.value)}
            placeholder="e.g. 250 g ground beef, 3 eggs, 40 g cheddar"
          />
          <p className="field-hint">
            Use your own quantities; STEADY never estimates nutrition for you.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="field">
            <label htmlFor="meal-calories" className="field-label">
              Calories / serving
            </label>
            <input
              id="meal-calories"
              className="input"
              type="number"
              min={0}
              max={100000}
              step={1}
              inputMode="numeric"
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="field">
            <label htmlFor="meal-protein" className="field-label">
              Protein (g)
            </label>
            <input
              id="meal-protein"
              className="input"
              type="number"
              min={0}
              max={5000}
              step={0.1}
              inputMode="decimal"
              value={protein}
              onChange={(event) => setProtein(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="field">
            <label htmlFor="meal-fat" className="field-label">
              Fat (g)
            </label>
            <input
              id="meal-fat"
              className="input"
              type="number"
              min={0}
              max={5000}
              step={0.1}
              inputMode="decimal"
              value={fat}
              onChange={(event) => setFat(event.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        {error && (
          <p className="field-error mt-3" role="alert">
            {error}
          </p>
        )}

        <div className="info-banner mt-4">
          <strong>History stays accurate.</strong> Each logged serving keeps a
          copy of this recipe. Editing it later changes future logs only.
        </div>

        <div className="mt-[22px] flex justify-end gap-2.5">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save meal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
