import { useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Scale } from "lucide-react";
import { useAppData } from "../../hooks/useAppData";
import { useToday } from "../../hooks/useToday";
import { useToast } from "../ui/Toast";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { formatMediumDate, isValidDateKey } from "../../lib/dates";
import {
  formatWeightValue,
  parseWeightInput,
  weightBounds,
} from "../../lib/units";

interface WeightDialogProps {
  initialDate: string;
  onClose(): void;
}

export function WeightDialog({ initialDate, onClose }: WeightDialogProps) {
  const { snapshot, actions } = useAppData();
  const today = useToday();
  const { showToast } = useToast();
  const settings = snapshot?.settings;
  const unit = settings?.unit ?? "lb";

  const initialEntry = useMemo(
    () => snapshot?.weighIns.find((entry) => entry.date === initialDate),
    [snapshot, initialDate],
  );

  const [date, setDate] = useState(initialDate);
  const [rawWeight, setRawWeight] = useState(
    initialEntry ? formatWeightValue(initialEntry.weightKg, unit) : "",
  );
  const [weightTouched, setWeightTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const existing = snapshot?.weighIns.find((entry) => entry.date === date);
  const bounds = weightBounds(unit);
  const isEdit = Boolean(existing);

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate);
    setError(null);
    const entry = snapshot?.weighIns.find((item) => item.date === nextDate);
    setRawWeight(entry ? formatWeightValue(entry.weightKg, unit) : "");
    setWeightTouched(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!isValidDateKey(date)) {
      setError("Choose a valid calendar date.");
      return;
    }
    if (date > today) {
      setError("Future dates cannot be recorded.");
      return;
    }
    const parsed = parseWeightInput(rawWeight, unit);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    // An untouched display value keeps the original stored kilograms exact;
    // round-tripping through a one-decimal display must not mutate the record.
    const weightKg = !weightTouched && existing ? existing.weightKg : parsed.kg;
    setSaving(true);
    try {
      await actions.saveWeighIn(date, weightKg);
      showToast(
        isEdit
          ? `Weigh-in updated for ${formatMediumDate(date)}`
          : `Weight saved for ${formatMediumDate(date)}`,
      );
      onClose();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Your weight could not be saved.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      titleId="weight-dialog-title"
      descriptionId="weight-dialog-description"
      onClose={onClose}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-forest">
          <Scale className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2
            id="weight-dialog-title"
            className="text-[21px] font-extrabold tracking-[-0.7px] text-ink"
          >
            {isEdit ? "Edit your weigh-in" : "Log your weight"}
          </h2>
          <p
            id="weight-dialog-description"
            className="mt-1.5 text-[12px] leading-relaxed text-[#90a098]"
          >
            A single number is just a moment in time. Your trend tells the story.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5" noValidate>
        <div className="field">
          <label htmlFor="weight-date" className="field-label">
            Date
          </label>
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9bab9f]"
              aria-hidden="true"
            />
            <input
              id="weight-date"
              type="date"
              className="input pl-10"
              value={date}
              max={today}
              onChange={(event) => handleDateChange(event.target.value)}
              required
            />
          </div>
          {existing && (
            <p className="field-hint">
              A weigh-in already exists for this date. Saving replaces it.
            </p>
          )}
        </div>

        <div className="field mt-4">
          <label htmlFor="weight-value" className="field-label">
            Weight ({unit})
          </label>
          <div className="relative">
            <input
              id="weight-value"
              type="number"
              inputMode="decimal"
              className="input pr-12 text-[18px] font-semibold"
              min={bounds.min}
              max={bounds.max}
              step={unit === "lb" ? 0.1 : 0.05}
              placeholder={unit === "lb" ? "e.g. 175.1" : "e.g. 79.4"}
              value={rawWeight}
              onChange={(event) => {
                setRawWeight(event.target.value);
                setWeightTouched(true);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "weight-error" : "weight-hint"}
              data-autofocus
              required
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#94a49a]">
              {unit}
            </span>
          </div>
          {error ? (
            <p id="weight-error" className="field-error" role="alert">
              {error}
            </p>
          ) : (
            <p id="weight-hint" className="field-hint">
              Recorded for {formatMediumDate(date)}. Missing days stay missing.
            </p>
          )}
        </div>

        <div className="mt-[22px] flex justify-end gap-2.5">
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update weigh-in" : "Save weigh-in"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
