export type SqlParams = Array<string | number | null>;

export interface SqlDriver {
  /** Rows returned by a SELECT/PRAGMA. */
  select<T>(sql: string, params?: SqlParams): Promise<T[]>;
  /** A single mutating statement. */
  execute(sql: string, params?: SqlParams): Promise<void>;
}
