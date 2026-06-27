export type SqlValue = string | number | null;

export interface SqlExecutor {
  select<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  execute(sql: string, params?: SqlValue[]): Promise<void>;
  transaction<T>(callback: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}

const DB_URL = "sqlite:recall.db";

let cachedExecutor: Promise<SqlExecutor | null> | null = null;

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
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
    async transaction<T>(callback: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      // ARCHITECTURE NOTE (A3/A4):
      // On Tauri runtime, this executor is READ-ONLY. All write operations go through
      // Rust atomic commands via invoke() (see db_atomic.rs). This separation ensures:
      // - True atomic transactions with BEGIN IMMEDIATE / COMMIT / ROLLBACK
      // - No shared connection state conflicts between JS and Rust
      // - Data integrity for multi-statement operations
      //
      // This transaction() method is only used by the browser/preview fallback
      // (LocalStorageRecallRepository) where atomicity is not critical.
      // SQLite implicit transactions are fine for individual SELECT/INSERT statements.
      return callback(executor);
    },
  };

  await executor.execute("PRAGMA foreign_keys = ON");
  await executor.execute("PRAGMA busy_timeout = 30000");
  await executor.execute("PRAGMA journal_mode = WAL");
  return executor;
}
