import { useState, type FormEvent } from "react";
import { NotebookPen } from "lucide-react";
import { useAppData } from "../../hooks/useAppData";
import { formatMediumDateWithYear } from "../../lib/dates";
import { useToast } from "../ui/Toast";
import { useDialogs } from "./DialogProvider";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

interface NoteDialogProps {
  date: string;
  onClose(): void;
}

export function NoteDialog({ date, onClose }: NoteDialogProps) {
  const { snapshot, actions } = useAppData();
  const { showToast } = useToast();
  const { confirm } = useDialogs();
  const existing = snapshot?.notes.find((note) => note.date === date);
  const [body, setBody] = useState(existing?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await actions.saveNote(date, body);
      showToast(body.trim() ? "Note saved" : "Note removed");
      onClose();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "The note could not be saved.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    const confirmed = await confirm({
      title: "Remove this note?",
      description: `${formatMediumDateWithYear(date)} will keep its weight, meals and off-plan status. Only the note is removed.`,
      confirmLabel: "Remove note",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      await actions.saveNote(date, null);
      showToast("Note removed");
      onClose();
    } catch (clearError) {
      showToast(
        clearError instanceof Error ? clearError.message : "The note could not be removed.",
        "error",
      );
    }
  };

  return (
    <Modal
      titleId="note-dialog-title"
      descriptionId="note-dialog-description"
      onClose={onClose}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-forest">
          <NotebookPen className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2
            id="note-dialog-title"
            className="text-[21px] font-extrabold tracking-[-0.7px] text-ink"
          >
            Daily note
          </h2>
          <p
            id="note-dialog-description"
            className="mt-1.5 text-[12px] leading-relaxed text-[#90a098]"
          >
            Anything helpful about {formatMediumDateWithYear(date)}. Notes are
            optional and stay on this device.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5">
        <div className="field">
          <label htmlFor="note-body" className="field-label">
            What would you like to remember?
          </label>
          <textarea
            id="note-body"
            className="input"
            maxLength={2000}
            rows={5}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setError(null);
            }}
            placeholder="Energy, hunger, sleep, an unusual day, or anything else…"
            data-autofocus
          />
          <p className="field-hint">{body.length} / 2000 characters</p>
        </div>

        {error && (
          <p className="field-error mt-3" role="alert">
            {error}
          </p>
        )}

        <div className="mt-[22px] flex flex-wrap justify-end gap-2.5">
          {existing && (
            <Button
              variant="danger"
              onClick={handleClear}
              disabled={saving}
              className="mr-auto"
            >
              Remove note
            </Button>
          )}
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save note"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
