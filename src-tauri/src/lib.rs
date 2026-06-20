mod anki_import;
mod db_atomic;

use anki_import::parse_anki_apkg;
use db_atomic::{create_safety_backup, record_review_atomic, save_snapshot_atomic};
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
        "{:x}-{:x}-{:x}-{:x}",
        nanos >> 64,
        nanos as u64,
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
            create_safety_backup
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
            CREATE TEMP TABLE IF NOT EXISTS recall_seed_guard (should_seed INTEGER NOT NULL);
            DELETE FROM recall_seed_guard;
            INSERT INTO recall_seed_guard (should_seed)
                SELECT CASE WHEN EXISTS (SELECT 1 FROM decks) THEN 0 ELSE 1 END;

            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_languages', '🇯🇵 Japanese Basics', 'Common Japanese words and phrases for everyday conversation.', 'rose',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_science', '🔬 Science Facts', 'Fun science facts that make you sound smart at parties.', 'green',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_history', '🏛️ World History', 'Key dates and events that shaped the modern world.', 'amber',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                FROM recall_seed_guard WHERE should_seed = 1;

            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date,
                               stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_1', 'deck_languages', 'Hello / Good afternoon', 'こんにちは (Konnichiwa)', 'Said during daytime', '["greetings"]',
                       'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+10 days'),
                       12.0, 0.8, 4, 12, 5, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date,
                               stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_2', 'deck_languages', 'Thank you', 'ありがとう (Arigatou)', 'Casual form', '["greetings"]',
                       'basic', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                       2.0, 1.1, 2, 3, 3, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date,
                               stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_3', 'deck_languages', 'Excuse me, I''m {{c1::sorry}} — {{c2::すみません}} (Sumimasen)', '',
                       'Cloze: remember the Japanese phrase', '["phrases","cloze"]',
                       'cloze', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                       0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date,
                               stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_1', 'deck_science', 'What is the speed of light?', '~300,000 km/s in a vacuum',
                       'That''s about 7.5 laps around Earth per second!', '["physics"]',
                       'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+20 days'),
                       18.0, 0.5, 6, 18, 7, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date,
                               stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_2', 'deck_science', 'How many bones in the human body?', '206 bones in an adult',
                       'Babies have ~300, they fuse together', '["biology"]',
                       'basic', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                       1.5, 1.0, 2, 2, 3, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date,
                               stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_3', 'deck_science', 'DNA stands for {{c1::Deoxyribonucleic}} Acid — the {{c2::blueprint of life}}', '',
                       'Fill in the missing terms', '["biology","cloze"]',
                       'cloze', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                       0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date,
                               stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_1', 'deck_history', 'When did World War II end?', '1945',
                       'September 2, 1945 — Japan surrendered', '["dates"]',
                       'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+5 days'),
                       8.0, 0.9, 5, 10, 6, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date,
                               stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_2', 'deck_history', 'Who was the first person on the moon?', 'Neil Armstrong',
                       'Apollo 11, July 20, 1969', '["people"]',
                       'basic', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                       1.0, 1.3, 1, 1, 2, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date,
                               stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_3', 'deck_history', 'The {{c1::Berlin Wall}} fell on {{c2::November 9, 1989}}', '',
                       'Key Cold War event — fill in the blanks', '["dates","cloze"]',
                       'cloze', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                       0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;

            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_seed_1', NULL,
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 5
                FROM recall_seed_guard WHERE should_seed = 1;

            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'review_seed_1', 'card_jp_1', 'good',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 12.0, 0.8, 4, 12
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'review_seed_2', 'card_sci_1', 'good',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 18.0, 0.5, 6, 18
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'review_seed_3', 'card_his_1', 'good',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 8.0, 0.9, 5, 10
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'review_seed_4', 'card_jp_2', 'again',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 0.5, 1.1, 2, 3
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'review_seed_5', 'card_his_2', 'good',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 1.0, 1.3, 1, 1
                FROM recall_seed_guard WHERE should_seed = 1;

            INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '2');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'light');
            INSERT OR IGNORE INTO settings (key, value)
                SELECT 'seeded_at', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_new_card_limit', '20');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('leech_threshold', '5');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_complete', 'false');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('xp', '0');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('achievements', '[]');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_goal', '20');

            DROP TABLE recall_seed_guard;
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
                                -- SQLite doesn't support ALTER TABLE ADD CONSTRAINT.
                                -- We rebuild tables with CHECK constraints using the standard
                                -- rename-recreate-copy pattern. Data is preserved.

                                -- Decks: constrain color enum
                                ALTER TABLE decks RENAME TO decks_old;
                                CREATE TABLE decks (
                                    id TEXT PRIMARY KEY NOT NULL,
                                    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
                                    description TEXT DEFAULT '',
                                    color TEXT DEFAULT 'blue' CHECK(color IN ('rose','amber','green','blue','violet','cyan','orange','pink')),
                                    exam_deadline TEXT,
                                    created_at TEXT NOT NULL,
                                    updated_at TEXT NOT NULL
                                );
                                INSERT INTO decks SELECT * FROM decks_old;
                                DROP TABLE decks_old;

                                -- Cards: constrain state, card_type, numeric ranges
                                ALTER TABLE cards RENAME TO cards_old;
                                CREATE TABLE cards (
                                    id TEXT PRIMARY KEY NOT NULL,
                                    deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
                                    front TEXT NOT NULL CHECK(length(trim(front)) > 0),
                                    back TEXT NOT NULL,
                                    hint TEXT DEFAULT '',
                                    source TEXT DEFAULT '',
                                    tags TEXT NOT NULL DEFAULT '[]',
                                    card_type TEXT NOT NULL DEFAULT 'basic' CHECK(card_type IN ('basic','cloze')),
                                    state TEXT NOT NULL DEFAULT 'new' CHECK(state IN ('new','learning','review','relearning')),
                                    last_review_date TEXT,
                                    next_review_date TEXT NOT NULL,
                                    stability REAL NOT NULL DEFAULT 0 CHECK(stability >= 0),
                                    difficulty REAL NOT NULL DEFAULT 0 CHECK(difficulty >= 0),
                                    elapsed_days INTEGER NOT NULL DEFAULT 0 CHECK(elapsed_days >= 0),
                                    scheduled_days INTEGER NOT NULL DEFAULT 0 CHECK(scheduled_days >= 0),
                                    reps INTEGER NOT NULL DEFAULT 0 CHECK(reps >= 0),
                                    lapses INTEGER NOT NULL DEFAULT 0 CHECK(lapses >= 0),
                                    created_at TEXT NOT NULL,
                                    updated_at TEXT NOT NULL
                                );
                                INSERT INTO cards SELECT * FROM cards_old;
                                DROP TABLE cards_old;
                                CREATE INDEX IF NOT EXISTS cards_deck_id_idx ON cards(deck_id);
                                CREATE INDEX IF NOT EXISTS cards_next_review_date_idx ON cards(next_review_date);

                                -- Review logs: constrain rating enum, numeric ranges
                                ALTER TABLE review_logs RENAME TO review_logs_old;
                                CREATE TABLE review_logs (
                                    id TEXT PRIMARY KEY NOT NULL,
                                    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
                                    rating TEXT NOT NULL CHECK(rating IN ('again','hard','good','easy')),
                                    review_date TEXT NOT NULL,
                                    stability REAL NOT NULL CHECK(stability >= 0),
                                    difficulty REAL NOT NULL CHECK(difficulty >= 0),
                                    elapsed_days INTEGER NOT NULL CHECK(elapsed_days >= 0),
                                    scheduled_days INTEGER NOT NULL CHECK(scheduled_days >= 0)
                                );
                                INSERT INTO review_logs SELECT * FROM review_logs_old;
                                DROP TABLE review_logs_old;
                                CREATE INDEX IF NOT EXISTS review_logs_card_id_idx ON review_logs(card_id);

                                -- Study sessions: constrain cards_studied
                                ALTER TABLE study_sessions RENAME TO study_sessions_old;
                                CREATE TABLE study_sessions (
                                    id TEXT PRIMARY KEY NOT NULL,
                                    deck_id TEXT REFERENCES decks(id),
                                    started_at TEXT NOT NULL,
                                    ended_at TEXT NOT NULL,
                                    cards_studied INTEGER NOT NULL DEFAULT 0 CHECK(cards_studied >= 0)
                                );
                                INSERT INTO study_sessions SELECT * FROM study_sessions_old;
                                DROP TABLE study_sessions_old;
                                CREATE INDEX IF NOT EXISTS study_sessions_deck_id_idx ON study_sessions(deck_id);
                            "#,
            kind: MigrationKind::Up,
        },
    ]
}
