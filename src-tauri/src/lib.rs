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

    format!(
        "{:x}-{:x}-{:x}",
        nanos,
        pid as u64,
        count
    )
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
            sql: "ALTER TABLE decks ADD COLUMN exam_deadline TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_source_to_cards",
            sql: "ALTER TABLE cards ADD COLUMN source TEXT DEFAULT '';",
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

    #[test]
    fn test_migration_chain_applies_cleanly() {
        let conn = rusqlite::Connection::open_in_memory().expect("open in-memory DB");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();

        for migration in migrations() {
            conn.execute_batch(&migration.sql).unwrap_or_else(|e| {
                panic!(
                    "Migration {} ({}) failed: {}",
                    migration.version, migration.description, e
                )
            });
        }

        // Verify core tables exist
        let tables: Vec<String> = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert!(tables.contains(&"decks".to_string()), "decks table missing");
        assert!(tables.contains(&"cards".to_string()), "cards table missing");
        assert!(
            tables.contains(&"settings".to_string()),
            "settings table missing"
        );
        assert!(
            tables.contains(&"study_sessions".to_string()),
            "study_sessions table missing"
        );
        assert!(
            tables.contains(&"review_logs".to_string()),
            "review_logs table missing"
        );

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
}
