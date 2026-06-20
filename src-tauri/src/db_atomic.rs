//! Atomic database operations using rusqlite transactions.
//!
//! These commands open their own SQLite connection (separate from tauri_plugin_sql)
//! to perform truly atomic operations with BEGIN IMMEDIATE / COMMIT / ROLLBACK.
//! This avoids the shared-connection state issues where tauri_plugin_sql's migrations
//! leave transaction state that conflicts with JS-side BEGIN statements.

use rusqlite::Connection;
use serde::Deserialize;
use tauri::Manager;

/// Row data for save_snapshot_atomic (already validated/mapped by JS).
#[derive(Deserialize)]
pub struct SnapshotRows {
    pub decks: Vec<DeckRowData>,
    pub cards: Vec<CardRowData>,
    pub study_sessions: Vec<SessionRowData>,
    pub review_logs: Vec<ReviewLogRowData>,
    pub settings: Vec<SettingRowData>,
}

#[derive(Deserialize)]
pub struct DeckRowData {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub exam_deadline: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct CardRowData {
    pub id: String,
    pub deck_id: String,
    pub front: String,
    pub back: String,
    pub hint: String,
    pub source: String,
    pub tags: String,
    pub card_type: String,
    pub state: String,
    pub last_review_date: Option<String>,
    pub next_review_date: String,
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i64,
    pub scheduled_days: i64,
    pub reps: i64,
    pub lapses: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
pub struct SessionRowData {
    pub id: String,
    pub deck_id: Option<String>,
    pub started_at: String,
    pub ended_at: String,
    pub cards_studied: i64,
}

#[derive(Deserialize)]
pub struct ReviewLogRowData {
    pub id: String,
    pub card_id: String,
    pub rating: String,
    pub review_date: String,
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i64,
    pub scheduled_days: i64,
}

#[derive(Deserialize)]
pub struct SettingRowData {
    pub key: String,
    pub value: String,
}

/// Row data for record_review_atomic.
#[derive(Deserialize)]
pub struct RecordReviewData {
    pub card_id: String,
    pub state: String,
    pub last_review_date: Option<String>,
    pub next_review_date: String,
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i64,
    pub scheduled_days: i64,
    pub reps: i64,
    pub lapses: i64,
    pub updated_at: String,
    pub review_log_id: String,
    pub review_card_id: String,
    pub rating: String,
    pub review_date: String,
    pub review_stability: f64,
    pub review_difficulty: f64,
    pub review_elapsed_days: i64,
    pub review_scheduled_days: i64,
    pub session: Option<SessionRowData>,
}

/// Open a dedicated rusqlite connection with proper PRAGMAs.
fn open_db_connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = data_dir.join("recall.db");

    if !db_path.exists() {
        return Err(format!("Database file not found: {}", db_path.display()));
    }

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA busy_timeout=30000;
         PRAGMA foreign_keys=ON;",
    )
    .map_err(|e| format!("Failed to set PRAGMAs: {}", e))?;

    // Verify foreign keys are actually enabled
    let fk_on: i32 = conn
        .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    if fk_on != 1 {
        return Err("Failed to enable foreign_keys enforcement".to_string());
    }

    Ok(conn)
}

/// Atomically replace all data with the provided snapshot.
/// Uses BEGIN IMMEDIATE for a real write-lock transaction.
/// If any statement fails, the entire operation rolls back.
#[tauri::command]
pub async fn save_snapshot_atomic(app: tauri::AppHandle, data: SnapshotRows) -> Result<(), String> {
    let conn = open_db_connection(&app)?;

    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| format!("BEGIN failed: {}", e))?;

    // Delete all existing data (order matters due to foreign keys)
    if let Err(e) = conn.execute_batch(
        "DELETE FROM review_logs;
         DELETE FROM study_sessions;
         DELETE FROM cards;
         DELETE FROM decks;
         DELETE FROM settings;",
    ) {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(format!("DELETE failed: {}", e));
    }

    // Insert decks
    for deck in &data.decks {
        if let Err(e) = conn.execute(
            "INSERT INTO decks (id, name, description, color, exam_deadline, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                deck.id, deck.name, deck.description, deck.color,
                deck.exam_deadline, deck.created_at, deck.updated_at,
            ],
        ) {
            let _ = conn.execute_batch("ROLLBACK");
            return Err(format!("INSERT deck '{}' failed: {}", deck.id, e));
        }
    }

    // Insert cards
    for card in &data.cards {
        if let Err(e) = conn.execute(
            "INSERT INTO cards (id, deck_id, front, back, hint, source, tags, card_type, state,
             last_review_date, next_review_date, stability, difficulty, elapsed_days,
             scheduled_days, reps, lapses, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            rusqlite::params![
                card.id, card.deck_id, card.front, card.back, card.hint, card.source,
                card.tags, card.card_type, card.state, card.last_review_date,
                card.next_review_date, card.stability, card.difficulty, card.elapsed_days,
                card.scheduled_days, card.reps, card.lapses, card.created_at, card.updated_at,
            ],
        ) {
            let _ = conn.execute_batch("ROLLBACK");
            return Err(format!("INSERT card '{}' failed: {}", card.id, e));
        }
    }

    // Insert study sessions
    for session in &data.study_sessions {
        if let Err(e) = conn.execute(
            "INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                session.id,
                session.deck_id,
                session.started_at,
                session.ended_at,
                session.cards_studied,
            ],
        ) {
            let _ = conn.execute_batch("ROLLBACK");
            return Err(format!("INSERT session '{}' failed: {}", session.id, e));
        }
    }

    // Insert review logs
    for log in &data.review_logs {
        if let Err(e) = conn.execute(
            "INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                log.id, log.card_id, log.rating, log.review_date,
                log.stability, log.difficulty, log.elapsed_days, log.scheduled_days,
            ],
        ) {
            let _ = conn.execute_batch("ROLLBACK");
            return Err(format!("INSERT review_log '{}' failed: {}", log.id, e));
        }
    }

    // Insert settings
    for setting in &data.settings {
        if let Err(e) = conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)",
            rusqlite::params![setting.key, setting.value],
        ) {
            let _ = conn.execute_batch("ROLLBACK");
            return Err(format!("INSERT setting '{}' failed: {}", setting.key, e));
        }
    }

    conn.execute_batch("COMMIT")
        .map_err(|e| format!("COMMIT failed: {}", e))?;

    Ok(())
}

/// Atomically record a review: update card scheduling + insert review log + optional session.
/// All three operations happen in a single transaction; any failure rolls back everything.
#[tauri::command]
pub async fn record_review_atomic(
    app: tauri::AppHandle,
    data: RecordReviewData,
) -> Result<(), String> {
    let conn = open_db_connection(&app)?;

    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| format!("BEGIN failed: {}", e))?;

    // Update card scheduling
    if let Err(e) = conn.execute(
        "UPDATE cards SET state=?1, last_review_date=?2, next_review_date=?3,
         stability=?4, difficulty=?5, elapsed_days=?6, scheduled_days=?7,
         reps=?8, lapses=?9, updated_at=?10 WHERE id=?11",
        rusqlite::params![
            data.state,
            data.last_review_date,
            data.next_review_date,
            data.stability,
            data.difficulty,
            data.elapsed_days,
            data.scheduled_days,
            data.reps,
            data.lapses,
            data.updated_at,
            data.card_id,
        ],
    ) {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(format!("UPDATE card '{}' failed: {}", data.card_id, e));
    }

    // Verify the card was actually updated (not silently no-op'd)
    let changes = conn.changes();
    if changes == 0 {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(format!(
            "Card '{}' not found for review update",
            data.card_id
        ));
    }

    // Insert review log
    if let Err(e) = conn.execute(
        "INSERT INTO review_logs (id, card_id, rating, review_date, stability, difficulty, elapsed_days, scheduled_days)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            data.review_log_id, data.review_card_id, data.rating, data.review_date,
            data.review_stability, data.review_difficulty,
            data.review_elapsed_days, data.review_scheduled_days,
        ],
    ) {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(format!(
            "INSERT review_log '{}' failed: {}",
            data.review_log_id, e
        ));
    }

    // Insert study session if provided
    if let Some(session) = &data.session {
        if let Err(e) = conn.execute(
            "INSERT INTO study_sessions (id, deck_id, started_at, ended_at, cards_studied)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                session.id,
                session.deck_id,
                session.started_at,
                session.ended_at,
                session.cards_studied,
            ],
        ) {
            let _ = conn.execute_batch("ROLLBACK");
            return Err(format!("INSERT session '{}' failed: {}", session.id, e));
        }
    }

    conn.execute_batch("COMMIT")
        .map_err(|e| format!("COMMIT failed: {}", e))?;

    Ok(())
}

/// Create a pre-restore safety backup of the current database.
/// Checkpoints WAL first to ensure backup contains all committed changes.
/// Returns the backup file path on success.
#[tauri::command]
pub async fn create_safety_backup(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = data_dir.join("recall.db");

    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    // Checkpoint WAL to flush all pending changes into the main DB file.
    // Without this, the copy could be stale if changes are still in the -wal file.
    let db_path_str = db_path.to_string_lossy().to_string();
    let conn = rusqlite::Connection::open(&db_path_str)
        .map_err(|e| format!("Failed to open DB for checkpoint: {}", e))?;
    conn.pragma_update(None, "wal_checkpoint", "FULL")
        .map_err(|e| format!("WAL checkpoint failed: {}", e))?;
    drop(conn);

    let timestamp = chrono_lite_timestamp();
    let backup_name = format!("recall-pre-restore-{}.db", timestamp);
    let backup_path = data_dir.join(&backup_name);

    std::fs::copy(&db_path, &backup_path).map_err(|e| format!("Backup copy failed: {}", e))?;

    // Keep only the last 5 safety backups
    cleanup_old_backups(&data_dir, 5);

    Ok(backup_path.display().to_string())
}

/// Generate a simple timestamp string without pulling in the chrono crate.
fn chrono_lite_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{}", secs)
}

/// Atomically upsert a single deck (insert or update).
#[tauri::command]
pub async fn upsert_deck_atomic(app: tauri::AppHandle, deck: DeckRowData) -> Result<(), String> {
    let conn = open_db_connection(&app)?;

    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| format!("BEGIN failed: {}", e))?;

    if let Err(e) = conn.execute(
        "INSERT INTO decks (id, name, description, color, exam_deadline, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, description=excluded.description, color=excluded.color,
           exam_deadline=excluded.exam_deadline, updated_at=excluded.updated_at",
        rusqlite::params![
            deck.id, deck.name, deck.description, deck.color,
            deck.exam_deadline, deck.created_at, deck.updated_at,
        ],
    ) {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(format!("UPSERT deck '{}' failed: {}", deck.id, e));
    }

    conn.execute_batch("COMMIT")
        .map_err(|e| format!("COMMIT failed: {}", e))?;

    Ok(())
}

/// Atomically upsert a single card (insert or update).
#[tauri::command]
pub async fn upsert_card_atomic(app: tauri::AppHandle, card: CardRowData) -> Result<(), String> {
    let conn = open_db_connection(&app)?;

    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| format!("BEGIN failed: {}", e))?;

    if let Err(e) = conn.execute(
        "INSERT INTO cards (id, deck_id, front, back, hint, source, tags, card_type, state,
         last_review_date, next_review_date, stability, difficulty, elapsed_days,
         scheduled_days, reps, lapses, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)
         ON CONFLICT(id) DO UPDATE SET
           deck_id=excluded.deck_id, front=excluded.front, back=excluded.back, hint=excluded.hint,
           source=excluded.source, tags=excluded.tags, card_type=excluded.card_type, state=excluded.state,
           last_review_date=excluded.last_review_date, next_review_date=excluded.next_review_date,
           stability=excluded.stability, difficulty=excluded.difficulty, elapsed_days=excluded.elapsed_days,
           scheduled_days=excluded.scheduled_days, reps=excluded.reps, lapses=excluded.lapses,
           updated_at=excluded.updated_at",
        rusqlite::params![
            card.id, card.deck_id, card.front, card.back, card.hint, card.source,
            card.tags, card.card_type, card.state, card.last_review_date,
            card.next_review_date, card.stability, card.difficulty, card.elapsed_days,
            card.scheduled_days, card.reps, card.lapses, card.created_at, card.updated_at,
        ],
    ) {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(format!("UPSERT card '{}' failed: {}", card.id, e));
    }

    conn.execute_batch("COMMIT")
        .map_err(|e| format!("COMMIT failed: {}", e))?;

    Ok(())
}

/// Atomically delete a deck and all its cards (cascades).
#[tauri::command]
pub async fn delete_deck_atomic(app: tauri::AppHandle, deck_id: String) -> Result<(), String> {
    let conn = open_db_connection(&app)?;

    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| format!("BEGIN failed: {}", e))?;

    // Delete cards first (foreign key constraint)
    if let Err(e) = conn.execute("DELETE FROM cards WHERE deck_id = ?1", rusqlite::params![deck_id]) {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(format!("DELETE cards for deck '{}' failed: {}", deck_id, e));
    }

    // Delete deck
    if let Err(e) = conn.execute("DELETE FROM decks WHERE id = ?1", rusqlite::params![deck_id]) {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(format!("DELETE deck '{}' failed: {}", deck_id, e));
    }

    conn.execute_batch("COMMIT")
        .map_err(|e| format!("COMMIT failed: {}", e))?;

    Ok(())
}

/// Atomically delete a single card.
#[tauri::command]
pub async fn delete_card_atomic(app: tauri::AppHandle, card_id: String) -> Result<(), String> {
    let conn = open_db_connection(&app)?;

    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| format!("BEGIN failed: {}", e))?;

    if let Err(e) = conn.execute("DELETE FROM cards WHERE id = ?1", rusqlite::params![card_id]) {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(format!("DELETE card '{}' failed: {}", card_id, e));
    }

    conn.execute_batch("COMMIT")
        .map_err(|e| format!("COMMIT failed: {}", e))?;

    Ok(())
}

/// Atomically upsert a single setting (insert or update).
#[tauri::command]
pub async fn upsert_setting_atomic(app: tauri::AppHandle, setting: SettingRowData) -> Result<(), String> {
    let conn = open_db_connection(&app)?;

    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| format!("BEGIN failed: {}", e))?;

    if let Err(e) = conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        rusqlite::params![setting.key, setting.value],
    ) {
        let _ = conn.execute_batch("ROLLBACK");
        return Err(format!("UPSERT setting '{}' failed: {}", setting.key, e));
    }

    conn.execute_batch("COMMIT")
        .map_err(|e| format!("COMMIT failed: {}", e))?;

    Ok(())
}

/// Remove old safety backups, keeping only the newest `keep` files.
fn cleanup_old_backups(data_dir: &std::path::Path, keep: usize) {
    let mut backups: Vec<_> = std::fs::read_dir(data_dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .starts_with("recall-pre-restore-")
        })
        .collect();

    backups.sort_by_key(|e| std::cmp::Reverse(e.metadata().and_then(|m| m.modified()).ok()));

    for old in backups.into_iter().skip(keep) {
        let _ = std::fs::remove_file(old.path());
    }
}
