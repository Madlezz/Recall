mod anki_import;

use anki_import::parse_anki_apkg;
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri::Manager;
use tauri::Emitter;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

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
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");

    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let filename = format!("{}.{}", nanos, ext);
    let dest = images_dir.join(&filename);

    std::fs::copy(&source_path, &dest).map_err(|e| e.to_string())?;

    Ok(filename)
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
            let icon = app.default_window_icon()
                .cloned()
                .ok_or_else(|| tauri::Error::AssetNotFound("icons/icon.ico".to_string()))?;
            let _tray = TrayIconBuilder::with_id("recall-tray")
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
                .build(app)?;

                            // Register the global shortcut
                            if let Ok(shortcut) = "Control+Shift+N".parse::<Shortcut>() {
                                let _ = app.global_shortcut().register(shortcut);
                            }

                            Ok(())
        })
        .invoke_handler(tauri::generate_handler![parse_anki_apkg, update_tray_tooltip, copy_image_to_recall])
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
            PRAGMA busy_timeout = 5000;
            PRAGMA journal_mode = WAL;

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
                        ]
                    }