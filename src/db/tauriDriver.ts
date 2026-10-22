import { migrate } from "./migrations";
import type { SqlDriver, SqlParams } from "./driver";
import { SqliteRepository } from "./sqliteRepository";
import type { SteadyRepository } from "./repository";

/**
 * The SQL plugin keeps `steady.db` in the platform app-config directory
 * (`%APPDATA%/com.steady.progress` on Windows, Application Support on macOS).
 * Nothing leaves the machine.
 */
export async function openSqliteRepository(): Promise<SteadyRepository> {
  const { default: Database } = await import("@tauri-apps/plugin-sql");
  const database = await Database.load("sqlite:steady.db");

  const driver: SqlDriver = {
    async select<T>(sql: string, params: SqlParams = []): Promise<T[]> {
      return database.select<T[]>(sql, params);
    },
    async execute(sql: string, params: SqlParams = []): Promise<void> {
      await database.execute(sql, params);
    },
  };

  try {
    await driver.execute("PRAGMA journal_mode = WAL");
    await driver.execute("PRAGMA foreign_keys = ON");
  } catch {
    // Pragmas are best-effort; the schema itself does not depend on them.
  }

  await migrate(driver);
  return new SqliteRepository(driver);
}
