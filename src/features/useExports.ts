import { useCallback } from "react";
import { useAppData } from "../hooks/useAppData";
import { useToday } from "../hooks/useToday";
import { useToast } from "../components/ui/Toast";
import { appVersion } from "../lib/platform";
import { backupFilename, buildCsv, csvFilename } from "../lib/csv";
import { serializeBackup } from "../lib/backup";
import { saveTextFile } from "../lib/fileIO";

export function useExports() {
  const { snapshot } = useAppData();
  const { showToast } = useToast();
  const today = useToday();

  const exportCsv = useCallback(async () => {
    if (!snapshot) return;
    try {
      const result = await saveTextFile(buildCsv(snapshot), csvFilename(today), {
        name: "CSV spreadsheet",
        extensions: ["csv"],
        mime: "text/csv;charset=utf-8",
      });
      if (result.saved) {
        showToast("CSV exported — every recorded date is included.");
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? `CSV export failed: ${error.message}`
          : "CSV export failed.",
        "error",
      );
    }
  }, [snapshot, today, showToast]);

  const exportBackup = useCallback(async () => {
    if (!snapshot) return;
    try {
      const result = await saveTextFile(
        serializeBackup(snapshot, appVersion()),
        backupFilename(today),
        {
          name: "STEADY backup",
          extensions: ["json"],
          mime: "application/json",
        },
      );
      if (result.saved) {
        showToast("Backup exported. Keep it somewhere safe.");
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? `Backup export failed: ${error.message}`
          : "Backup export failed.",
        "error",
      );
    }
  }, [snapshot, today, showToast]);

  return { exportCsv, exportBackup };
}
