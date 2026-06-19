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
      // Don't use explicit BEGIN/COMMIT/ROLLBACK — the tauri_plugin_sql plugin
      // shares the database connection with Rust, and Rust's migrations leave
      // transaction state on the connection. Just execute statements directly;
      // SQLite runs each statement in its own implicit transaction.
      // This is less atomic but avoids connection state conflicts.
      return callback(executor);
    },
  };

  await executor.execute("PRAGMA foreign_keys = ON");
  await executor.execute("PRAGMA busy_timeout = 30000");
  await executor.execute("PRAGMA journal_mode = WAL");
  return executor;
}
