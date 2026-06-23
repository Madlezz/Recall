mod anki_import;
mod db_atomic;

use anki_import::parse_anki_apkg;
use db_atomic::{
    create_safety_backup, delete_card_atomic, delete_deck_atomic, query_cards,
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
            CREATE TEMP TABLE IF NOT EXISTS recall_seed_guard (should_seed INTEGER NOT NULL);
            DELETE FROM recall_seed_guard;
            INSERT INTO recall_seed_guard (should_seed)
                SELECT CASE WHEN EXISTS (SELECT 1 FROM decks) THEN 0 ELSE 1 END;

            -- ═══════════════════════════════════════════════════
            -- DECKS (6 decks, varied colors)
            -- ═══════════════════════════════════════════════════
            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_languages', '🇯🇵 Japanese Basics', 'Essential Japanese vocabulary, grammar, and phrases for daily conversation.', 'rose',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_science', '🔬 Science Facts', 'Physics, biology, chemistry — the fascinating facts that make you sound smart.', 'green',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-40 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_history', '🏛️ World History', 'Key dates, events, and figures that shaped the modern world.', 'amber',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-35 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_programming', '💻 Programming', 'Core CS concepts, algorithms, design patterns, and best practices.', 'violet',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_art', '🎨 Art & Design', 'Art movements, color theory, typography, and design principles.', 'slate',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_psych', '🧠 Psychology', 'Cognitive biases, psychological theories, and behavioral science.', 'blue',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
                FROM recall_seed_guard WHERE should_seed = 1;

            -- ═══════════════════════════════════════════════════
            -- CARDS — Japanese Basics (15 cards)
            -- ═══════════════════════════════════════════════════
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_1', 'deck_languages', 'Hello / Good afternoon', 'こんにちは (Konnichiwa)', 'Most common greeting, used during daytime', '["greetings","japanese","basics"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+14 days'), 15.2, 0.7, 5, 14, 8, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_2', 'deck_languages', 'Good morning', 'おはようございます (Ohayou gozaimasu)', 'Polite form; casual: おはよう', '["greetings","japanese","basics"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+21 days'), 22.0, 0.5, 7, 21, 10, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_3', 'deck_languages', 'Thank you (polite)', 'ありがとうございます (Arigatou gozaimasu)', 'Polite form; casual: ありがとう', '["greetings","japanese","basics"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+10 days'), 12.0, 0.8, 4, 10, 7, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_4', 'deck_languages', 'Excuse me / Sorry', 'すみません (Sumimasen)', 'Also used to get attention, like calling a waiter', '["phrases","japanese"]', 'basic', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+1 day'), 2.5, 1.1, 2, 1, 4, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-40 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_5', 'deck_languages', 'I don''t understand', 'わかりません (Wakarimasen)', 'Useful for beginners in Japan', '["phrases","japanese"]', 'basic', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1.8, 1.2, 1, 1, 3, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-38 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_6', 'deck_languages', 'Please (when requesting)', 'お願いします (Onegaishimasu)', 'More polite than ください for requests', '["phrases","japanese","politeness"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days'), 30.0, 0.4, 8, 30, 12, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_7', 'deck_languages', 'How much is this?', 'いくらですか (Ikura desu ka)', 'Essential for shopping', '["phrases","japanese","shopping"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_8', 'deck_languages', 'Where is the {{c1::station}}?', '{{c1::駅}}はどこですか ({{c1::Eki}} wa doko desu ka)', '駅 = station', '["japanese","directions","cloze"]', 'cloze', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+18 days'), 18.0, 0.6, 5, 18, 9, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-42 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_9', 'deck_languages', 'I want to eat {{c1::ramen}}', '{{c1::ラーメン}}を食べたいです', 'ラーメン = ramen', '["japanese","food","cloze"]', 'cloze', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_10', 'deck_languages', 'Numbers 1-10', 'いち、に、さん、し/よん、ご、ろく、しち/なな、はち、きゅう/く、じゅう', '1-10 in Japanese', '["japanese","numbers","basics"]', 'basic', 'relearning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+1 day'), 0.8, 1.5, 0, 1, 6, 3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-44 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_11', 'deck_languages', 'Goodbye (formal)', 'さようなら (Sayounara)', 'Formal farewell; casual: じゃあね', '["greetings","japanese"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+25 days'), 25.0, 0.5, 6, 25, 11, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_12', 'deck_languages', 'Yes / No', 'はい (Hai) / いいえ (Iie)', 'Shortest essential pair', '["japanese","basics"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+35 days'), 35.0, 0.3, 8, 35, 14, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-45 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_13', 'deck_languages', 'The weather is nice today', '今日はいい天気ですね (Kyou wa ii tenki desu ne)', 'Common small talk phrase', '["japanese","phrases","daily"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_14', 'deck_languages', 'What time is it?', '何時ですか (Nanji desu ka)', '何時 = what time', '["japanese","time","phrases"]', 'basic', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+2 days'), 3.0, 1.0, 2, 2, 5, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-35 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_jp_15', 'deck_languages', 'I''m {{c1::hungry}}', 'お腹が{{c1::すきました}}', 'お腹がすきました = I''m hungry', '["japanese","food","cloze"]', 'cloze', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;

            -- ═══════════════════════════════════════════════════
            -- CARDS — Science Facts (12 cards)
            -- ═══════════════════════════════════════════════════
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_1', 'deck_science', 'Speed of light in vacuum', '~299,792 km/s', 'About 7.5 laps around Earth per second', '["physics","constants"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+40 days'), 40.0, 0.4, 10, 40, 15, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-40 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_2', 'deck_science', 'How many bones in adult human body?', '206', 'Babies have ~300, they fuse over time', '["biology","anatomy"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+14 days'), 14.0, 0.7, 4, 14, 8, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-38 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_3', 'deck_science', 'DNA stands for {{c1::Deoxyribonucleic}} Acid', '', 'The molecule that carries genetic instructions', '["biology","genetics","cloze"]', 'cloze', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+21 days'), 21.0, 0.5, 5, 21, 10, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-40 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_4', 'deck_science', 'What is the closest star to Earth?', 'Proxima Centauri', 'About 4.24 light-years away', '["astronomy","space"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days'), 30.0, 0.4, 7, 30, 12, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-40 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_5', 'deck_science', 'Absolute zero temperature', '-273.15°C (0 Kelvin)', 'Lowest possible temperature; molecular motion stops', '["physics","thermodynamics"]', 'basic', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+2 days'), 2.0, 1.1, 1, 2, 4, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_6', 'deck_science', 'Water''s chemical formula', 'H₂O', 'Two hydrogen atoms, one oxygen atom', '["chemistry","basics"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+45 days'), 45.0, 0.3, 12, 45, 16, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-40 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_7', 'deck_science', 'What percentage of Earth is covered by water?', '~71%', 'Only ~3% is freshwater', '["earth-science","geography"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_8', 'deck_science', 'The {{c1::mitochondria}} is the {{c2::powerhouse}} of the cell', '', 'Classic biology meme!', '["biology","cells","cloze"]', 'cloze', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+10 days'), 10.0, 0.8, 3, 10, 7, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-35 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_9', 'deck_science', 'Newton''s First Law', 'An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.', 'Law of Inertia', '["physics","mechanics"]', 'basic', 'relearning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+1 day'), 1.0, 1.3, 0, 1, 5, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-38 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_10', 'deck_science', 'How many planets in our solar system?', '8 (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune)', 'Pluto was reclassified as a dwarf planet in 2006', '["astronomy","space"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+18 days'), 18.0, 0.6, 5, 18, 9, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-40 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_11', 'deck_science', 'What is the pH of pure water?', '7 (neutral)', 'Below 7 = acidic, above 7 = basic/alkaline', '["chemistry","acids-bases"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_sci_12', 'deck_science', 'Largest organ in the human body', 'Skin', 'Weighs about 3.6 kg in adults', '["biology","anatomy"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;

            -- ═══════════════════════════════════════════════════
            -- CARDS — World History (12 cards)
            -- ═══════════════════════════════════════════════════
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_1', 'deck_history', 'When did World War II end?', 'September 2, 1945', 'Japan surrendered aboard USS Missouri', '["ww2","dates","modern"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+35 days'), 35.0, 0.4, 8, 35, 13, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-35 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_2', 'deck_history', 'First person on the moon', 'Neil Armstrong (July 20, 1969)', 'Apollo 11 mission', '["space","people","modern"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+14 days'), 14.0, 0.7, 4, 14, 8, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-35 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_3', 'deck_history', 'The {{c1::Berlin Wall}} fell on {{c2::November 9, 1989}}', '', 'Key Cold War event that led to German reunification', '["cold-war","dates","cloze"]', 'cloze', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+21 days'), 21.0, 0.5, 5, 21, 10, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-35 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_4', 'deck_history', 'When was the Magna Carta signed?', '1215', 'King John of England; limited royal power', '["medieval","documents","dates"]', 'basic', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+2 days'), 2.5, 1.1, 1, 2, 4, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_5', 'deck_history', 'Who invented the printing press?', 'Johannes Gutenberg (~1440)', 'Enabled mass production of books', '["inventions","people","renaissance"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+25 days'), 25.0, 0.5, 6, 25, 11, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-35 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_6', 'deck_history', 'The French Revolution began in {{c1::1789}} with the storming of the {{c2::Bastille}}', '', 'Marked the end of absolute monarchy in France', '["french-revolution","dates","cloze"]', 'cloze', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+18 days'), 18.0, 0.6, 5, 18, 9, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-35 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_7', 'deck_history', 'Who was the first Emperor of Rome?', 'Augustus (Octavian)', 'Reigned 27 BC – 14 AD', '["rome","people","ancient"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_8', 'deck_history', 'When did the Titanic sink?', 'April 15, 1912', 'Struck an iceberg on its maiden voyage', '["disasters","dates","modern"]', 'basic', 'relearning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+1 day'), 1.2, 1.2, 0, 1, 5, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-32 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_9', 'deck_history', 'Ancient Egyptian writing system', 'Hieroglyphics', 'Deciphered using the Rosetta Stone', '["ancient","egypt","culture"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_10', 'deck_history', 'The {{c1::Renaissance}} began in {{c2::Italy}} in the 14th century', '', 'Rebirth of art, culture, and science', '["renaissance","culture","cloze"]', 'cloze', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+3 days'), 3.5, 0.9, 2, 3, 5, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-28 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_11', 'deck_history', 'Who wrote the Communist Manifesto?', 'Karl Marx and Friedrich Engels (1848)', 'Foundation text of modern communism', '["people","documents","modern"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-9 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+35 days'), 35.0, 0.4, 9, 35, 13, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-35 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-9 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_his_12', 'deck_history', 'The Great Wall of China was built primarily during which dynasty?', 'Ming Dynasty (1368–1644)', 'Earlier walls existed but Ming built most of what remains', '["china","ancient","architecture"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                FROM recall_seed_guard WHERE should_seed = 1;

            -- ═══════════════════════════════════════════════════
            -- CARDS — Programming (10 cards)
            -- ═══════════════════════════════════════════════════
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_prog_1', 'deck_programming', 'What is Big O notation?', 'A mathematical notation describing the upper bound of an algorithm''s time or space complexity as input grows.', 'Used for worst-case analysis', '["algorithms","complexity","basics"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+25 days'), 25.0, 0.5, 6, 25, 11, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_prog_2', 'deck_programming', 'Time complexity of binary search', 'O(log n)', 'Divide and conquer: halves the search space each step', '["algorithms","complexity"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+14 days'), 14.0, 0.7, 4, 14, 8, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_prog_3', 'deck_programming', 'The {{c1::SOLID}} principles: S={{c2::Single Responsibility}}, O={{c3::Open/Closed}}, L={{c4::Liskov Substitution}}, I={{c5::Interface Segregation}}, D={{c6::Dependency Inversion}}', '', 'Robert C. Martin''s design principles', '["design-patterns","oop","cloze"]', 'cloze', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+2 days'), 2.0, 1.3, 1, 2, 5, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_prog_4', 'deck_programming', 'What is a closure?', 'A function that captures variables from its enclosing scope, even after that scope has finished executing.', 'Common in JavaScript, Python, Rust', '["concepts","functional"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+18 days'), 18.0, 0.6, 5, 18, 9, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_prog_5', 'deck_programming', 'Difference between stack and heap', 'Stack: LIFO, fixed size, fast access, automatic cleanup. Heap: dynamic size, slower, manual/GC cleanup.', 'Stack overflow vs heap overflow', '["memory","concepts"]', 'basic', 'relearning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+1 day'), 1.5, 1.2, 0, 1, 6, 3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-28 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_prog_6', 'deck_programming', 'What is REST?', 'Representational State Transfer — an architectural style using HTTP methods (GET, POST, PUT, DELETE) on resources.', 'Stateless, cacheable, layered system', '["web","api","architecture"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days'), 30.0, 0.4, 7, 30, 12, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_prog_7', 'deck_programming', 'HTTP status code {{c1::404}} means {{c2::Not Found}}', '', 'Client error range: 400-499', '["web","http","cloze"]', 'cloze', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_prog_8', 'deck_programming', 'What is a hash collision?', 'When two different keys produce the same hash value, requiring resolution strategies (chaining, open addressing).', 'Affects HashMap/Dictionary performance', '["data-structures","hashing"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_prog_9', 'deck_programming', 'ACID in databases', 'Atomicity, Consistency, Isolation, Durability — guarantees for reliable database transactions.', 'Contrast with BASE (eventual consistency)', '["databases","transactions"]', 'basic', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+3 days'), 3.0, 1.0, 2, 3, 4, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-22 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_prog_10', 'deck_programming', 'What is the CAP theorem?', 'A distributed system can only guarantee 2 of 3: Consistency, Availability, Partition tolerance.', 'You must choose CP, AP, or CA', '["distributed-systems","theory"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;

            -- ═══════════════════════════════════════════════════
            -- CARDS — Art & Design (8 cards)
            -- ═══════════════════════════════════════════════════
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_art_1', 'deck_art', 'What are the 3 primary colors?', 'Red, Blue, Yellow', 'Cannot be created by mixing other colors', '["color-theory","basics"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+21 days'), 21.0, 0.5, 5, 21, 10, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_art_2', 'deck_art', 'The {{c1::Rule of Thirds}} divides an image into {{c2::9}} equal parts using {{c2::2}} horizontal and {{c2::2}} vertical lines', '', 'Place key elements along the lines or intersections', '["composition","photography","cloze"]', 'cloze', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+14 days'), 14.0, 0.7, 4, 14, 8, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_art_3', 'deck_art', 'Who painted the Mona Lisa?', 'Leonardo da Vinci (~1503-1519)', 'Housed in the Louvre, Paris', '["renaissance","painters","famous-works"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days'), 30.0, 0.4, 7, 30, 12, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_art_4', 'deck_art', 'What is kerning in typography?', 'The adjustment of spacing between individual characters in a proportional font.', 'Different from tracking (uniform spacing)', '["typography","design"]', 'basic', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+2 days'), 2.5, 1.1, 1, 2, 4, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_art_5', 'deck_art', 'Impressionism movement originated in which country?', 'France (1860s-1870s)', 'Named after Monet''s "Impression, Sunrise"', '["movements","history"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_art_6', 'deck_art', 'Golden Ratio value', '≈ 1.618 (φ)', 'Found in nature, art, and architecture', '["proportions","math","design"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+18 days'), 18.0, 0.6, 5, 18, 9, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_art_7', 'deck_art', 'What is CMYK used for?', 'Print design (Cyan, Magenta, Yellow, Key/Black)', 'RGB is for screens, CMYK for print', '["color-theory","print"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_art_8', 'deck_art', 'Bauhaus school was founded in {{c1::Germany}} in {{c2::1919}}', '', 'Influential design school that shaped modern design', '["movements","history","cloze"]', 'cloze', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+3 days'), 3.0, 1.0, 2, 3, 5, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-18 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
                FROM recall_seed_guard WHERE should_seed = 1;

            -- ═══════════════════════════════════════════════════
            -- CARDS — Psychology (8 cards)
            -- ═══════════════════════════════════════════════════
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_psych_1', 'deck_psych', 'What is Confirmation Bias?', 'The tendency to search for, interpret, and recall information that confirms one''s preexisting beliefs.', 'One of the most common cognitive biases', '["cognitive-biases","thinking"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+18 days'), 18.0, 0.6, 5, 18, 9, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_psych_2', 'deck_psych', 'Maslow''s Hierarchy of Needs (bottom to top)', 'Physiological → Safety → Love/Belonging → Esteem → Self-Actualization', 'Proposed by Abraham Maslow in 1943', '["motivation","theories"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+25 days'), 25.0, 0.5, 6, 25, 11, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_psych_3', 'deck_psych', 'The {{c1::Dunning-Kruger}} effect: people with {{c2::low ability}} tend to {{c2::overestimate}} their competence', '', 'Conversely, experts tend to underestimate theirs', '["cognitive-biases","metacognition","cloze"]', 'cloze', 'learning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+2 days'), 2.5, 1.1, 1, 2, 4, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_psych_4', 'deck_psych', 'What is the Stanford Prison Experiment?', 'A 1971 study by Philip Zimbardo showing how social roles and power dynamics affect behavior. Guards became abusive, prisoners became passive.', 'Ended after only 6 days due to ethical concerns', '["experiments","social-psychology"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+14 days'), 14.0, 0.7, 4, 14, 8, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_psych_5', 'deck_psych', 'Anchoring effect', 'People rely too heavily on the first piece of information offered (the "anchor") when making decisions.', 'Used in pricing: show high price first', '["cognitive-biases","decision-making"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_psych_6', 'deck_psych', 'Classical conditioning was discovered by', 'Ivan Pavlov', 'Famous experiment with dogs, bells, and food', '["learning","behaviorism","people"]', 'basic', 'review', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+21 days'), 21.0, 0.5, 5, 21, 10, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_psych_7', 'deck_psych', 'The {{c1::bystander effect}} states that individuals are {{c2::less likely}} to help when {{c2::other people}} are present', '', 'Diffusion of responsibility', '["social-psychology","cloze"]', 'cloze', 'relearning', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+1 day'), 1.0, 1.3, 0, 1, 4, 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-18 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, card_type, state, last_review_date, next_review_date, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
                SELECT 'card_psych_8', 'deck_psych', 'What is Flow state?', 'A mental state of complete immersion and energized focus in an activity, described by Mihaly Csikszentmihalyi.', 'Requires clear goals, immediate feedback, and balance between challenge and skill', '["positive-psychology","motivation"]', 'basic', 'new', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, 0, 0, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days')
                FROM recall_seed_guard WHERE should_seed = 1;

            -- ═══════════════════════════════════════════════════
            -- STUDY SESSIONS (10 sessions spread over 30 days)
            -- ═══════════════════════════════════════════════════
            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_1', 'deck_languages', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days', '+25 minutes'), 12
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_2', 'deck_science', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-28 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-28 days', '+18 minutes'), 8
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_3', 'deck_history', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 days', '+22 minutes'), 10
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_4', 'deck_programming', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days', '+30 minutes'), 15
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_5', 'deck_languages', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days', '+20 minutes'), 10
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_6', 'deck_science', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days', '+15 minutes'), 7
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_7', 'deck_art', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days', '+12 minutes'), 6
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_8', 'deck_psych', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days', '+28 minutes'), 14
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_9', 'deck_languages', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days', '+22 minutes'), 11
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
                SELECT 'session_10', 'deck_programming', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day', '+35 minutes'), 18
                FROM recall_seed_guard WHERE should_seed = 1;

            -- ═══════════════════════════════════════════════════
            -- REVIEW LOGS (25 reviews spread across 30 days)
            -- ═══════════════════════════════════════════════════
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_1', 'card_jp_1', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days'), 5.0, 0.9, 2, 5
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_2', 'card_jp_2', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-28 days'), 6.0, 0.8, 3, 6
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_3', 'card_jp_6', 'easy', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-28 days'), 10.0, 0.4, 4, 10
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_4', 'card_sci_1', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 days'), 8.0, 0.6, 3, 8
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_5', 'card_his_1', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-25 days'), 7.0, 0.7, 3, 7
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_6', 'card_jp_1', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-22 days'), 8.0, 0.8, 5, 10
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_7', 'card_sci_6', 'easy', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-22 days'), 12.0, 0.3, 5, 12
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_8', 'card_prog_1', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), 6.0, 0.7, 2, 6
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_9', 'card_jp_4', 'again', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-20 days'), 0.5, 1.2, 0, 1
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_10', 'card_his_5', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-18 days'), 8.0, 0.6, 4, 8
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_11', 'card_sci_3', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-18 days'), 7.0, 0.7, 3, 7
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_12', 'card_jp_12', 'easy', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days'), 15.0, 0.3, 6, 15
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_13', 'card_prog_6', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days'), 10.0, 0.5, 4, 10
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_14', 'card_art_1', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-15 days'), 8.0, 0.5, 3, 8
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_15', 'card_psych_1', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days'), 7.0, 0.7, 3, 7
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_16', 'card_jp_8', 'hard', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 days'), 4.0, 1.0, 2, 4
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_17', 'card_his_11', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), 12.0, 0.5, 5, 12
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_18', 'card_sci_4', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 days'), 10.0, 0.5, 4, 10
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_19', 'card_prog_2', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'), 6.0, 0.7, 3, 6
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_20', 'card_psych_6', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-8 days'), 8.0, 0.6, 3, 8
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_21', 'card_art_3', 'easy', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), 15.0, 0.3, 6, 15
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_22', 'card_jp_3', 'hard', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), 3.0, 1.1, 2, 3
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_23', 'card_prog_4', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), 7.0, 0.7, 3, 7
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_24', 'card_his_2', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), 6.0, 0.7, 3, 6
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
                SELECT 'rev_25', 'card_sci_2', 'good', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 5.0, 0.7, 2, 5
                FROM recall_seed_guard WHERE should_seed = 1;

            -- ═══════════════════════════════════════════════════
            -- SETTINGS (rich user profile)
            -- ═══════════════════════════════════════════════════
            INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '2');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'light');
            INSERT OR IGNORE INTO settings (key, value)
                SELECT 'seeded_at', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_new_card_limit', '20');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('leech_threshold', '5');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_complete', 'true');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('xp', '1250');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('achievements', '["first_review","streak_7","streak_14","streak_30","cards_50","cards_100","perfect_session"]');
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
