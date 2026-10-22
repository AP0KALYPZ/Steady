# CODEX MASTER BUILD PROMPT — STEADY

You are a senior desktop application engineer, React/TypeScript developer, product designer, and QA lead. Build a complete, production-quality, offline-first Windows and macOS desktop application named **STEADY** from the files provided in this workspace. Work directly in this repository. Do not stop after producing a plan or mockup; implement, test, debug, and document the actual app.

## 1. Read these source-of-truth files first

- `STEADY_Desktop_UI_UX_Spec.md`: product requirements, design tokens, screen layouts, calculations, edge cases and accessibility rules.
- `STEADY_Interactive_Prototype.html`: interaction and visual reference. It is a browser demo, not a production codebase.
- `dashboard_preview.png`: desktop visual target.
- `README.md`: existing prototype notes.

Preserve the visual design of the supplied prototype as faithfully as practical: premium light theme; `#F5F7F4` canvas, white cards, `#18302B` text, `#146B54` primary green, quiet borders and shadows, compact yet readable charts, ~254px sidebar, smooth and responsive layout. Do not replace it with a generic dashboard. Port the interactions into modular React/TypeScript components rather than merely packaging the supplied monolithic HTML, and do not ship browser localStorage as the canonical datastore.

Where files differ, follow the written UI/UX specification for behavior, the screenshot and prototype for appearance. Document any deliberate departures.

## 2. Technology and constraints

- Tauri 2, React, TypeScript, Vite, Tailwind CSS, shadcn/ui-style accessible components, Lucide icons, Recharts (or an equally polished lightweight SVG charting library).
- SQLite with Tauri's official SQL plugin; database stored in the platform-specific app data directory. Use schema migrations, typed repository functions, and transaction-safe writes.
- Vitest for calculation/service tests; React Testing Library for interactions; Playwright for browser-based UI smoke tests where practical; native Tauri smoke/build validation on supported runners.
- Production bundles for Windows (.exe via NSIS, optionally .msi) and macOS (.dmg; Intel and Apple Silicon). Use GitHub Actions runners for macOS builds; do not try to create a true macOS .dmg by cross-compiling directly on Windows.
- Runs fully offline; no login, API keys, cloud dependency, account creation, trackers, telemetry, ads, or network service required. Keep native permissions minimal.
- Works smoothly with ordinary CPU/integrated graphics; no GPU-intensive effects.
- Do not invent the user's weight, meals, calorie values, macros, targets, or historical data. Allow **clearly labeled** optional demo data for preview only, but start a real user with an empty history/setup flow.

## 3. Product screens and behavior

Build ALL six screens: **Overview**, **Daily Journal**, **Weight Progress**, **Meal Routine**, **Insights**, and **Settings**, with a common sidebar and top bar. Match layouts and detailed specifications in the reference file.

- **Onboarding/settings**: starting weight, target weight, preferred unit (lb/kg), and optional date. Save and edit. Store weights canonically in kilograms while converting values on input/output correctly; show selected units everywhere. Validate positive finite weights and ensure a weight-loss target below the starting weight.
- **Weight logging**: one weight per local calendar date (`YYYY-MM-DD`), with add/edit/delete and deletion confirmation; historical dates supported, future dates blocked. Default log dialog to today. Every edit updates charts and all related KPIs. Leave missing dates missing, never interpolate measurements or treat them as zero.
- **Meals**: the user defines ONE specific recurring carnivore meal to eat twice per day, with an option to configure a separate meal for Meal 2. Allow a title, ingredients/portions, optional per-serving calories, protein and fat. One-tap mark/unmark for each of two meal slots on the daily check-in and journal. Do not assume or synthesize macros. Snapshot template description/macros into meal log entries so changing the template later cannot rewrite history. Store separate completed-at timestamp when available.
- **Off-plan/cheat meals**: explicit three-state journal field: not recorded / stayed on plan / had an off-plan meal. Off-plan status is NOT inferred from which routine meals were logged and never automatically deletes or modifies other records. Allow updating/clearing retroactively; use calm, nonjudgmental copy.
- **Journal**: date navigation, notes persisted per date, history navigation, ability to edit past entries, helpful empty states.
- **Overview**: four high-quality metric cards, 30/60/90-day weight trend chart, seven-day average, today's two-meal check-in, off-plan control, start-to-goal progress, four-week consistency heatmap, concise insights.
- **Weight Progress**: 30/60/90/all chart ranges, raw weights and seven-calendar-day moving average, history list with edit/delete, start/current/total change and transparent missing-data messaging.
- **Insights**: 7-day/30-day meal tracking, off-plan count with recorded-status denominator, 30-day weigh-in count, week-over-week average, goal progress, and weekly chart. Include neutral caveats about normal daily weight fluctuations and unlogged days.
- **Settings and data ownership**: editable profile/goal/units/templates, CSV export, JSON full backup and validated JSON restore, irreversible reset behind confirmation. Exports and imports must be handled through native file dialogs and real files. Include a schema version in backups and meaningful validation error messages. Never destroy current data when an import fails validation.

## 4. Analytics rules (must be thoroughly unit-tested)

- Store weights in one canonical unit and display converted values, without rounding stored source values every time the user changes units.
- The seven-day rolling average uses recorded weigh-ins in the trailing **seven calendar days** ending on that date, rather than simply taking the last seven measurements.
- Seven-day versus previous-seven-day comparisons require at least THREE readings in each window or display a helpful `—` state.
- The 30-day change compares first versus last actual weigh-ins in that 30-calendar-day window and requires at least two data points.
- Goal percentage is `(startWeight - currentWeight) / (startWeight - goalWeight)`, clamped to 0–100%, and only shown with valid start/goal/current values.
- Meal tracking consistency should not present missing or unrecorded days as cheating or skipped meals. When showing a percentage, provide the actual numerator and denominator, following the spec's recorded-day semantics.
- An unrecorded off-plan value must NEVER silently count as on-plan.
- Handle empty databases, single weigh-in, weeks with sparse data, same-day edits, month/year boundaries, daylight saving transitions, leap days and timezone-local dates.
- Never display an invented date when the user will reach their goal.

## 5. Engineering quality

Use a maintainable source layout: `src/components`, `src/pages`, `src/features`, `src/db`, `src/lib/analytics`, `src/hooks`, `src/types`, `src/styles`, `src-tauri`, `tests`, and `.github/workflows`. Clearly separate persistence from data calculations and presentation. Use accessible modal focus management, keyboard navigation, visible focus rings, reduced-motion support, inline input validation, readable tooltips and accessible chart summaries. Avoid visual overflow at 1280x800, 1440x900 and wide 1920px monitors. Ensure no dead buttons, placeholders advertised as complete, console errors or silent save failures. Use formatted code, linting, sensible error handling and tests. Provide meaningful user-facing feedback on saves, imports and errors.

## 6. Build in four complete milestones

**Milestone 1 — Scaffold and polished desktop UI**: initialize Tauri 2 + React/TS/Vite; implement design tokens, layout, routing, all six faithfully styled pages, reusable components and real typed application state. Verify the frontend runs. Commit as `feat: scaffold STEADY desktop UI`.

**Milestone 2 — Durable SQLite data and daily logging**: migrations, repositories, settings, onboarding, meal templates, two meal logs per date, three-state off-plan control, notes, weigh-ins, edit/delete, persistent local data, properly synchronized UI. Include data-layer and interaction tests. Commit as `feat: add persistent journal and meal tracking`.

**Milestone 3 — Analytics and full data ownership**: charts, all statistics, heatmaps, trend calculations, goal tracker, metric edge cases, CSV exports, JSON backup/import, test coverage with deterministic fixtures. Commit as `feat: implement progress analytics and backups`.

**Milestone 4 — QA, polish, desktop packaging and CI**: tune the UI to match reference screenshots; fix responsiveness, accessibility and keyboard interactions; run full available test suite, lint and builds; document installation/development. Add a GitHub Actions workflow building actual Windows NSIS installer and macOS DMGs (Intel + Apple Silicon) on matching native runners, uploaded as workflow artifacts. Do not require signing credentials to run CI; clearly document signing/notarization limitations for publicly distributed releases. Commit as `build: package STEADY for Windows and macOS`.

After each milestone: run relevant checks, fix any errors that you can reproduce, commit files, and push to the configured origin if one exists and credentials are available. If no remote exists, do NOT silently create a public repository. Explain the manual commands to create/connect a repository or ask for authorization when necessary, then keep developing locally. Do not block implementation on a missing GitHub connection, signing certificates or a platform unavailable on the current machine.

## 7. Final acceptance criteria

1. The app starts in a clean real-user state, allows goals and a meal template to be configured, and requires no account.
2. Logging Meal 1, Meal 2 and today's off-plan status takes only a few clicks. Restarting the app preserves records in SQLite.
3. Adding/editing/deleting today's or an earlier date's weight instantly and correctly updates every chart/metric.
4. Blank days are neither invented nor counted as cheating; all weights and change calculations use real entries.
5. Unit switching preserves exact underlying values; meal template edits preserve historical log snapshots.
6. CSV export and JSON backup/restore work using actual native file dialogs, including error handling and overwrite confirmation.
7. All six sections are complete, navigation works with a mouse and keyboard, and the layout closely matches the supplied image/prototype.
8. Automated analytics tests pass; Windows production packaging succeeds on Windows; macOS CI is configured and verified by running on macOS GitHub runners where possible. Don't claim a platform build was verified unless it actually ran.

## 8. Your execution protocol

First inspect the reference assets and repository, then briefly state the architecture and first actions; immediately start implementing without waiting for confirmation. Install project dependencies as needed. Work through all four milestones in order. Whenever a build/test is possible, run it and correct failures. When a test or platform build cannot be run here, be explicit about why and how it will be validated in CI. At the end, report: implemented features, test results, any limitations, exact local Windows development commands, GitHub Actions workflow usage, and the paths/names of generated installer artifacts (only if they were actually built).
