use tauri_plugin_sql::{Migration, MigrationKind};

const RECALL_DB: &str = "sqlite:recall.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(RECALL_DB, migrations())
                .build(),
        )
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
                name TEXT NOT NULL UNIQUE,
                description TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY NOT NULL,
                deck_id TEXT NOT NULL,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                hint TEXT NOT NULL,
                tags TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('new', 'learning', 'mastered')),
                correct_count INTEGER NOT NULL DEFAULT 0,
                incorrect_count INTEGER NOT NULL DEFAULT 0,
                streak INTEGER NOT NULL DEFAULT 0,
                last_reviewed_at TEXT,
                next_review_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS cards_deck_id_idx ON cards(deck_id);
            CREATE INDEX IF NOT EXISTS cards_next_review_at_idx ON cards(next_review_at);

            CREATE TABLE IF NOT EXISTS study_sessions (
                id TEXT PRIMARY KEY NOT NULL,
                deck_id TEXT,
                started_at TEXT NOT NULL,
                ended_at TEXT NOT NULL,
                cards_studied INTEGER NOT NULL DEFAULT 0,
                correct INTEGER NOT NULL DEFAULT 0,
                incorrect INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS study_sessions_deck_id_idx ON study_sessions(deck_id);

            CREATE TABLE IF NOT EXISTS reviews (
                id TEXT PRIMARY KEY NOT NULL,
                card_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                answered_at TEXT NOT NULL,
                result TEXT NOT NULL CHECK (result IN ('correct', 'incorrect')),
                FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
                FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS reviews_card_id_idx ON reviews(card_id);
            CREATE INDEX IF NOT EXISTS reviews_session_id_idx ON reviews(session_id);

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
                SELECT 'deck_typescript', 'TypeScript Systems', 'Types, narrowing, and maintainable frontend patterns.', 'blue',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_react', 'React Fundamentals', 'Hooks, state, rendering, and UI architecture.', 'violet',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO decks (id, name, description, color, created_at, updated_at)
                SELECT 'deck_sql', 'Local-First Data', 'SQLite, sync boundaries, and offline data design.', 'green',
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                FROM recall_seed_guard WHERE should_seed = 1;

            INSERT INTO cards (id, deck_id, front, back, hint, tags, status, correct_count, incorrect_count, streak, last_reviewed_at, next_review_at, created_at, updated_at)
                SELECT 'card_ts_1', 'deck_typescript', 'What does `strict` mode protect?', 'It enables stronger type checks that catch unsafe assumptions at compile time.', 'Think compiler guardrails.', '["typescript"]', 'learning', 2, 1, 2,
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, status, correct_count, incorrect_count, streak, last_reviewed_at, next_review_at, created_at, updated_at)
                SELECT 'card_ts_2', 'deck_typescript', 'What is a discriminated union?', 'A union of object types narrowed by a shared literal property.', '', '["typescript","types"]', 'mastered', 5, 0, 5,
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+12 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, status, correct_count, incorrect_count, streak, last_reviewed_at, next_review_at, created_at, updated_at)
                SELECT 'card_ts_3', 'deck_typescript', 'What does `never` represent?', 'A value that should not exist, often used for exhaustiveness checks.', '', '["typescript"]', 'new', 0, 0, 0,
                       NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, status, correct_count, incorrect_count, streak, last_reviewed_at, next_review_at, created_at, updated_at)
                SELECT 'card_react_1', 'deck_react', 'Why keep state close to consumers?', 'It reduces coupling and avoids needless re-renders across unrelated UI.', '', '["react"]', 'learning', 1, 1, 1,
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-6 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, status, correct_count, incorrect_count, streak, last_reviewed_at, next_review_at, created_at, updated_at)
                SELECT 'card_react_2', 'deck_react', 'What should an effect cleanup handle?', 'Subscriptions, timers, observers, pending work, and anything with external lifetime.', 'External lifetime matters.', '["react","hooks"]', 'new', 0, 0, 0,
                       NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, status, correct_count, incorrect_count, streak, last_reviewed_at, next_review_at, created_at, updated_at)
                SELECT 'card_react_3', 'deck_react', 'When is `useMemo` useful?', 'For expensive derived values or stable references passed to memoized children.', '', '["react"]', 'mastered', 6, 1, 5,
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+16 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-4 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, status, correct_count, incorrect_count, streak, last_reviewed_at, next_review_at, created_at, updated_at)
                SELECT 'card_sql_1', 'deck_sql', 'What does local-first mean here?', 'The app works fully offline and stores user data on the device first.', '', '["local-first"]', 'learning', 3, 1, 3,
                       strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days')
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO cards (id, deck_id, front, back, hint, tags, status, correct_count, incorrect_count, streak, last_reviewed_at, next_review_at, created_at, updated_at)
                SELECT 'card_sql_2', 'deck_sql', 'Why use import/export JSON?', 'It gives portable backups without accounts, sync, or cloud dependencies.', '', '["portability"]', 'new', 0, 0, 0,
                       NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days')
                FROM recall_seed_guard WHERE should_seed = 1;

            INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied, correct, incorrect)
                SELECT 'session_seed_1', NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 3, 2, 1
                FROM recall_seed_guard WHERE should_seed = 1;

            INSERT INTO reviews (id, card_id, session_id, answered_at, result)
                SELECT 'review_seed_1', 'card_ts_1', 'session_seed_1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 'correct'
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO reviews (id, card_id, session_id, answered_at, result)
                SELECT 'review_seed_2', 'card_react_1', 'session_seed_1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 'incorrect'
                FROM recall_seed_guard WHERE should_seed = 1;
            INSERT INTO reviews (id, card_id, session_id, answered_at, result)
                SELECT 'review_seed_3', 'card_sql_1', 'session_seed_1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 'correct'
                FROM recall_seed_guard WHERE should_seed = 1;

            INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '2');
            INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');
            INSERT OR IGNORE INTO settings (key, value)
                SELECT 'seeded_at', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                FROM recall_seed_guard WHERE should_seed = 1;

            DROP TABLE recall_seed_guard;
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_ease_factor",
            sql: "ALTER TABLE cards ADD COLUMN ease_factor REAL NOT NULL DEFAULT 2.5;",
            kind: MigrationKind::Up,
        },
    ]
}
