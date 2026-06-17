import { isTauri } from "@tauri-apps/api/core";

export type SqlValue = string | number | null;

export interface SqlExecutor {
  select<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  execute(sql: string, params?: SqlValue[]): Promise<void>;
  transaction<T>(callback: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

const DB_URL = "sqlite:recall.db";

let cachedExecutor: Promise<SqlExecutor | null> | null = null;

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && (isTauri() || "__TAURI_INTERNALS__" in window);
}

export async function getTauriSqlExecutor(): Promise<SqlExecutor | null> {
  cachedExecutor ??= createTauriSqlExecutor();
  return cachedExecutor;
}

async function createTauriSqlExecutor(): Promise<SqlExecutor | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const tauriDetected = isTauriRuntime();
  let database: Awaited<ReturnType<(typeof import("@tauri-apps/plugin-sql"))["default"]["load"]>>;
  try {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    database = await Database.load(DB_URL);
  } catch (error) {
    if (tauriDetected) {
      throw error;
    }
    return null;
  }

  const executor: SqlExecutor = {
    async select<T>(sql: string, params: SqlValue[] = []) {
      return database.select<T[]>(sql, params);
    },
    async execute(sql: string, params: SqlValue[] = []) {
      await database.execute(sql, params);
    },
    async transaction<T>(callback: (tx: SqlExecutor) => Promise<T>) {
      await database.execute("BEGIN IMMEDIATE");
      try {
        const result = await callback(executor);
        await database.execute("COMMIT");
        return result;
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    },
  };

  await executor.execute("PRAGMA foreign_keys = ON");
  return executor;
}
