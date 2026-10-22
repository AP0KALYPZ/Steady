import { DatabaseSync } from "node:sqlite";
import type { SqlDriver, SqlParams } from "../../src/db/driver";

export interface TestDatabase {
  driver: SqlDriver;
  db: DatabaseSync;
}

/**
 * The packaged app talks to tauri-plugin-sql. Tests talk to the same SQL
 * through node:sqlite, so migrations and repository queries are genuinely
 * executed rather than mocked.
 */
export function createTestDatabase(): TestDatabase {
  const db = new DatabaseSync(":memory:");
  const driver: SqlDriver = {
    async select<T>(sql: string, params: SqlParams = []): Promise<T[]> {
      const statement = db.prepare(sql);
      return statement.all(...(params as never[])) as T[];
    },
    async execute(sql: string, params: SqlParams = []): Promise<void> {
      const statement = db.prepare(sql);
      if (params.length > 0) {
        statement.run(...(params as never[]));
      } else {
        statement.run();
      }
    },
  };
  return { driver, db };
}
