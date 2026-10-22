import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;

interface Capability {
  identifier: string;
  windows: string[];
  permissions: string[];
}

interface TauriConfig {
  productName: string;
  identifier: string;
  build: { frontendDist: string };
  app: {
    windows: {
      label: string;
      title: string;
      maximized: boolean;
      fullscreen: boolean;
      decorations: boolean;
    }[];
  };
  bundle: { active: boolean; icon: string[]; targets: string };
}

describe("Tauri desktop configuration", () => {
  const rawCapabilities = readJson<Capability | Capability[]>(
    "src-tauri/capabilities/default.json",
  );
  const capabilities = Array.isArray(rawCapabilities)
    ? rawCapabilities
    : [rawCapabilities];
  const config = readJson<TauriConfig>("src-tauri/tauri.conf.json");

  it("opens maximized with native window controls", () => {
    expect(capabilities).toHaveLength(1);
    expect(capabilities[0].windows).toEqual(["main"]);
    expect(config.app.windows[0].label).toBe("main");
    expect(config.app.windows[0].title).toContain("STEADY");
    expect(config.app.windows[0].maximized).toBe(true);
    // True fullscreen hides the native title bar, leaving no visible close or
    // resize controls. Stay decorated and maximized instead.
    expect(config.app.windows[0].fullscreen).toBe(false);
    expect(config.app.windows[0].decorations).toBe(true);
  });

  it("grants SQL writes as well as the plugin's read-only defaults", () => {
    const permissions = capabilities[0].permissions;
    expect(permissions).toContain("sql:default");
    // `sql:default` only allows load/select/close. Migrations and every
    // check-in use `execute`, which must be granted explicitly.
    expect(permissions).toContain("sql:allow-execute");
    expect(permissions).toContain("dialog:default");
  });

  it("does not expose a broad filesystem scope", () => {
    const permissions = capabilities[0].permissions;
    expect(permissions.some((permission) => permission.startsWith("fs:"))).toBe(
      false,
    );
  });

  it("ships the production frontend and every declared icon", () => {
    expect(config.build.frontendDist).toBe("../dist");
    expect(config.bundle.active).toBe(true);
    expect(config.identifier).toBe("com.steady.progress");
    expect(config.bundle.icon.length).toBeGreaterThan(0);
    for (const icon of config.bundle.icon) {
      expect(existsSync(resolve(root, "src-tauri", icon))).toBe(true);
    }
  });
});
