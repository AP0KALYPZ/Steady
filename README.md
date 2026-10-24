<div align="center">

<img src="src-tauri/icons/128x128@2x.png" width="92" alt="STEADY app icon" />

# STEADY

**Progress, without the noise.**

A private, offline-first weight-loss studio for Windows and macOS.

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-18302B?style=flat-square)](#install)
[![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=18302B)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-local-003B57?style=flat-square&logo=sqlite&logoColor=white)](#privacy-by-design)
[![Offline](https://img.shields.io/badge/offline--first-146B54?style=flat-square)](#privacy-by-design)

[Screens](#screens) · [Fasting days](#fasting-days) · [How the numbers work](#how-the-numbers-work) · [Install](#install) · [Development](#development)

</div>

![STEADY overview — daily metrics, weight journey, meal check-in, and a color-coded consistency calendar](docs/screenshots/overview.png)

STEADY is a desktop weight-loss tracker built around a simple carnivore routine. Choose one to six daily meals, save the recipes you actually eat, and check each serving off with a click. Record an off-plan meal when the day calls for it, or mark an intentional fasting day. Your weigh-ins, notes, and history stay in a local SQLite database on your device.

There are no feeds, accounts, streaks, scores, or cloud services. Just a calm record of what happened, and honest trends built from it.

> **About the screenshots:** they use a representative demo profile. The installed app starts empty and never seeds fabricated history.

## Screens

### Daily journal

Every scheduled meal, the fasting control, off-plan status, optional weigh-in, and a persistent daily note — all in one place. The full month calendar can be browsed back through any previous month.

<p align="center">
  <img src="docs/screenshots/journal.png" width="92%" alt="Daily journal with fasting control, meal check-ins, weigh-in, note, and a full month calendar with fasting days" />
</p>

### Meal routine

Choose one to six meals per day. Use one recurring recipe for every serving, or give each meal its own. Nutrition fields are optional and never estimated.

<table>
<tr>
<td width="50%" valign="top">
<img src="docs/screenshots/meal-routine.png" alt="Meal routine with a meals-per-day selector and individual recipes" />
<p align="center"><sub><strong>Meal routine</strong> — shared or individual recipes, one to six meals.</sub></p>
</td>
<td width="50%" valign="top">
<img src="docs/screenshots/insights.png" alt="Insights with meal logging, fasting days, off-plan days, weight trend, and goal completion" />
<p align="center"><sub><strong>Insights</strong> — explicit counts, honest denominators, no judgment.</sub></p>
</td>
</tr>
</table>

### Weight progress

Real weigh-ins, a seven-calendar-day rolling average, and a searchable history you can edit or delete.

<p align="center">
  <img src="docs/screenshots/weight-progress.png" width="88%" alt="Weight progress chart, starting and latest weight, total change, and weigh-in history" />
</p>

### Settings

Units, starting and goal weights, CSV and JSON exports, validated restores, and a confirmed full reset.

<p align="center">
  <img src="docs/screenshots/settings.png" width="88%" alt="Settings with goal weights, unit switching, exports, backup import, and local storage status" />
</p>

## Fasting days

Fasting is a first-class state, not a missing meal.

- Use **Mark fasting** on the overview or daily journal to record a day you intentionally go without food.
- Meals are paused for that day, so there are no empty check-ins to explain or dismiss.
- Fasting has its **own lavender calendar color** and a **Fast** label in both the journal month calendar and the overview consistency grid. The label keeps the state clear without relying on color alone.
- Fasting is counted separately from off-plan days. Neither state is inferred from a missing record.
- Insights shows fasting days in the last 30 days and the all-time total.
- Fasting days are stored in their own SQLite table and included in CSV exports and versioned JSON backups.

## A closer look

<table>
<tr>
<td width="50%" valign="top">

### One-tap routine

Your daily meals are always one click away. Shared recipe or individual recipes, STEADY adapts every screen to your schedule.

</td>
<td width="50%" valign="top">

### Honest numbers

Rolling averages use real calendar days. Missing weigh-ins stay missing. Unlogged meals are never counted as failures.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### All your months

The journal calendar is a full Monday–Sunday month grid. Move back through previous months without a cutoff, then pick any day to edit.

</td>
<td width="50%" valign="top">

### Quiet by default

No notifications, streaks, scores, or moralizing. Just the records you chose to keep, presented clearly.

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Yours to keep

A local SQLite database, plain CSV export, and validated JSON backups with native file dialogs.

</td>
<td width="50%" valign="top">

### Yours alone

No account, telemetry, analytics, advertising, or network dependency. Exports go only where you choose.

</td>
</tr>
</table>

## How the numbers work

These rules live in pure functions under [`src/lib/analytics`](src/lib/analytics) and are covered by tests.

- **Seven-day rolling average** uses recorded weigh-ins from the trailing seven **calendar** days, not the last seven measurements. Long gaps produce no average instead of borrowing old data.
- **Weekly trend** compares the current seven days with the previous seven and returns `—` unless each window has at least three readings.
- **30-day change** uses the first and last actual weigh-ins inside the 30-calendar-day window and needs at least two entries.
- **Goal progress** is `(start − current) / (start − goal)`, clamped to 0–100%, and only shown with valid start, goal, and current values. The goal must be below the starting weight.
- **Meal tracking** uses your current scheduled meal count only on days with at least one explicit meal record. Unlogged days are excluded, never treated as missed meals or cheating. Percentages always have a visible numerator and denominator.
- **Off-plan** is a separate explicit status. Absence of a status is never counted as on-plan.
- **Fasting** is its own explicit calendar status. It is counted independently of off-plan days and is never inferred from a missing meal record.
- **No projected goal date** is shown; short-term scale noise makes one untrustworthy.
- Weights are never fabricated, interpolated, or treated as zero.

## Privacy by design

No network requests are made by the application. There is no account, telemetry, analytics, advertising, or cloud dependency. The only external integrations are the operating system's native file dialogs.

The SQLite database `steady.db` is created by the official Tauri SQL plugin in the platform app-data directory:

| Platform | Database location |
|---|---|
| Windows | `%APPDATA%\com.steady.progress\steady.db` |
| macOS | `~/Library/Application Support/com.steady.progress/steady.db` |
| Linux (development) | `~/.config/com.steady.progress/steady.db` |

Exports and backups are written only to paths you choose. Imported backups are validated in memory before any record is touched. Backups include a schema version; newer schemas are rejected with an actionable message.

The current database schema is version **3**, which includes fasting days. Existing databases upgrade in place through append-only migrations.

## Install

STEADY ships as a native Tauri app and opens **maximized** by default, with the native title bar kept in place so you can close, move, or resize the window.

Prebuilt installers are produced by [the packaging workflow](.github/workflows/build-installers.yml):

1. Open **Actions → Verify and package STEADY → Run workflow**.
2. Download the artifact for your platform:
   - `steady-windows-x64` — Windows NSIS installer.
   - `steady-macos-intel` — Intel Mac DMG.
   - `steady-macos-apple-silicon` — Apple Silicon DMG.

The current builds are unsigned. Windows SmartScreen and macOS Gatekeeper will warn on first launch until code signing and notarization credentials are configured.

### Build it yourself

```bash
npm ci

# Windows installer (NSIS)
npm run tauri build -- --bundles nsis
# -> src-tauri\target\release\bundle\nsis\STEADY_1.0.0_x64-setup.exe

# macOS disk image
npm run tauri build -- --bundles dmg
# -> src-tauri/target/release/bundle/dmg/STEADY_1.0.0_<arch>.dmg
```

Windows `.msi` (WiX) can be produced with `--bundles msi` when WiX is available.

## Development

### Prerequisites

- Node.js 22 or newer and npm
- Rust stable (1.77.2 or newer)
- Platform prerequisites for Tauri 2:
  - **Windows:** Microsoft C++ Build Tools (Desktop development with C++) and WebView2 (preinstalled on Windows 10/11).
  - **macOS:** Xcode Command Line Tools.
  - **Linux:** WebKitGTK and related Tauri development packages. Desktop targets are Windows and macOS; Linux is useful only for development.

### Run

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

`npm test` runs Vitest with jsdom interaction tests and `node:sqlite` repository tests against the real migrations and SQL statements. Node's experimental SQLite module is intentionally invoked with `--experimental-sqlite`.

### Regenerate the README screenshots

The screenshots in this README are generated from the running Vite UI with a deterministic demo profile:

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run screenshots
```

The capture script uses local Chrome at 1440 px wide, removes browser-only preview labels from the frame, and writes the six PNGs to [`docs/screenshots`](docs/screenshots). On macOS it looks for Chrome in the standard Applications path; set `CHROME_PATH` if yours lives elsewhere.

### CI installers

[`.github/workflows/build-installers.yml`](.github/workflows/build-installers.yml) runs lint, all tests, and the web build on every pull request. On manual runs and `v*` tags it also builds and uploads:

- `steady-windows-x64` — NSIS `.exe` from `windows-latest`.
- `steady-macos-intel` — `.dmg` from `macos-15-intel` (x86_64).
- `steady-macos-apple-silicon` — `.dmg` from `macos-15` (arm64).

Artifacts are retained for 14 days. The workflows require no signing credentials, but public distribution should add:

- Windows Authenticode signing (`TAURI_SIGNING_PRIVATE_KEY` is for updater signatures and does **not** replace Authenticode).
- Apple Developer ID signing and notarization (`APPLE_CERTIFICATE`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`).

No installer artifacts are committed to this repository.

## Project layout

```text
src/
  components/        layout, overview cards, charts, dialogs, UI primitives
  pages/             the six sections
  features/          reusable export hooks
  hooks/             app data provider and live local date
  lib/               dates, units, analytics, CSV, backups, file IO
  db/                schema migrations, SQLite + browser repositories
  types/             shared typed data model
tests/               analytics, backup, SQL repository, and UI tests
scripts/             deterministic README screenshot capture
docs/screenshots/    README screenshots
src-tauri/           Tauri 2 Rust shell, capabilities, bundle config, icons
.github/workflows/   verification and native installer CI
```

The supplied reference files (`STEADY_CODEX_BUILD_PROMPT.md`, `STEADY_Desktop_UI_UX_Spec.md`, `STEADY_Interactive_Prototype.html`, `dashboard_preview.png`) remain alongside the implementation as design documentation.

## Design fidelity

The interface follows the supplied `STEADY_Desktop_UI_UX_Spec.md`, `STEADY_Interactive_Prototype.html`, and `dashboard_preview.png`: the 254 px sidebar, `#F5F7F4` canvas, white 18 px-radius cards, `#18302B` ink, forest-green primary actions, compact premium typography, and quiet borders. All six sections are implemented as modular React/TypeScript screens rather than embedding the prototype HTML.

Deliberate departures from the browser prototype:

- **No demo dataset is seeded.** First-run setup collects units, starting weight, goal, meal count, and the recurring recipe. Empty states are real. The browser design preview uses browser storage only and is never part of the packaged app.
- **SQLite replaces localStorage** as the canonical datastore, with schema migrations and typed repositories.
- **Recharts** renders the weight charts, with custom tokens, tooltips, empty states, and screen-reader summaries.
- **Off-plan is a three-state model** (absent, on-plan, off-plan), fasting days are a separate explicit status, and meal denominators only include days with an explicit meal record.
- **Meal count is configurable** from 1 to 6, with shared or individual recipes per meal.
- **The journal calendar is a full month view** with unlimited backward navigation, not a rolling strip.
- **Accessible additions** include visible focus rings, keyboard-trapped dialogs, focus restoration, chart summaries, non-color calendar labels, reduced-motion support, and inline validation.
- **Exports use native dialogs** through the Tauri dialog plugin and narrowly scoped Rust file commands, rather than browser downloads.

<div align="center">
<br />
<sub>STEADY · Progress Studio — built to be calm, honest, and entirely yours.</sub>
</div>
