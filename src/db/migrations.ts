import type { SqlDriver } from "./driver";

export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

/**
 * Migrations are append-only. Each version runs once, in order, and every
 * statement is idempotent so an interrupted upgrade can safely resume.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial-schema",
    statements: [
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        unit TEXT NOT NULL DEFAULT 'lb' CHECK (unit IN ('lb', 'kg')),
        start_weight_kg REAL NULL CHECK (start_weight_kg IS NULL OR start_weight_kg > 0),
        goal_weight_kg REAL NULL CHECK (goal_weight_kg IS NULL OR goal_weight_kg > 0),
        same_meal INTEGER NOT NULL DEFAULT 1 CHECK (same_meal IN (0, 1)),
        onboarded INTEGER NOT NULL DEFAULT 0 CHECK (onboarded IN (0, 1)),
        updated_at TEXT NOT NULL
      )`,
      `INSERT OR IGNORE INTO settings (id, unit, same_meal, onboarded, updated_at)
        VALUES (1, 'lb', 1, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      `CREATE TABLE IF NOT EXISTS weight_entries (
        date TEXT PRIMARY KEY CHECK (length(date) = 10),
        weight_kg REAL NOT NULL CHECK (weight_kg > 0),
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS meal_templates (
        slot INTEGER PRIMARY KEY CHECK (slot IN (1, 2)),
        name TEXT NOT NULL DEFAULT '',
        ingredients TEXT NOT NULL DEFAULT '',
        calories REAL NULL CHECK (calories IS NULL OR calories >= 0),
        protein REAL NULL CHECK (protein IS NULL OR protein >= 0),
        fat REAL NULL CHECK (fat IS NULL OR fat >= 0),
        updated_at TEXT NOT NULL
      )`,
      `INSERT OR IGNORE INTO meal_templates (slot, updated_at)
        VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), (2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      `CREATE TABLE IF NOT EXISTS meal_logs (
        date TEXT NOT NULL CHECK (length(date) = 10),
        slot INTEGER NOT NULL CHECK (slot IN (1, 2)),
        logged_at TEXT NULL,
        snapshot_name TEXT NOT NULL,
        snapshot_ingredients TEXT NOT NULL DEFAULT '',
        snapshot_calories REAL NULL CHECK (snapshot_calories IS NULL OR snapshot_calories >= 0),
        snapshot_protein REAL NULL CHECK (snapshot_protein IS NULL OR snapshot_protein >= 0),
        snapshot_fat REAL NULL CHECK (snapshot_fat IS NULL OR snapshot_fat >= 0),
        PRIMARY KEY (date, slot)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs (date)`,
      `CREATE TABLE IF NOT EXISTS off_plan_days (
        date TEXT PRIMARY KEY CHECK (length(date) = 10),
        status TEXT NOT NULL CHECK (status IN ('on', 'off')),
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS notes (
        date TEXT PRIMARY KEY CHECK (length(date) = 10),
        body TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
];

export async function migrate(driver: SqlDriver): Promise<number> {
  const rows = await driver.select<{ user_version: number | string }>(
    "PRAGMA user_version",
  );
  const raw =
    rows[0] && "user_version" in rows[0] ? rows[0].user_version : 0;
  const current = Number(raw);
  let applied = 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    for (const statement of migration.statements) {
      await driver.execute(statement);
    }
    await driver.execute(`PRAGMA user_version = ${migration.version}`);
    applied = migration.version;
  }

  return applied;
}
