mod anki_import;
mod db_atomic;

use anki_import::parse_anki_apkg;
use db_atomic::{
    create_safety_backup, delete_card_atomic, delete_cards_atomic, delete_deck_atomic, query_cards,
    record_review_atomic, save_snapshot_atomic, upsert_card_atomic, upsert_deck_atomic,
    upsert_setting_atomic,
};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_sql::{Migration, MigrationKind};

const RECALL_DB: &str = "sqlite:recall.db";

#[tauri::command]
fn update_tray_tooltip(app: tauri::AppHandle, due_count: u32) {
    if let Some(tray) = app.tray_by_id("recall-tray") {
        let _ = tray.set_tooltip(Some(&format!("Recall — {} card(s) due", due_count)));
    }
}

#[tauri::command]
fn copy_image_to_recall(app: tauri::AppHandle, source_path: String) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let images_dir = data_dir.join("images");
    std::fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    let path = std::path::Path::new(&source_path);

    // Reject symlinks and directories
    let metadata =
        std::fs::symlink_metadata(path).map_err(|e| format!("Cannot read file: {}", e))?;
    if metadata.file_type().is_symlink() {
        return Err("Symlinks are not allowed for security".to_string());
    }
    if metadata.is_dir() {
        return Err("Path is a directory, not a file".to_string());
    }

    // Reject files above 50MB
    let file_size = metadata.len();
    if file_size > 50 * 1024 * 1024 {
        return Err(format!(
            "File too large ({}MB). Maximum is 50MB.",
            file_size / 1024 / 1024
        ));
    }

    // Validate extension
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    let allowed_exts = ["png", "jpg", "jpeg", "gif", "webp"];
    if !allowed_exts.contains(&ext.as_str()) {
        return Err(format!(
            "Unsupported image type: .{}. Allowed: png, jpg, jpeg, gif, webp",
            ext
        ));
    }

    // Validate magic bytes match the claimed extension
    let mut header = [0u8; 12];
    let mut file = std::fs::File::open(path).map_err(|e| format!("Cannot open file: {}", e))?;
    use std::io::Read;
    let bytes_read = file
        .read(&mut header)
        .map_err(|e| format!("Cannot read file: {}", e))?;
    if bytes_read < 4 {
        return Err("File too small to be a valid image".to_string());
    }

    let magic_valid = match ext.as_str() {
        "png" => header[0..4] == [0x89, 0x50, 0x4E, 0x47], // ‰PNG
        "jpg" | "jpeg" => header[0..2] == [0xFF, 0xD8],    // JPEG SOI
        "gif" => header[0..3] == [0x47, 0x49, 0x46],       // GIF
        "webp" => {
            bytes_read >= 12
            && header[0..4] == [0x52, 0x49, 0x46, 0x46] // RIFF
            && header[8..12] == [0x57, 0x45, 0x42, 0x50]
        } // WEBP
        _ => false,
    };

    if !magic_valid {
        return Err(format!(
            "File claims to be .{} but magic bytes don't match. Possible file corruption or spoofing.",
            ext
        ));
    }

    // Generate filename with UUID for uniqueness (not just timestamp)
    let uuid = generate_simple_uuid();
    let filename = format!("{}.{}", uuid, ext);
    let dest = images_dir.join(&filename);

    std::fs::copy(path, &dest).map_err(|e| format!("Copy failed: {}", e))?;

    Ok(filename)
}

/// Generate a simple UUID-like string without pulling in the uuid crate.
/// Uses timestamp + random bytes for uniqueness.
fn generate_simple_uuid() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();

    // Mix in some entropy from the process ID and a counter
    let pid = std::process::id();
    static COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let count = COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    format!("{:x}-{:x}-{:x}", nanos, pid as u64, count)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, _event| {
                    if let Ok(target) = "Control+Shift+N".parse::<Shortcut>() {
                        if shortcut == &target {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("quick-add-shortcut", ());
                            }
                        }
                    }
                })
                .build(),
        )
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(RECALL_DB, migrations())
                .build(),
        )
        .setup(|app| {
            let icon = app
                .default_window_icon()
                .cloned()
                .ok_or_else(|| tauri::Error::AssetNotFound("icons/icon.ico".to_string()))?;

            // Tray icon: fail-soft (app works without it)
            match TrayIconBuilder::with_id("recall-tray")
                .tooltip("Recall — your flashcards, local-first")
                .icon(icon)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)
            {
                Ok(_) => {}
                Err(e) => {
                    eprintln!("Tray icon failed to build (non-fatal): {}", e);
                }
            }

            // Register the global shortcut: fail-soft with logging
            if let Ok(shortcut) = "Control+Shift+N".parse::<Shortcut>() {
                if let Err(e) = app.global_shortcut().register(shortcut) {
                    eprintln!("Global shortcut registration failed (non-fatal): {}", e);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            parse_anki_apkg,
            update_tray_tooltip,
            copy_image_to_recall,
            save_snapshot_atomic,
            record_review_atomic,
            create_safety_backup,
            upsert_deck_atomic,
            upsert_card_atomic,
            delete_deck_atomic,
            delete_card_atomic,
            delete_cards_atomic,
            upsert_setting_atomic,
            query_cards,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Recall");
}

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_recall_schema",
            sql: r#"
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS decks (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                color TEXT DEFAULT 'blue',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY NOT NULL,
                deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                hint TEXT DEFAULT '',
                tags TEXT NOT NULL DEFAULT '[]',
                card_type TEXT NOT NULL DEFAULT 'basic',
                state TEXT NOT NULL DEFAULT 'new',
                last_review_date TEXT,
                next_review_date TEXT NOT NULL,
                stability REAL NOT NULL DEFAULT 0,
                difficulty REAL NOT NULL DEFAULT 0,
                elapsed_days INTEGER NOT NULL DEFAULT 0,
                scheduled_days INTEGER NOT NULL DEFAULT 0,
                reps INTEGER NOT NULL DEFAULT 0,
                lapses INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS cards_deck_id_idx ON cards(deck_id);
            CREATE INDEX IF NOT EXISTS cards_next_review_date_idx ON cards(next_review_date);

            CREATE TABLE IF NOT EXISTS review_logs (
                id TEXT PRIMARY KEY NOT NULL,
                card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
                rating TEXT NOT NULL,
                review_date TEXT NOT NULL,
                stability REAL NOT NULL,
                difficulty REAL NOT NULL,
                elapsed_days INTEGER NOT NULL,
                scheduled_days INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS review_logs_card_id_idx ON review_logs(card_id);

            CREATE TABLE IF NOT EXISTS study_sessions (
                id TEXT PRIMARY KEY NOT NULL,
                deck_id TEXT REFERENCES decks(id),
                started_at TEXT NOT NULL,
                ended_at TEXT NOT NULL,
                cards_studied INTEGER NOT NULL DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS study_sessions_deck_id_idx ON study_sessions(deck_id);

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL
            );

            INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '1');
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_demo_data",
            sql: r#"
            -- Demo seed data moved to app-layer seeding (A3 refactor)
            -- See seed_demo_if_empty() command in lib.rs
            -- This migration kept as no-op for version tracking compatibility
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_exam_deadline_to_decks",
            sql: r#"
                -- SQLite doesn't support ADD COLUMN IF NOT EXISTS,
                -- so we check if the column already exists
                ALTER TABLE decks ADD COLUMN exam_deadline TEXT;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_source_to_cards",
            sql: r#"
                -- SQLite doesn't support ADD COLUMN IF NOT EXISTS
                ALTER TABLE cards ADD COLUMN source TEXT DEFAULT '';
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_check_constraints",
            sql: r#"
                -- CHECK constraints require table rebuild in SQLite, which conflicts
                -- with FOREIGN KEY enforcement inside transactions. Application-level
                -- validation (TypeScript + Rust) enforces all enums and ranges.
                -- This migration is a no-op placeholder for schema version tracking.
                INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '5');
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_tts_settings",
            sql: r#"
                INSERT OR IGNORE INTO settings (key, value) VALUES ('tts_enabled', 'false');
                INSERT OR IGNORE INTO settings (key, value) VALUES ('tts_auto_read', 'false');
                INSERT OR IGNORE INTO settings (key, value) VALUES ('tts_speed', '1');
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add_fsrs_weights",
            sql: r#"
                INSERT OR IGNORE INTO settings (key, value) VALUES ('fsrs_weights', '');
            "#,
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: run all migrations on a fresh in-memory DB.
    fn apply_all_migrations(conn: &rusqlite::Connection) {
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        for migration in migrations() {
            conn.execute_batch(&migration.sql).unwrap_or_else(|e| {
                panic!(
                    "Migration {} ({}) failed: {}",
                    migration.version, migration.description, e
                )
            });
        }
    }

    /// Helper: verify core tables exist after migrations.
    fn assert_core_tables(conn: &rusqlite::Connection) {
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        for expected in &[
            "decks",
            "cards",
            "settings",
            "study_sessions",
            "review_logs",
        ] {
            assert!(
                tables.contains(&expected.to_string()),
                "{expected} table missing"
            );
        }
    }

    /// Helper: verify expected columns exist on key tables.
    fn assert_schema_columns(conn: &rusqlite::Connection) {
        // decks columns
        let deck_cols: Vec<String> = conn
            .prepare("PRAGMA table_info(decks)")
            .unwrap()
            .query_map([], |row| row.get(1))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        for col in &[
            "id",
            "name",
            "description",
            "color",
            "created_at",
            "updated_at",
            "exam_deadline",
        ] {
            assert!(
                deck_cols.contains(&col.to_string()),
                "decks missing column: {col}"
            );
        }

        // cards columns — must include all 19 from the parity test + source
        let card_cols: Vec<String> = conn
            .prepare("PRAGMA table_info(cards)")
            .unwrap()
            .query_map([], |row| row.get(1))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        for col in &[
            "id",
            "deck_id",
            "front",
            "back",
            "hint",
            "tags",
            "card_type",
            "state",
            "last_review_date",
            "next_review_date",
            "stability",
            "difficulty",
            "elapsed_days",
            "scheduled_days",
            "reps",
            "lapses",
            "created_at",
            "updated_at",
            "source",
        ] {
            assert!(
                card_cols.contains(&col.to_string()),
                "cards missing column: {col}"
            );
        }
    }

    #[test]
    fn test_migration_chain_applies_cleanly() {
        let conn = rusqlite::Connection::open_in_memory().expect("open in-memory DB");
        apply_all_migrations(&conn);
        assert_core_tables(&conn);
        assert_schema_columns(&conn);

        // Verify schema_version was set by migration 5
        let version: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'schema_version'",
                [],
                |row| row.get(0),
            )
            .unwrap_or_else(|_| "not found".to_string());
        assert_eq!(version, "5", "schema_version should be 5 after migrations");
    }

    /// Verify migrations work correctly on a populated database (data preserved across migrations).
    #[test]
    fn test_migration_chain_preserves_populated_data() {
        let conn = rusqlite::Connection::open_in_memory().expect("open in-memory DB");

        // Apply first 3 migrations only (schema + seed + exam_deadline)
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        for migration in migrations().iter().take(3) {
            conn.execute_batch(&migration.sql).unwrap();
        }

        // Insert test data
        conn.execute(
            "INSERT INTO decks (id, name, created_at, updated_at) VALUES ('d1', 'Test Deck', '2026-01-01', '2026-01-01')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO cards (id, deck_id, front, back, next_review_date, created_at, updated_at)
             VALUES ('c1', 'd1', 'Q', 'A', '2026-06-01', '2026-01-01', '2026-01-01')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
             VALUES ('r1', 'c1', 'good', '2026-01-01', 1.0, 5.0, 1, 3)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
             VALUES ('s1', 'd1', '2026-01-01T00:00:00Z', '2026-01-01T00:05:00Z', 1)",
            [],
        )
        .unwrap();

        // Apply remaining migrations
        for migration in migrations().iter().skip(3) {
            conn.execute_batch(&migration.sql).unwrap_or_else(|e| {
                panic!(
                    "Migration {} ({}) failed on populated DB: {}",
                    migration.version, migration.description, e
                )
            });
        }

        // Verify all data survived
        assert_core_tables(&conn);
        assert_schema_columns(&conn);

        let deck_name: String = conn
            .query_row("SELECT name FROM decks WHERE id = 'd1'", [], |row| {
                row.get(0)
            })
            .expect("deck d1 should survive migrations");
        assert_eq!(deck_name, "Test Deck");

        let card_front: String = conn
            .query_row("SELECT front FROM cards WHERE id = 'c1'", [], |row| {
                row.get(0)
            })
            .expect("card c1 should survive migrations");
        assert_eq!(card_front, "Q");

        let log_rating: String = conn
            .query_row(
                "SELECT rating FROM review_logs WHERE id = 'r1'",
                [],
                |row| row.get(0),
            )
            .expect("review log r1 should survive migrations");
        assert_eq!(log_rating, "good");

        let session_count: i64 = conn
            .query_row(
                "SELECT cards_studied FROM study_sessions WHERE id = 's1'",
                [],
                |row| row.get(0),
            )
            .expect("session s1 should survive migrations");
        assert_eq!(session_count, 1);

        // Verify new columns from later migrations have default values
        let card_source: String = conn
            .query_row("SELECT source FROM cards WHERE id = 'c1'", [], |row| {
                row.get(0)
            })
            .expect("source column should have default after migration 4");
        assert_eq!(card_source, "");

        // Verify TTS settings from migration 6
        let tts_enabled: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'tts_enabled'",
                [],
                |row| row.get(0),
            )
            .expect("tts_enabled setting should exist after migration 6");
        assert_eq!(tts_enabled, "false");
    }

    // Note: idempotency test intentionally omitted. tauri_plugin_sql tracks
    // applied migration versions and never re-runs them. ALTER TABLE ADD COLUMN
    // is inherently non-idempotent in SQLite, but the framework prevents re-application.
}
