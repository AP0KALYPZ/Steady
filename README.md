# STEADY — Progress Studio

STEADY is a private, offline-first weight-loss desktop application for Windows and macOS. It is built around one recurring carnivore meal eaten twice a day, two explicit daily meal check-ins, an independent off-plan/cheat-meal status, optional weigh-ins, daily notes, and honest progress analytics.

It is a native desktop app: **Tauri 2 + React 19 + TypeScript + Vite + Tailwind CSS + Recharts + SQLite**. There is no account, cloud dependency, telemetry, analytics, tracking, advertising, or network service. All records live in a local SQLite database.

## What is included

### Overview
- Four transparent KPIs: current weight, 30-day change, weekly trend, and 7-day meal tracking.
- 30/60/90-day weight chart with raw weigh-ins, a seven-calendar-day rolling average, exact hover values, and an accessible summary.
- Today's two one-tap meal check-ins and an independent **No / Yes** off-plan control. Both start unselected when nothing has been recorded.
- Goal destination with clamped progress, a four-week Monday–Sunday consistency heatmap, and neutral at-a-glance insights.

### Daily journal
- Date navigation with the future blocked, plus a clickable last-14-days strip.
- Both meal servings with logged-at times, editable off-plan status, optional weigh-in, and a persistent daily note.
- Historical edits immediately recalculate every related chart and statistic.

### Weight progress
- 30/60/90/all-time charts with daily weights and the seven-calendar-day rolling average.
- Searchable, sortable weigh-in history with per-entry editing and confirmed deletion.
- Starting weight, latest weight, and total change; missing days are never interpolated.

### Meal routine
- Define one recurring meal used for both servings, with an optional independent Meal 2.
- Title, ingredients/portions, and optional per-serving calories, protein, and fat. Nutrition is never estimated.
- Each logged serving stores a snapshot of the recipe, so editing a template never rewrites history.

### Insights
- 7- and 30-day meal logging with explicit numerators and denominators.
- Off-plan count with the number of days that actually have a status.
- 30-day weigh-in count, seven-day average comparison with a minimum-data rule, and goal completion.
- Four rolling seven-day meal-log bars, plus caveats about normal weight fluctuation and unlogged days.

### Settings and data ownership
- Starting weight, goal weight, and lb/kg switching. Weights are stored canonically in kilograms; changing units never mutates recorded measurements.
- CSV export, versioned JSON full backup, validated JSON restore, and a confirmed full reset.
- Native save/open dialogs and real file writes. Imports are fully validated before any write; a failed write restores the previous snapshot.

## Analytics rules

These rules are implemented in pure functions under [`src/lib/analytics`](src/lib/analytics) and covered by tests.

- **Seven-day rolling average** uses recorded weigh-ins in the trailing seven **calendar** days, not the last seven measurements. Long gaps produce no average instead of borrowing old data.
- **Weekly trend** compares the current seven days with the previous seven and returns `—` unless each window has at least three readings.
- **30-day change** uses the first and last actual weigh-ins inside the 30-calendar-day window and needs at least two entries.
- **Goal progress** is `(start − current) / (start − goal)`, clamped to 0–100%, and only shown with valid start, goal, and current values. The goal must be below the starting weight.
- **Meal tracking** counts two scheduled servings only on days with at least one explicit meal record. Unlogged days are excluded, never treated as missed meals or cheating. Percentages always have a visible numerator and denominator.
- **Off-plan** is a separate explicit status. Absence of a status is never counted as on-plan.
- **No projected goal date** is shown; short-term scale noise makes one untrustworthy.
- Weights are never fabricated, interpolated, or treated as zero.

## Privacy and storage

No network requests are made by the application. The only external integrations are the operating system's native file dialogs.

The SQLite database `steady.db` is created by the official Tauri SQL plugin in the platform-specific app data directory:

| Platform | Database location |
|---|---|
| Windows | `%APPDATA%\com.steady.progress\steady.db` |
| macOS | `~/Library/Application Support/com.steady.progress/steady.db` |
| Linux (development) | `~/.config/com.steady.progress/steady.db` |

Exports and backups are written only to paths the user chooses. Imported backups are validated in memory before any record is touched. Backups include a schema version; newer schemas are rejected with an actionable message.

## Development

### Prerequisites

- Node.js 22 or newer and npm
- Rust stable (1.77.2 or newer)
- Platform prerequisites for Tauri 2:
  - **Windows:** Microsoft C++ Build Tools (Desktop development with C++) and WebView2 (preinstalled on Windows 10/11).
  - **macOS:** Xcode Command Line Tools.
  - **Linux:** WebKitGTK and related Tauri development packages (desktop targets are Windows/macOS; Linux is useful only for development).

### Install and run

```bash
npm ci
npm run tauri dev
```

The web UI alone can be reviewed with `npm run dev` at `http://127.0.0.1:5173`. That mode uses a clearly labelled browser-only development adapter; the packaged desktop app always uses SQLite.

### Checks

```bash
npm run lint
npm test
npm run build
```

`npm test` runs Vitest with jsdom interaction tests and `node:sqlite` repository tests against the real migration and SQL statements. It uses Node's experimental SQLite module and is intentionally invoked with `--experimental-sqlite`.

### Native builds locally

```bash
# Windows: NSIS installer (unsigned)
npm run tauri build -- --bundles nsis
# -> src-tauri\target\release\bundle\nsis\STEADY_1.0.0_x64-setup.exe

# macOS: DMG (unsigned; suitable for local testing)
npm run tauri build -- --bundles dmg
# -> src-tauri/target/release/bundle/dmg/STEADY_1.0.0_<arch>.dmg
```

Windows `.msi` (WiX) can be produced with `--bundles msi` when WiX is available. The default bundle config builds all native targets for the current platform.

### CI installers

[`.github/workflows/build.yml`](.github/workflows/build.yml) runs lint, all tests, and the web build on every pull request. On manual runs and `v*` tags it also builds and uploads:

- `steady-windows-x64` — NSIS `.exe` from `windows-latest`.
- `steady-macos-intel` — `.dmg` from `macos-15-intel` (x86_64).
- `steady-macos-apple-silicon` — `.dmg` from `macos-15` (arm64).

Artifacts are retained for 14 days. Trigger it from **Actions → Verify and package STEADY → Run workflow**.

The workflows do not require signing credentials. Public distribution should add:

- Windows Authenticode signing (`TAURI_SIGNING_PRIVATE_KEY` is for updater signatures and does **not** replace Authenticode).
- Apple Developer ID signing and notarization (`APPLE_CERTIFICATE`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`).

Unsigned installers trigger SmartScreen/Gatekeeper warnings. No installer artifacts are committed to this repository.

## Design fidelity

The interface follows `STEADY_Desktop_UI_UX_Spec.md`, `STEADY_Interactive_Prototype.html`, and `dashboard_preview.png`: the 254 px sidebar, `#F5F7F4` canvas, white 18 px-radius cards, `#18302B` ink, forest-green primary actions, compact premium typography, and quiet borders. All six sections are implemented as modular React/TypeScript screens rather than embedding the prototype HTML.

Deliberate departures from the browser prototype:

- **No demo dataset is seeded.** A first-run setup flow collects units, starting weight, goal, and the recurring meal. Empty states are real. The browser design preview used during development can be seeded through browser storage only; that adapter is never part of the packaged app.
- **SQLite replaces localStorage** as the canonical datastore, with schema migrations and typed repositories.
- **Recharts** renders the weight chart, with custom tokens, tooltips, empty states, and a screen-reader summary.
- **Off-plan is a three-state model** (absent, on-plan, off-plan), and meal-log day denominators only include days with an explicit meal record.
- **Accessible additions** include visible focus rings, keyboard-trapped dialogs, focus restoration, chart summaries, non-color heatmap labels, reduced-motion support, and inline validation.
- **Exports use native dialogs** through the Tauri dialog plugin and narrowly scoped Rust file commands, rather than browser downloads.

## Project layout

```
src/
  components/        layout, overview cards, charts, dialogs, UI primitives
  pages/             the six sections
  features/          reusable export hooks
  hooks/             app data provider and live local date
  lib/               dates, units, analytics, CSV, backups, file IO
  db/                schema migrations, SQLite + browser repositories
  types/             shared typed data model
tests/               analytics, backup, SQL repository, and UI tests
src-tauri/           Tauri 2 Rust shell, capabilities, bundle config, icons
.github/workflows/   verification and native installer CI
```

The supplied reference files (`STEADY_CODEX_BUILD_PROMPT.md`, `STEADY_Desktop_UI_UX_Spec.md`, `STEADY_Interactive_Prototype.html`, `dashboard_preview.png`) remain alongside the implementation as design documentation.
