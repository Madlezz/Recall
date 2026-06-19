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
      // Retry up to 3 times on SQLITE_BUSY to handle contention with Rust-side migrations
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await database.execute("BEGIN IMMEDIATE");
          try {
            const result = await callback(executor);
            await database.execute("COMMIT");
            return result;
          } catch (error) {
            await database.execute("ROLLBACK");
            throw error;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          // SQLITE_BUSY (code 5) or nested transaction (code 1) — wait and retry
          if ((msg.includes("code: 5") || msg.includes("code: 1")) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
            // Try to reset any stuck transaction state
            try { await database.execute("ROLLBACK"); } catch { /* ignore */ }
            continue;
          }
          throw error;
        }
      }
      throw new Error("Transaction failed after 3 retries (database busy)");
    },
  };

  await executor.execute("PRAGMA foreign_keys = ON");
  await executor.execute("PRAGMA busy_timeout = 5000");
  await executor.execute("PRAGMA journal_mode = WAL");
  return executor;
}
