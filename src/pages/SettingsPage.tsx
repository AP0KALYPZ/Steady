import { useState, type FormEvent } from "react";
import {
  Download,
  HardDrive,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useAppData, useSnapshot } from "../hooks/useAppData";
import { useToday } from "../hooks/useToday";
import { useToast } from "../components/ui/Toast";
import { useDialogs } from "../components/dialogs/DialogProvider";
import { useExports } from "../features/useExports";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Segmented } from "../components/ui/Segmented";
import type { Unit } from "../types";
import {
  formatWeightValue,
  parseWeightInput,
  toDisplayWeight,
  toKilograms,
} from "../lib/units";
import { parseBackup } from "../lib/backup";
import { openTextFile } from "../lib/fileIO";
import { appVersion } from "../lib/platform";

interface ImportIssue {
  file: string;
  errors: string[];
}

export function SettingsPage() {
  const snapshot = useSnapshot();
  const today = useToday();
  const { actions, storageKind } = useAppData();
  const { showToast } = useToast();
  const { confirm } = useDialogs();
  const { exportCsv, exportBackup } = useExports();

  const [unit, setUnit] = useState<Unit>(snapshot.settings.unit);
  const [startRaw, setStartRaw] = useState(
    snapshot.settings.startWeightKg != null
      ? formatWeightValue(snapshot.settings.startWeightKg, snapshot.settings.unit)
      : "",
  );
  const [goalRaw, setGoalRaw] = useState(
    snapshot.settings.goalWeightKg != null
      ? formatWeightValue(snapshot.settings.goalWeightKg, snapshot.settings.unit)
      : "",
  );
  const [startTouched, setStartTouched] = useState(false);
  const [goalTouched, setGoalTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importIssue, setImportIssue] = useState<ImportIssue | null>(null);
  const [dataBusy, setDataBusy] = useState(false);

  const switchUnit = (nextUnit: Unit) => {
    if (nextUnit === unit) return;
    const convertField = (raw: string) => {
      const numeric = Number(raw);
      if (!raw.trim() || !Number.isFinite(numeric)) return raw;
      return toDisplayWeight(toKilograms(numeric, unit), nextUnit).toFixed(1);
    };
    setStartRaw((value) => convertField(value));
    setGoalRaw((value) => convertField(value));
    setUnit(nextUnit);
    setFormError(null);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const start = parseWeightInput(startRaw, unit);
    if (!start.ok) {
      setFormError(`Starting weight: ${start.error}`);
      return;
    }
    const goal = parseWeightInput(goalRaw, unit);
    if (!goal.ok) {
      setFormError(`Goal weight: ${goal.error}`);
      return;
    }
    if (goal.kg >= start.kg) {
      setFormError("Your goal must be below your starting weight.");
      return;
    }
    // If a field was not edited, keep the original canonical value instead of
    // writing back the rounded display value after a unit change.
    const startKg = !startTouched
      ? (snapshot.settings.startWeightKg ?? start.kg)
      : start.kg;
    const goalKg = !goalTouched
      ? (snapshot.settings.goalWeightKg ?? goal.kg)
      : goal.kg;
    if (goalKg >= startKg) {
      setFormError("Your goal must be below your starting weight.");
      return;
    }
    setSaving(true);
    try {
      await actions.saveSettings({
        ...snapshot.settings,
        unit,
        startWeightKg: startKg,
        goalWeightKg: goalKg,
        onboarded: true,
      });
      setStartRaw(formatWeightValue(startKg, unit));
      setGoalRaw(formatWeightValue(goalKg, unit));
      setStartTouched(false);
      setGoalTouched(false);
      showToast("Preferences saved");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Preferences could not be saved.";
      setFormError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (dataBusy) return;
    try {
      const picked = await openTextFile({ name: "STEADY backup", extensions: ["json"] });
      if (!picked) return;
      const parsed = parseBackup(picked.text, today);
      if (!parsed.ok) {
        setImportIssue({ file: picked.name, errors: parsed.errors });
        return;
      }
      const counts = {
        weights: parsed.snapshot.weighIns.length,
        meals: parsed.snapshot.meals.length,
        notes: parsed.snapshot.notes.length,
        offPlan: parsed.snapshot.offPlanDays.length,
      };
      const confirmed = await confirm({
        title: "Replace all current records?",
        description: (
          <>
            <p>
              <strong className="font-bold text-ink">{picked.name}</strong> contains{" "}
              {counts.weights} weigh-in{counts.weights === 1 ? "" : "s"},{" "}
              {counts.meals} meal log{counts.meals === 1 ? "" : "s"},{" "}
              {counts.offPlan} off-plan record{counts.offPlan === 1 ? "" : "s"} and{" "}
              {counts.notes} note{counts.notes === 1 ? "" : "s"}.
            </p>
            <p className="mt-2">
              This replaces everything currently stored on this device. Export a
              backup first if you may want the current records later.
            </p>
          </>
        ),
        confirmLabel: "Replace records",
        tone: "danger",
      });
      if (!confirmed) return;
      setDataBusy(true);
      await actions.importSnapshot(parsed.snapshot);
      setUnit(parsed.snapshot.settings.unit);
      setStartTouched(false);
      setGoalTouched(false);
      setStartRaw(
        parsed.snapshot.settings.startWeightKg != null
          ? formatWeightValue(
              parsed.snapshot.settings.startWeightKg,
              parsed.snapshot.settings.unit,
            )
          : "",
      );
      setGoalRaw(
        parsed.snapshot.settings.goalWeightKg != null
          ? formatWeightValue(
              parsed.snapshot.settings.goalWeightKg,
              parsed.snapshot.settings.unit,
            )
          : "",
      );
      showToast("Backup restored — your records were replaced.");
      if (parsed.warnings.length > 0) {
        showToast(parsed.warnings[0], "info");
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "The backup could not be imported.",
        "error",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: "Start with a clean slate?",
      description:
        "This permanently deletes every weigh-in, meal log, off-plan record, note, recipe and preference on this device. Export a backup first if you want to keep a copy.",
      confirmLabel: "Delete all records",
      tone: "danger",
    });
    if (!confirmed) return;
    setDataBusy(true);
    try {
      await actions.resetAll();
      setUnit("lb");
      setStartRaw("");
      setGoalRaw("");
      setStartTouched(false);
      setGoalTouched(false);
      showToast("All records cleared. STEADY is ready for a fresh start.");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "The records could not be cleared.",
        "error",
      );
    } finally {
      setDataBusy(false);
    }
  };

  const recordCount =
    snapshot.weighIns.length +
    snapshot.meals.length +
    snapshot.offPlanDays.length +
    snapshot.notes.length;

  return (
    <>
      <PageHeader
        eyebrow="Personalize your system"
        title="Settings"
        subtitle="Your target, units, and how you want to keep your records."
      />

      <div className="w-full max-w-[720px]">
        <section className="surface p-5 sm:p-6" aria-labelledby="goal-settings-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="goal-settings-title" className="card-title">
                Your starting point
              </h2>
              <p className="card-sub">
                Measurements are preserved exactly when you change units.
              </p>
            </div>
            <Settings2 className="mt-1 h-[18px] w-[18px] text-[#8fa79a]" aria-hidden="true" />
          </div>

          <form onSubmit={handleSave} className="mt-4" noValidate>
            <div className="field">
              <span className="field-label" id="settings-unit-label">
                Preferred unit
              </span>
              <div>
                <Segmented
                  label="Preferred unit"
                  value={unit}
                  onChange={switchUnit}
                  options={[
                    { value: "lb", label: "Pounds (lb)" },
                    { value: "kg", label: "Kilograms (kg)" },
                  ]}
                />
              </div>
              <p className="field-hint">
                Switching only changes display and input; stored kilogram values
                never change.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="settings-start" className="field-label">
                  Starting weight ({unit})
                </label>
                <input
                  id="settings-start"
                  className="input"
                  type="number"
                  inputMode="decimal"
                  step={unit === "lb" ? 0.1 : 0.05}
                  value={startRaw}
                  onChange={(event) => {
                    setStartRaw(event.target.value);
                    setStartTouched(true);
                    setFormError(null);
                  }}
                  placeholder={unit === "lb" ? "e.g. 184.5" : "e.g. 83.7"}
                  aria-invalid={Boolean(formError)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="settings-goal" className="field-label">
                  Goal weight ({unit})
                </label>
                <input
                  id="settings-goal"
                  className="input"
                  type="number"
                  inputMode="decimal"
                  step={unit === "lb" ? 0.1 : 0.05}
                  value={goalRaw}
                  onChange={(event) => {
                    setGoalRaw(event.target.value);
                    setGoalTouched(true);
                    setFormError(null);
                  }}
                  placeholder={unit === "lb" ? "e.g. 150" : "e.g. 68"}
                  aria-invalid={Boolean(formError)}
                  required
                />
              </div>
            </div>

            {formError && (
              <p className="field-error mt-3" role="alert">
                {formError}
              </p>
            )}

            <div className="info-banner">
              <strong>How goal progress works.</strong> It compares the distance
              between your starting weight and your most recently recorded weight.
              It can move in either direction, which is completely normal.
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : "Save preferences"}
              </Button>
              <span className="text-[10px] text-[#98a79d]">
                Stored locally · no account needed
              </span>
            </div>
          </form>

          <hr className="my-6 border-[#edf1ec]" />

          <div>
            <h2 className="card-title">Your data</h2>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#92a197]">
              Save a copy of your records, restore a backup, or clear the dashboard
              when you want to begin again. Every export uses a native file dialog
              and writes a real file.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button onClick={exportCsv} disabled={dataBusy}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export CSV
              </Button>
              <Button onClick={exportBackup} disabled={dataBusy}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export backup (.json)
              </Button>
              <Button onClick={() => void handleImport()} disabled={dataBusy}>
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                {dataBusy ? "Working…" : "Import backup"}
              </Button>
              <Button variant="danger" onClick={() => void handleReset()} disabled={dataBusy}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Start fresh / reset
              </Button>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#e9eee9] bg-[#fafdfe] p-3.5 text-[10px] leading-relaxed text-[#84988b]">
              <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-[#8ca79a]" aria-hidden="true" />
              <span>
                {storageKind === "sqlite"
                  ? "Records are stored in a local SQLite database inside the app data folder. Nothing is uploaded."
                  : "Design preview: records are held in this browser. The installed desktop app uses local SQLite."}{" "}
                {recordCount} record{recordCount === 1 ? "" : "s"} currently saved.
                Clearing app data or this browser will remove unexported records.
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0f4ef] pt-4 text-[10px] text-[#a0aaa3]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Private by design · fully offline
              </span>
              <span>STEADY {appVersion()} · schema 1</span>
            </div>
          </div>
        </section>
      </div>

      {importIssue && (
        <Modal
          titleId="import-error-title"
          onClose={() => setImportIssue(null)}
        >
          <h2
            id="import-error-title"
            className="text-[21px] font-extrabold tracking-[-0.7px] text-ink"
          >
            This backup could not be imported
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-[#90a098]">
            <strong className="font-bold text-ink">{importIssue.file}</strong> failed
            validation. Your current records were not changed.
          </p>
          <ul className="mt-4 max-h-[240px] space-y-2 overflow-y-auto rounded-xl border border-[#f1dfd5] bg-[#fff8f4] p-3.5 text-[11px] leading-relaxed text-[#8f5a45]">
            {importIssue.errors.slice(0, 8).map((error) => (
              <li key={error} className="list-disc pl-1 marker:text-[#c18670]">
                {error}
              </li>
            ))}
          </ul>
          {importIssue.errors.length > 8 && (
            <p className="mt-2 text-[10px] text-[#9a7b6e]">
              {importIssue.errors.length - 8} more validation issue
              {importIssue.errors.length - 8 === 1 ? "" : "s"} not shown.
            </p>
          )}
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={() => setImportIssue(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
