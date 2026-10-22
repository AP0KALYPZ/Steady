/**
 * The packaged desktop app always runs inside Tauri. The Vite dev server can
 * also be opened in a normal browser for design review; that mode uses the
 * development-only browser repository, never a network service.
 */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  const candidate = window as unknown as Record<string, unknown>;
  return "__TAURI_INTERNALS__" in candidate || "__TAURI__" in candidate;
}

export function appVersion(): string {
  return "1.0.0";
}
