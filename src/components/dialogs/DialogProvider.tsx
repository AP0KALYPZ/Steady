import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MealSlot } from "../../types";
import { ConfirmDialog, type ConfirmOptions } from "./ConfirmDialog";
import { WeightDialog } from "./WeightDialog";
import { MealTemplateDialog } from "./MealTemplateDialog";
import { NoteDialog } from "./NoteDialog";

interface DialogApi {
  openWeight(date: string): void;
  openMealTemplate(slot: MealSlot): void;
  openNote(date: string): void;
  confirm(options: ConfirmOptions): Promise<boolean>;
}

const DialogContext = createContext<DialogApi | null>(null);

interface ConfirmState {
  options: ConfirmOptions;
  resolve(value: boolean): void;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [weightDate, setWeightDate] = useState<string | null>(null);
  const [mealSlot, setMealSlot] = useState<MealSlot | null>(null);
  const [noteDate, setNoteDate] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ options, resolve });
      }),
    [],
  );

  const resolveConfirm = useCallback(
    (value: boolean) => {
      setConfirmState((current) => {
        current?.resolve(value);
        return null;
      });
    },
    [],
  );

  const value = useMemo<DialogApi>(
    () => ({
      openWeight: (date) => setWeightDate(date),
      openMealTemplate: (slot) => setMealSlot(slot),
      openNote: (date) => setNoteDate(date),
      confirm,
    }),
    [confirm],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {confirmState ? (
        <ConfirmDialog options={confirmState.options} onResolve={resolveConfirm} />
      ) : (
        <>
          {weightDate && (
            <WeightDialog
              initialDate={weightDate}
              onClose={() => setWeightDate(null)}
            />
          )}
          {mealSlot && (
            <MealTemplateDialog
              slot={mealSlot}
              onClose={() => setMealSlot(null)}
            />
          )}
          {noteDate && (
            <NoteDialog date={noteDate} onClose={() => setNoteDate(null)} />
          )}
        </>
      )}
    </DialogContext.Provider>
  );
}

export function useDialogs(): DialogApi {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useDialogs must be used inside DialogProvider.");
  return context;
}
