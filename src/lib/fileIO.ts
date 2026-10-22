import { isTauri } from "./platform";

export interface SaveFileResult {
  saved: boolean;
  path?: string;
}

export interface PickedTextFile {
  name: string;
  text: string;
}

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

function downloadInBrowser(contents: string, filename: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Native save dialog plus a real file write. The write goes through a narrow
 * Rust command so the app needs no broad filesystem permission. In the browser
 * design preview this falls back to a normal download; the packaged app never
 * does.
 */
export async function saveTextFile(
  contents: string,
  filename: string,
  filter: { name: string; extensions: string[]; mime: string },
): Promise<SaveFileResult> {
  if (!isTauri()) {
    downloadInBrowser(contents, filename, filter.mime);
    return { saved: true };
  }
  const [{ save }, { invoke }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/api/core"),
  ]);
  const path = await save({
    title: "Save STEADY file",
    defaultPath: filename,
    filters: [{ name: filter.name, extensions: filter.extensions }],
  });
  if (!path) return { saved: false };
  await invoke("write_text_file", { path, contents });
  return { saved: true, path };
}

/**
 * Native open dialog plus a real file read. Returns null when the user cancels
 * or the file is too large. Parsing/validation happens in the caller.
 */
export async function openTextFile(filter: {
  name: string;
  extensions: string[];
}): Promise<PickedTextFile | null> {
  if (!isTauri()) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = filter.extensions.map((extension) => `.${extension}`).join(",");
      input.style.display = "none";
      const cleanup = () => input.remove();
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
          cleanup();
          resolve(null);
          return;
        }
        if (file.size > MAX_IMPORT_BYTES) {
          cleanup();
          resolve(null);
          return;
        }
        try {
          const text = await file.text();
          resolve({ name: file.name, text });
        } finally {
          cleanup();
        }
      });
      input.addEventListener("cancel", () => {
        cleanup();
        resolve(null);
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  const [{ open }, { invoke }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/api/core"),
  ]);
  const selected = await open({
    title: "Open STEADY backup",
    multiple: false,
    directory: false,
    filters: [{ name: filter.name, extensions: filter.extensions }],
  });
  if (!selected || Array.isArray(selected)) return null;

  const size = await invoke<number>("file_size", { path: selected });
  if (size > MAX_IMPORT_BYTES) {
    throw new Error("That file is larger than 10 MB and cannot be a STEADY backup.");
  }
  const text = await invoke<string>("read_text_file", { path: selected });
  const name = selected.split(/[\\/]/).pop() ?? "steady-backup.json";
  return { name, text };
}
