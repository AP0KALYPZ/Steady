import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, screen, within, waitFor } from "@testing-library/react";
import { addDays, todayKey } from "../src/lib/dates";
import { toKilograms } from "../src/lib/units";
import { createDefaultSnapshot } from "../src/types";
import { makeSnapshot, weighIn } from "./fixtures";
import { renderApp, resetAppState } from "./helpers/renderApp";

const today = todayKey();
const yesterday = addDays(today, -1);

function baseSnapshot() {
  return makeSnapshot({
    weighIns: [weighIn(yesterday, 180)],
  });
}

async function openOverview() {
  return screen.findByRole("heading", { name: "Small steps. Real progress." });
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "#/overview";
});

afterEach(() => {
  resetAppState();
});

describe("daily tracking", () => {
  it("logs and unlogs both meals without inferring an off-plan status", async () => {
    const { user, repo } = renderApp(baseSnapshot());
    await openOverview();

    expect(
      screen.getByText(/Not recorded · no judgment, just data/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Meal 1: not logged, activate to log/i }),
    );
    await screen.findByRole("button", {
      name: /Meal 1: logged, activate to undo/i,
    });
    expect((await repo.load()).meals).toHaveLength(1);

    await user.click(
      screen.getByRole("button", { name: /Meal 2: not logged, activate to log/i }),
    );
    await screen.findByText("Both meals checked in");
    expect((await repo.load()).meals).toHaveLength(2);

    // Meal logging alone must never mark the day off-plan or on-plan.
    expect((await repo.load()).offPlanDays).toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: /having an off-plan meal/i }),
    );
    await screen.findByText(/Off-plan recorded/i);
    expect((await repo.load()).offPlanDays[0].status).toBe("off");

    // Tapping the active answer clears the explicit status.
    await user.click(
      screen.getByRole("button", { name: /having an off-plan meal/i }),
    );
    await screen.findByText(/Not recorded · no judgment, just data/i);
    expect((await repo.load()).offPlanDays).toEqual([]);
  });

  it("records a weigh-in and instantly updates the dashboard", async () => {
    const { user, repo } = renderApp(baseSnapshot());
    await openOverview();

    await user.click(screen.getAllByRole("button", { name: "Log weight" })[0]);
    const dialog = await screen.findByRole("dialog", {
      name: /Log your weight/i,
    });

    await user.click(within(dialog).getByRole("button", { name: "Save weigh-in" }));
    expect(
      await screen.findByText("Enter a weight to continue."),
    ).toBeInTheDocument();

    await user.type(
      within(dialog).getByLabelText(/Weight \(lb\)/i),
      "175.1",
    );
    await user.click(within(dialog).getByRole("button", { name: "Save weigh-in" }));

    await screen.findByText(/Weight saved for/i);
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Log your weight/i }),
      ).not.toBeInTheDocument();
    });

    const current = screen.getByRole("region", { name: "Current weight" });
    expect(within(current).getByText("175.1")).toBeInTheDocument();
    const saved = await repo.load();
    const entry = saved.weighIns.find((item) => item.date === today);
    expect(entry?.weightKg).toBeCloseTo(toKilograms(175.1, "lb"), 9);
  });

  it("edits a historical weigh-in with keyboard dismissal and focus restoration", async () => {
    const { user, repo } = renderApp(baseSnapshot(), "/journal");
    await screen.findByRole("heading", { name: "Daily journal" });

    await user.click(screen.getByRole("button", { name: "Previous day" }));
    await screen.findByText(/Yesterday/i);
    await user.click(screen.getByRole("button", { name: "Edit weigh-in" }));

    const dialog = await screen.findByRole("dialog", {
      name: /Edit your weigh-in/i,
    });
    const input = within(dialog).getByLabelText(/Weight \(lb\)/i);
    expect(input).toHaveValue(180);

    await user.clear(input);
    await user.type(input, "179.2");
    await user.click(
      within(dialog).getByRole("button", { name: "Update weigh-in" }),
    );
    await screen.findByText(/Weigh-in updated for/i);

    const saved = await repo.load();
    expect(saved.weighIns.find((item) => item.date === yesterday)?.weightKg).toBeCloseTo(
      toKilograms(179.2, "lb"),
      9,
    );
  });

  it("navigates the journal, blocks future dates, and persists notes", async () => {
    const { user, repo } = renderApp(baseSnapshot());
    await openOverview();
    await user.click(screen.getByRole("link", { name: "Daily journal" }));
    await screen.findByRole("heading", { name: "Daily journal" });

    expect(screen.getByRole("button", { name: "Next day" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Previous day" }));
    expect(await screen.findByText(/Yesterday/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next day" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /Add note/i }));
    await user.type(
      screen.getByLabelText(/What would you like to remember/i),
      "Good energy after two simple meals.",
    );
    await user.click(screen.getByRole("button", { name: "Save note" }));
    await screen.findByText("Good energy after two simple meals.");

    const notes = (await repo.load()).notes;
    expect(notes).toHaveLength(1);
    expect(notes[0].date).toBe(yesterday);
    expect(window.location.hash).toContain(`date=${yesterday}`);
  });

  it("shows honest empty states rather than fabricated analytics", async () => {
    renderApp(makeSnapshot({ weighIns: [] }));
    await openOverview();

    expect(screen.getByText("Add your first weigh-in")).toBeInTheDocument();
    expect(
      screen.getByText("Your story starts with a weigh-in"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Your destination" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(2);
  });
});

describe("onboarding", () => {
  it("collects a goal and recurring meal on first launch", async () => {
    const { user, repo } = renderApp(createDefaultSnapshot());
    const dialog = await screen.findByRole("dialog", {
      name: /Set your direction/i,
    });

    const start = within(dialog).getByLabelText(/^Starting weight/i);
    const goal = within(dialog).getByLabelText(/^Goal weight/i);
    fireEvent.change(start, { target: { value: "184.5" } });
    fireEvent.change(goal, { target: { value: "150" } });
    expect(start).toHaveValue(184.5);
    await user.click(within(dialog).getByRole("button", { name: "Continue" }));

    const routine = await screen.findByRole("dialog", {
      name: /Define your routine/i,
    });
    await user.type(
      within(routine).getByLabelText(/Your recurring meal/i),
      "Beef, eggs and cheddar",
    );
    await user.click(
      within(routine).getByRole("button", { name: "Finish setup" }),
    );

    await screen.findByText(/You're set up/i);
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Define your routine/i }),
      ).not.toBeInTheDocument();
    });

    const saved = await repo.load();
    expect(saved.settings.onboarded).toBe(true);
    expect(saved.settings.startWeightKg).toBeCloseTo(
      toKilograms(184.5, "lb"),
      9,
    );
    expect(saved.settings.goalWeightKg).toBeCloseTo(
      toKilograms(150, "lb"),
      9,
    );
    expect(saved.templates[0].name).toBe("Beef, eggs and cheddar");
  });
});

describe("settings", () => {
  it("switches units for display while preserving exact stored kilograms", async () => {
    const startKg = 83.687792265;
    const goalKg = 68.0388555;
    const { user, repo } = renderApp(
      makeSnapshot({
        settings: {
          ...makeSnapshot().settings,
          unit: "lb",
          startWeightKg: startKg,
          goalWeightKg: goalKg,
        },
      }),
    );
    await openOverview();
    await user.click(screen.getByRole("link", { name: "Settings" }));
    await screen.findByRole("heading", { name: "Settings" });

    await user.click(screen.getByRole("button", { name: "Kilograms (kg)" }));
    expect(screen.getByLabelText(/Starting weight \(kg\)/i)).toHaveValue(83.7);
    expect(screen.getByLabelText(/Goal weight \(kg\)/i)).toHaveValue(68);

    await user.click(screen.getByRole("button", { name: "Save preferences" }));
    await screen.findByText("Preferences saved");

    const saved = await repo.load();
    expect(saved.settings.unit).toBe("kg");
    expect(saved.settings.startWeightKg).toBe(startKg);
    expect(saved.settings.goalWeightKg).toBe(goalKg);
  });

  it("validates that a goal is below the starting weight", async () => {
    const { user, repo } = renderApp(baseSnapshot());
    await openOverview();
    await user.click(screen.getByRole("link", { name: "Settings" }));
    await screen.findByRole("heading", { name: "Settings" });

    const start = screen.getByLabelText(/^Starting weight/i);
    const goal = screen.getByLabelText(/^Goal weight/i);
    fireEvent.change(start, { target: { value: "60" } });
    fireEvent.change(goal, { target: { value: "68" } });
    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(
      await screen.findByText("Your goal must be below your starting weight."),
    ).toBeInTheDocument();
    expect((await repo.load()).settings.startWeightKg).toBeCloseTo(
      toKilograms(184.5, "lb"),
      9,
    );
  });
});
