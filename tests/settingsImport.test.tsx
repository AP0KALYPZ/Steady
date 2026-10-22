import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderApp, resetAppState } from "./helpers/renderApp";
import { makeSnapshot, note, weighIn } from "./fixtures";
import { serializeBackup } from "../src/lib/backup";
import { openTextFile, saveTextFile } from "../src/lib/fileIO";

vi.mock("../src/lib/fileIO", () => ({
  openTextFile: vi.fn(),
  saveTextFile: vi.fn(),
}));

const mockedOpen = vi.mocked(openTextFile);
const mockedSave = vi.mocked(saveTextFile);

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "#/overview";
  mockedOpen.mockReset();
  mockedSave.mockReset();
});

afterEach(() => {
  resetAppState();
});

async function openSettings() {
  const { user, repo } = renderApp(makeSnapshot());
  await screen.findByRole("heading", { name: "Small steps. Real progress." });
  await user.click(screen.getByRole("link", { name: "Settings" }));
  await screen.findByRole("heading", { name: "Settings" });
  return { user, repo };
}

describe("backup import through the UI", () => {
  it("shows validation errors and leaves current records untouched", async () => {
    const { user, repo } = await openSettings();
    mockedOpen.mockResolvedValue({ name: "broken.json", text: "{oops" });

    await user.click(screen.getByRole("button", { name: "Import backup" }));
    const dialog = await screen.findByRole("dialog", {
      name: /This backup could not be imported/i,
    });
    expect(
      dialog.textContent,
    ).toContain("Your current records were not changed.");

    await user.click(screen.getByRole("button", { name: "Close" }));
    const snapshot = await repo.load();
    expect(snapshot.weighIns).toEqual([]);
    expect(snapshot.settings.onboarded).toBe(true);
  });

  it("confirms, replaces, and reports a successful restore", async () => {
    const { user, repo } = await openSettings();
    const imported = makeSnapshot({
      weighIns: [weighIn("2026-02-01", 198)],
      notes: [note("2026-02-01", "Restored note")],
    });
    mockedOpen.mockResolvedValue({
      name: "steady-backup.json",
      text: serializeBackup(imported, "1.0.0"),
    });

    await user.click(screen.getByRole("button", { name: "Import backup" }));
    const confirm = await screen.findByRole("dialog", {
      name: /Replace all current records/i,
    });
    expect(confirm.textContent).toContain("1 weigh-in");
    await user.click(screen.getByRole("button", { name: "Replace records" }));

    await screen.findByText(/Backup restored/i);
    const snapshot = await repo.load();
    expect(snapshot.weighIns).toHaveLength(1);
    expect(snapshot.weighIns[0].date).toBe("2026-02-01");
    expect(snapshot.notes[0].body).toBe("Restored note");
  });

  it("cancels without replacing anything", async () => {
    const { user, repo } = await openSettings();
    await repo.upsertWeighIn("2026-01-01", 80);
    mockedOpen.mockResolvedValue({
      name: "steady-backup.json",
      text: serializeBackup(
        makeSnapshot({ weighIns: [weighIn("2026-02-01", 198)] }),
        "1.0.0",
      ),
    });

    await user.click(screen.getByRole("button", { name: "Import backup" }));
    await screen.findByRole("dialog", { name: /Replace all current records/i });
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Replace all current records/i }),
      ).not.toBeInTheDocument();
    });
    const snapshot = await repo.load();
    expect(snapshot.weighIns.map((entry) => entry.date)).toEqual([
      "2026-01-01",
    ]);
  });
});

describe("CSV export through the UI", () => {
  it("writes the current records through the native save path", async () => {
    mockedSave.mockResolvedValue({ saved: true, path: "C:/tmp/steady.csv" });
    const { user } = renderApp(
      makeSnapshot({
        weighIns: [weighIn("2026-02-01", 198)],
      }),
    );
    await screen.findByRole("heading", { name: "Small steps. Real progress." });

    await user.click(screen.getByRole("button", { name: "Export" }));
    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));

    const [contents, filename, filter] = mockedSave.mock.calls[0];
    expect(filename).toMatch(/^steady-progress-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(filter.extensions).toEqual(["csv"]);
    expect(contents).toContain('"Date","Weight (lb)"');
    expect(contents).toContain('"2026-02-01"');
  });
});
