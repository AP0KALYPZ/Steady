# STEADY — Desktop Weight-Loss Progress Studio
## Complete UI / UX / Product Design Specification

**Product intent:** A serene, elegant, desktop-first personal dashboard for tracking weight-loss progress around one repeating carnivore meal eaten **twice daily**. Prioritize frictionless logging, trustworthy trends, a separate off-plan / cheat-meal flag, and the ability to understand progress at a glance.

**Design principles:** Consistency over perfection · Clarity over information overload · A daily task completed in seconds · Trends over day-to-day scale noise · Private, offline-first data ownership · Nonjudgmental language.

**Artifact:** Accompanying `STEADY_Interactive_Prototype.html` is a working local browser prototype with demo records, editable goal and units, weight logging/editing/deletion, daily meal toggles, off-plan statuses, daily notes, trend visualization, calendar heatmap, meal templates, insights, CSV export, JSON backup/import, and browser-local storage. It is **not yet a packaged native Windows/macOS executable**.

---

## 1. Visual direction

**Aesthetic:** Contemporary premium health / personal analytics, with the restraint of a top-tier finance app. Bright surfaces, generous negative space, expressive but compact data visualizations, rounded cards and tiny, meaningful green and amber accents. Avoid saturated red/green success-failure framing.

**Desktop shell (target 1440 × 900, responsive 1280–1920):**

- Fixed left navigation rail / sidebar: `254 px`, white background, subtle right divider.
- Main work area: cool off-white canvas `#F5F7F4`; `24–37 px` horizontal gutters.
- Top context bar `85 px`, breadcrumb at left; demo indicator, date, Export, primary Log Weight at right.
- Four-card metric row; second row is a flexible ~`1.82 : 1` chart / today's check-in split; third row contains goal, calendar heatmap, and smart insights.
- Low-contrast outlines and feather-soft shadows, no glass blur in everyday surfaces, no giant gradients or flashy hero stock images.

**Palette:**

| Token | Hex | Purpose |
|---|---|---|
| Canvas | `#F5F7F4` | Main workspace background |
| Card | `#FFFFFF` | Content surfaces |
| Ink | `#18302B` | Headings and strong data |
| Supporting ink | `#56665F` | Descriptions / supporting labels |
| Forest | `#146B54` | Primary CTA and weight trend |
| Dark forest | `#0F5945` | Hover, depth, brand |
| Mist mint | `#E4F5EB` | Positive selection and background accents |
| Border | `#E5EBE6` | Quiet component separators |
| Warm sand | `#FCF3E8` | Off-plan annotation / secondary warmth |
| Amber | `#D48B4A` | Neutral caution / one-meal status |

**Type:** Inter or high-quality system-ui fallback. Main page title `31 px / 820`, content card heading `16 px / 810`, big KPI `34 px / 820`, standard copy `13–14 px`, utility labels `10–12 px`. Headings slightly tightened, paragraph lines spacious. Never use tiny chart axis text where it can compromise legibility; allow hover / keyboard focus to reveal exact values.

**Shape and spacing:** 18-px card radius, 9–12-px interactive control radius, 16–26-px internal card padding, 17–20-px grid gaps. Buttons have clear hover, focus and active states; touch targets should remain at least 40 px high where practical.

---

## 2. Information architecture

**Navigation** (persistent sidebar):

1. **Overview** — Your daily control center.
2. **Daily journal** — Choose a date and enter/edit its weight, two meals, off-plan status, and a free-form note.
3. **Weight progress** — 30 / 60 / 90 / all-time charts, rolling average, precise weigh-in history and per-entry edits/deletion.
4. **Meal routine** — Define one repeating meal template used for slots 1 and 2; optional different template for slot 2.
5. **Insights** — Consistency, seven-day trends, off-plan frequency, weigh-in frequency, goal completion, weekly comparison.
6. **Settings** — Start weight, target, lb/kg units, backup/export/import and full reset.

**Persistent top action:** `+ Log weight`; it should open a modal from any screen, defaulting to the current local date. Log meals from the dashboard or journal without opening a dialog.

---

## 3. Overview — exact layout

### Page heading
- Eyebrow: **YOUR DAILY OVERVIEW**
- H1: **Small steps. Real progress.**
- Subline: **Track your routine, understand your trends, and stay consistent.**
- Right-side education cue: **Focus on the trend — not a single weigh-in.**

### Metric row: four same-height cards

| KPI | Primary figure | Small caption |
|---|---|---|
| Current weight | Latest logged weight and unit | Actual date of the latest measurement |
| Weight change · 30D | Signed change between first and last recorded weights *within* the last 30 calendar days | Explains observed direction and lack of data |
| Weekly trend | Difference between current 7-day and previous 7-day average | Week-over-week direction, minimum three readings per window |
| Meals tracked · 7D | Percentage of scheduled meal slots recorded on days with a meal record | Exact numerator and denominator |

**Never** count unlogged days as failed adherence. “Meals tracked” measures logging, not diet quality, total consumption, or food morality.

### Large trend panel
- 30D / 60D / 90D range segmented control.
- Soft gray daily weight polyline with subtle dots.
- Deep green smooth-looking line connecting computed seven-calendar-day rolling averages. **Do not make up intermediate weigh-ins.**
- Pale mint gradient under the moving-average line, faint horizontal grid.
- Hover tooltip: date, exact weight, seven-day average.
- Large current rolling-average figure with unit; legend directly beneath plot.
- Empty state requiring two weigh-ins for trend visualization.

### “Today’s check-in” panel
- Circular `0/2`, `1/2`, or `2/2` meal completion indicator.
- Two compact clickable cards: **Meal 1** and **Meal 2**, each with the saved recipe title and a one-tap Log / Undo action.
- Check icon filled green only once that meal is explicitly logged.
- Explicit, independent **Off-plan meal?** yes/no control; both choices start unselected if unrecorded.
- Use gentle copy: **No judgment. Just data.**
- No extra popovers needed for normal repeated meal logging.

### Supporting panels
- **Your destination:** latest weight, configured start and goal, clamped 0–100% progress bar, remaining weight.
- **Your consistency:** last four Monday–Sunday weeks as a heatmap; green for both meals, amber for one, neutral for unlogged, tiny amber/rust dot for explicitly off-plan.
- **At a glance:** concise trend narrative and off-plan count, both transparently worded, with link to Insights.

---

## 4. Daily journal

Date selector at top right with previous / next controls; never navigate to future dates. Direct-click last-14-days row should change the selection.

Left column:
- **Your two meals**: large readable meal rows; one tap to log/unlog each.
- **Off-plan / cheat meal**: explicit **Stayed on plan** and **Had an off-plan meal** states; tap again to clear a status.
- A blank status remains **Not recorded**, never silently “No.”

Right column:
- Date-specific weight display, with **Add weight** / **Edit weigh-in** modal.
- Free-form daily note for observations such as hunger, energy, sleep or schedule.

Bottom:
- 14 clickable day cards showing weekday, date, `0/2–2/2` logged meals and an indicator for a weight entry.

**Behavior:** A weight or meal added to a historical date recalculates all relevant stats and may change the entire trend chart. Never delete or overwrite a previous day's notes as a side effect.

---

## 5. Weight progress

- Large chart card with 30D / 60D / 90D / All control.
- Distinct daily-weight and rolling-average paths; exact values in tooltips.
- Three secondary cards: Starting weight, latest weight, total change from the configured starting weight.
- Searchable / sortable history is recommended for production; the prototype shows newest-first editable rows.
- Each weigh-in is unique per date; editing updates that date. Deletion requires confirmation.
- Future dates are disallowed. Missing calendar days are not synthesized.
- Exportable CSV including all recorded fields.

**Goal attainment:** `(startWeight - currentWeight) / (startWeight - goalWeight)`, clamped to `[0,1]`; only meaningful when the configured target is below the starting weight.

**Seven-day average:** Mean of weigh-ins recorded in the trailing seven **calendar** days, not simply the last seven measurements. The week-over-week change requires at least three records in each compared seven-day window; otherwise show `—` and an explanation.

**30-day change:** Last available recorded weight in the preceding 30 calendar days minus first recorded weight in that same window. Two measurements required.

---

## 6. Meal routine

**Primary workflow:** Define your actual carnivore meal one time and use it for both daily servings. Default `Same meal twice a day = ON`; toggling off lets you configure a different second meal.

Each template should have:
- Meal title (required).
- Ingredient / portion description (text field; e.g. beef, eggs, cheese with user-provided quantities).
- Optional calories, protein, and fat **per serving**, supplied by the user. No automatic nutrition estimates unless calculated from a verified food database and actual quantities.

Once saved, tapping **Meal 1** or **Meal 2** uses the corresponding slot template. Editing the template should not silently recalculate or rewrite historical macros in a production build; preserve the nutritional snapshot per logged meal if history matters.

Additional production-only enhancement: optional “different from usual” meal override for occasional portion adjustments, preserving the routine as the default.

---

## 7. Insights

Suggested headline cards:
- 7-day meal logging rate and numerator / denominator.
- 30-day meal logging rate and numerator / denominator.
- Number of explicitly off-plan days in the trailing 30 days; report how many days have a status at all.
- Count of weigh-ins in the trailing 30 days.
- Seven-day average weight trend vs prior seven days.
- Percentage completion toward configured goal.

Weekly bars divide the preceding 28 days into four rolling seven-day blocks, showing logged servings and expected servings only on days that have a record. Do not name them Monday–Sunday calendar weeks unless they truly are.

A standing educational panel clarifies:
- Weight varies naturally; moving averages are more interpretable than one-day differences.
- Not logging a meal is not equivalent to skipping that meal.
- An unrecorded off-plan status is not assumed to be on-plan.
- No inaccurate “you will reach your goal on [date]” prediction.

---

## 8. Settings, privacy and data ownership

**Goal setup:** Required starting weight, required target weight; target must be lower than starting value in this weight-loss-oriented view. Pounds or kilograms; switching units must convert currently visible field values without modifying already-recorded real-world measurements.

**Data controls:** Export CSV for spreadsheet analysis; export/import complete JSON backup; confirmation for import-overwrite and full reset. Label any generated first-load records explicitly as **Demo data** and provide a clear Start fresh pathway.

**MVP privacy:** The browser prototype stores data only in this browser's localStorage. Native build should use a local SQLite database in the app data folder, with transaction-safe saves, backups, optional encrypted storage and no mandatory account or cloud connection.

**Native desktop recommendation:** Tauri + React / TypeScript UI, SVG charting, persistent local SQLite storage, Windows and macOS packaging. Optimize charts for normal CPU/integrated graphics; no 3D rendering needed. Implement system theme detection later, but ship the carefully balanced light theme as default.

**Accessibility:** Keyboard-accessible sidebar and segmented controls, visibly focused elements, accessible names and chart summaries, contrast that remains readable in sunlight, and non-color-only status indicators. Respect reduced-motion settings.

---

## 9. Critical interaction rules

1. Daily weigh-in is optional: never force it before meals can be logged.
2. Saved routine enables meal logging with a single click and immediately updates dependent UI.
3. Off-plan status is explicit and separate from meal completion; it should not erase meals or cause a failure badge.
4. Zero records means an elegant empty state, not fabricated analytics.
5. Show units next to every weight; use one canonical stored weight unit in production.
6. No automatically inferred daily calorie totals when macro fields are blank.
7. Notes and off-plan status can be corrected retroactively.
8. Editing existing information should be straightforward; deleting records requires explicit confirmation.
9. Undo is always available for meal and off-plan toggles.
10. Every count should name its date window or denominator.

---

## 10. Build handoff: expected native product

**Phase A / Visual + core architecture:** Replicate the layout, tokens, typography and components of the supplied HTML prototype faithfully. Set up routing, reusable dashboard cards, chart components and a typed data model. Verify 1440 × 900 and 1280 × 800 layouts.

**Phase B / Local data:** Implement SQLite storage for measurements, daily journal, meal templates, meal logs, notes and preferences. Use one timezone-consistent local date key `YYYY-MM-DD`. Add migrations and backups.

**Phase C / Analytics:** Compute exact date-window metrics, rolling average, weekly comparisons and heatmap; verify missing-day logic and conversion math with deterministic test data.

**Phase D / Shipping:** Keyboard navigation, robust modal focus management, inline validation, charts' accessible summaries, empty/loading/error states, import/export, signed release pipelines, Windows installer and macOS package using appropriate native build environments.

**Final acceptance:** A user should be able to open the app and mark both daily meals plus off-plan status in fewer than ten seconds, record a weigh-in in a couple of interactions, and understand their 7-day weight trend on the very first screen.
