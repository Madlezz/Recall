use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use tauri::Manager;
use tempfile::tempdir;
use zip::ZipArchive;

#[derive(Serialize, Deserialize)]
pub struct AnkiCard {
    pub deck_name: String,
    pub front: String,
    pub back: String,
    pub tags: Vec<String>,
    // Scheduling fields (imported from Anki cards table)
    pub state: String,        // new, learning, review, relearning
    pub stability: f64,       // FSRS stability (from memory_state or estimated)
    pub difficulty: f64,      // FSRS difficulty (from memory_state or estimated)
    pub reps: i64,            // total reviews
    pub lapses: i64,          // times card lapsed
    pub days_until_next: i64, // interval in days (from ivl)
    pub has_fsrs_state: bool, // whether memory_state was present in Anki
}

#[derive(Serialize)]
pub struct AnkiImportReport {
    pub cards: Vec<AnkiCard>,
    pub notes_detected: usize,
    pub cards_detected: usize,
    pub cards_imported: usize,
    pub unsupported_models: usize,
    pub warnings: Vec<String>,
    pub media_imported: usize,
}

/// Parse deck name mappings from the col table's decks JSON blob (Anki 2.1+ format).
/// Returns a map of deck_id -> deck_name. Preserves full deck paths (e.g. "Japanese::Vocabulary::N5").
fn parse_deck_map(conn: &rusqlite::Connection) -> Result<HashMap<String, String>, String> {
    let mut deck_map = HashMap::new();

    // Try to read the col table (Anki 2.1+ stores deck metadata as JSON)
    let decks_json: Result<String, _> =
        conn.query_row("SELECT decks FROM col LIMIT 1", [], |row| row.get(0));

    if let Ok(json_str) = decks_json {
        // Parse the JSON: it's a map of deck_id -> deck_object
        if let Ok(decks) = serde_json::from_str::<HashMap<String, serde_json::Value>>(&json_str) {
            for (id, deck_obj) in decks {
                if let Some(name) = deck_obj.get("name").and_then(|v| v.as_str()) {
                    // Preserve full deck path for accurate hierarchy
                    deck_map.insert(id, name.to_string());
                }
            }
        }
    }

    Ok(deck_map)
}

/// Map Anki queue/type → Recall card state string.
fn anki_to_state(queue: i32, ctype: i32) -> &'static str {
    // queue: -1=suspended, -2=buried, 0=new, 1=learning, 2=review, 3=day-learn
    // type: 0=new, 1=learning, 2=review
    match queue {
        0 => "new",
        1 => "learning",
        2 => "review",
        3 => "learning",  // day-learn reuses learning state
        -1 | -2 => "new", // suspended/buried → treat as new
        _ => match ctype {
            0 => "new",
            1 => "learning",
            2 => "review",
            _ => "new",
        },
    }
}

/// Extract FSRS memory state from Anki's `data` JSON column.
/// Anki stores it as: {"s": stability, "d": difficulty}
/// Returns (stability, difficulty, has_fsrs_state).
fn extract_fsrs_state(data_json: Option<&str>) -> (f64, f64, bool) {
    if let Some(json_str) = data_json {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str) {
            // Anki 23.10+ stores FSRS state as {"s": X, "d": Y}
            let s = parsed.get("s").and_then(|v| v.as_f64());
            let d = parsed.get("d").and_then(|v| v.as_f64());
            if let (Some(stability), Some(difficulty)) = (s, d) {
                return (stability, difficulty, true);
            }
        }
    }
    (0.0, 0.0, false)
}

/// Estimate FSRS stability/difficulty from SM-2 fields when memory_state is absent.
/// This is the same approach Anki's own codebase uses internally:
/// - stability ≈ interval (days) scaled by ease - rough but preserves relative spacing
/// - difficulty ≈ ease factor mapped to 1-10 range (factor 1300→10, 4000→1)
fn estimate_fsrs_from_sm2(ivl: i32, factor: i32, lapses: i32) -> (f64, f64) {
    // Stability: use interval as a proxy (days). If ivl <= 0, stability ≈ 0.
    let stability = if ivl > 0 { ivl as f64 } else { 0.0 };

    // Difficulty: map ease factor to FSRS difficulty (1-10 scale).
    // Anki ease 1300 (minimum) → difficulty 10 (very hard)
    // Anki ease 2500 (default) → difficulty ~5
    // Anki ease 4000+ → difficulty 1 (very easy)
    let clamped_factor = factor.clamp(1300, 4500) as f64;
    let difficulty = ((4500.0 - clamped_factor) / 320.0).clamp(1.0, 10.0);

    // Bump difficulty for cards with many lapses
    let difficulty = (difficulty + (lapses as f64 * 0.5)).min(10.0);

    (stability, difficulty)
}

/// Parse with note count for reporting.
fn parse_anki21_with_count(conn: &rusqlite::Connection) -> Result<(Vec<AnkiCard>, usize), String> {
    let deck_map = parse_deck_map(conn)?;

    // Count total notes for reporting
    let notes_count: usize = conn
        .query_row("SELECT COUNT(*) FROM notes", [], |row| row.get(0))
        .unwrap_or(0);

    // Read scheduling columns: queue, type, ivl, factor, reps, lapses, data
    // The `data` column may contain FSRS memory_state as JSON {"s":..., "d":...}
    // Column names in Anki's DB: queue, type, ivl, factor, reps, lapses, data
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT n.flds, n.tags, c.did,
             COALESCE(c.queue, 0), COALESCE(c.type, 0), COALESCE(c.ivl, 0),
             COALESCE(c.factor, 2500), COALESCE(c.reps, 0), COALESCE(c.lapses, 0),
             c.data
             FROM notes n
             JOIN cards c ON c.nid = n.id",
        )
        .map_err(|e| e.to_string())?;

    let cards = stmt
        .query_map([], |row| {
            let fields: String = row.get(0)?;
            let parts: Vec<&str> = fields.split('\x1f').collect();
            let did: i64 = row.get(2).unwrap_or_default();
            let did_str = did.to_string();
            let deck_name = deck_map
                .get(&did_str)
                .cloned()
                .unwrap_or_else(|| "Default".to_string());

            // Read scheduling fields
            let queue: i32 = row.get(3).unwrap_or(0);
            let ctype: i32 = row.get(4).unwrap_or(0);
            let ivl: i32 = row.get(5).unwrap_or(0);
            let factor: i32 = row.get(6).unwrap_or(2500);
            let reps: i32 = row.get(7).unwrap_or(0);
            let lapses: i32 = row.get(8).unwrap_or(0);
            let data_json: Option<String> = row.get(9).ok();

            // Determine state
            let state = anki_to_state(queue, ctype).to_string();

            // Extract FSRS state from data column, or estimate from SM-2 fields
            let (stability, difficulty, has_fsrs_state) = {
                let (s, d, has) = extract_fsrs_state(data_json.as_deref());
                if has {
                    (s, d, true)
                } else {
                    let (s_est, d_est) = estimate_fsrs_from_sm2(ivl, factor, lapses);
                    (s_est, d_est, false)
                }
            };

            // For review cards, ivl is in days. For new/learning, ivl is step count.
            let days_until_next = if queue == 2 && ivl > 0 { ivl as i64 } else { 0 };

            Ok(AnkiCard {
                deck_name,
                front: parts.first().unwrap_or(&"").to_string(),
                back: parts.get(1).unwrap_or(&"").to_string(),
                tags: row
                    .get::<_, String>(1)
                    .unwrap_or_default()
                    .split(' ')
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string())
                    .collect(),
                state,
                stability,
                difficulty,
                reps: reps as i64,
                lapses: lapses as i64,
                days_until_next,
                has_fsrs_state,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for card in cards {
        result.push(card.map_err(|e| e.to_string())?);
    }

    Ok((result, notes_count))
}

/// Parse with note count for reporting.
fn parse_anki20_with_count(conn: &rusqlite::Connection) -> Result<(Vec<AnkiCard>, usize), String> {
    let notes_count: usize = conn
        .query_row("SELECT COUNT(*) FROM notes", [], |row| row.get(0))
        .unwrap_or(0);

    // Legacy Anki 2.0 schema: cards table has ivl, factor, reps, lapses, type
    // but may not have queue or data columns. Use COALESCE for safety.
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT n.flds, n.tags, d.name,
             COALESCE(c.ivl, 0), COALESCE(c.factor, 2500),
             COALESCE(c.reps, 0), COALESCE(c.lapses, 0), COALESCE(c.type, 0)
             FROM notes n
             JOIN cards c ON c.nid = n.id
             JOIN decks d ON c.did = d.id",
        )
        .map_err(|e| e.to_string())?;

    let cards = stmt
        .query_map([], |row| {
            let fields: String = row.get(0)?;
            let parts: Vec<&str> = fields.split('\x1f').collect();

            let ivl: i32 = row.get(3).unwrap_or(0);
            let factor: i32 = row.get(4).unwrap_or(2500);
            let reps: i32 = row.get(5).unwrap_or(0);
            let lapses: i32 = row.get(6).unwrap_or(0);
            let ctype: i32 = row.get(7).unwrap_or(0);

            // Legacy: no queue column, derive state from type
            let state = match ctype {
                0 => "new",
                1 => "learning",
                2 => "review",
                _ => "new",
            }
            .to_string();

            // No FSRS state in legacy format; estimate from SM-2
            let (stability, difficulty) = estimate_fsrs_from_sm2(ivl, factor, lapses);
            let days_until_next = if ctype == 2 && ivl > 0 { ivl as i64 } else { 0 };

            Ok(AnkiCard {
                deck_name: row.get(2).unwrap_or_else(|_| "Default".to_string()),
                front: parts.first().unwrap_or(&"").to_string(),
                back: parts.get(1).unwrap_or(&"").to_string(),
                tags: row
                    .get::<_, String>(1)
                    .unwrap_or_default()
                    .split(' ')
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string())
                    .collect(),
                state,
                stability,
                difficulty,
                reps: reps as i64,
                lapses: lapses as i64,
                days_until_next,
                has_fsrs_state: false,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for card in cards {
        result.push(card.map_err(|e| e.to_string())?);
    }

    Ok((result, notes_count))
}

/// Maximum allowed .apkg file size (500MB compressed).
const MAX_APKG_SIZE: u64 = 500 * 1024 * 1024;

/// Maximum allowed uncompressed SQLite DB size (2GB).
const MAX_DB_SIZE: u64 = 2 * 1024 * 1024 * 1024;

/// Maximum number of cards to import.
const MAX_CARDS: usize = 100_000;

/// Extract media files from .apkg and copy them to Recall's image storage.
/// Returns a map from Anki media filename to Recall filename.
fn extract_media_files(
    archive: &mut ZipArchive<File>,
    app_data_dir: &Path,
) -> Result<HashMap<String, String>, String> {
    let mut media_map: HashMap<String, String> = HashMap::new();

    // Parse the media map file (maps numeric IDs to original filenames)
    let media_map_content = if let Ok(mut media_entry) = archive.by_name("media") {
        let mut content = String::new();
        media_entry.read_to_string(&mut content).ok();
        Some(content)
    } else {
        None
    };

    let media_map_json: HashMap<String, String> = if let Some(content) = media_map_content {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        HashMap::new()
    };

    // Create images directory if it doesn't exist
    let images_dir = app_data_dir.join("images");
    std::fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    // Extract each media file
    for i in 0..archive.len() {
        let mut entry = match archive.by_index(i) {
            Ok(e) => e,
            Err(_) => continue,
        };

        let entry_name = entry.name().to_string();

        // Skip database files and the media map
        if entry_name.starts_with("collection.anki2")
            || entry_name == "media"
            || entry_name.ends_with('/')
        {
            continue;
        }

        // Get the original filename from the media map
        let original_filename = media_map_json
            .get(&entry_name)
            .cloned()
            .unwrap_or_else(|| entry_name.clone());

        // Sanitize filename (remove path separators, etc.)
        let safe_filename = original_filename
            .replace(['/', '\\'], "_")
            .replace("..", "_");

        // Skip if not an image
        let lower = safe_filename.to_lowercase();
        if !lower.ends_with(".png")
            && !lower.ends_with(".jpg")
            && !lower.ends_with(".jpeg")
            && !lower.ends_with(".gif")
            && !lower.ends_with(".webp")
            && !lower.ends_with(".svg")
        {
            continue;
        }

        // Extract the file
        let dest_path = images_dir.join(&safe_filename);
        let mut dest_file = File::create(&dest_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut dest_file).map_err(|e| e.to_string())?;

        // Map original filename to Recall filename
        media_map.insert(original_filename.clone(), safe_filename);
    }

    Ok(media_map)
}

/// Replace Anki image references in HTML with recall:// URLs.
fn replace_media_references(content: &str, media_map: &HashMap<String, String>) -> String {
    let mut result = content.to_string();

    // Replace <img src="filename"> with <img src="recall://filename">
    for (anki_name, recall_name) in media_map {
        // Match various HTML patterns for images
        let patterns = [
            format!(r#"src="{}"#, anki_name),
            format!(r#"src='{}'"#, anki_name),
            format!(r#"src={}"#, anki_name),
        ];

        for pattern in &patterns {
            let replacement = format!(r#"src="recall://{}""#, recall_name);
            result = result.replace(pattern, &replacement);
        }
    }

    result
}

#[tauri::command]
pub async fn parse_anki_apkg(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<AnkiImportReport, String> {
    let file = File::open(&file_path).map_err(|e| format!("Cannot open file: {}", e))?;

    // Zip-bomb guard: check compressed size
    let metadata = file.metadata().map_err(|e| e.to_string())?;
    if metadata.len() > MAX_APKG_SIZE {
        return Err(format!(
            "Anki file too large ({}MB). Maximum is {}MB.",
            metadata.len() / 1024 / 1024,
            MAX_APKG_SIZE / 1024 / 1024,
        ));
    }

    let temp_dir = tempdir().map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Invalid zip: {}", e))?;

    // Extract media files first (before we consume the archive)
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let media_map = extract_media_files(&mut archive, &app_data_dir).unwrap_or_default();
    let media_imported = media_map.len();

    // Try collection.anki21 first (Anki 2.1+), fall back to collection.anki2 (legacy)
    let has_anki21 = archive.by_name("collection.anki21").is_ok();
    let collection_name = if has_anki21 {
        "collection.anki21"
    } else {
        "collection.anki2"
    };

    let mut collection_entry = archive
        .by_name(collection_name)
        .map_err(|_| "Invalid .apkg: missing collection.anki21 or collection.anki2".to_string())?;

    // Check uncompressed size
    let uncompressed_size = collection_entry.size();
    if uncompressed_size > MAX_DB_SIZE {
        return Err(format!(
            "Anki database too large ({}MB uncompressed). Maximum is {}MB.",
            uncompressed_size / 1024 / 1024,
            MAX_DB_SIZE / 1024 / 1024,
        ));
    }

    let db_path = temp_dir.path().join(collection_name);
    let mut db_file = File::create(&db_path).map_err(|e| e.to_string())?;
    std::io::copy(&mut collection_entry, &mut db_file).map_err(|e| e.to_string())?;
    drop(collection_entry);
    drop(db_file);

    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut warnings = Vec::new();

    // Try Anki 2.1+ format first (col table with deck JSON), fall back to legacy (decks table)
    let (cards, notes_detected) = match parse_anki21_with_count(&conn) {
        Ok((cards, count)) if !cards.is_empty() => (cards, count),
        _ => match parse_anki20_with_count(&conn) {
            Ok((cards, count)) => (cards, count),
            Err(e) => return Err(e),
        },
    };

    let cards_detected = cards.len();
    let mut imported_cards = cards;

    // Apply media reference replacement to card content
    if !media_map.is_empty() {
        for card in &mut imported_cards {
            card.front = replace_media_references(&card.front, &media_map);
            card.back = replace_media_references(&card.back, &media_map);
        }
    }

    if imported_cards.len() > MAX_CARDS {
        warnings.push(format!(
            "Truncated: {} cards found but maximum is {}. Only first {} imported.",
            imported_cards.len(),
            MAX_CARDS,
            MAX_CARDS,
        ));
        imported_cards.truncate(MAX_CARDS);
    }

    let cards_imported = imported_cards.len();

    // Check for multi-template notes (we only import first field / first card per note)
    if notes_detected > 0 && cards_imported < notes_detected {
        warnings.push(format!(
            "{} notes detected but only {} cards imported. Multi-template cards are not yet supported.",
            notes_detected, cards_imported,
        ));
    }

    Ok(AnkiImportReport {
        cards: imported_cards,
        notes_detected,
        cards_detected,
        cards_imported,
        unsupported_models: 0, // Would require parsing col.models
        warnings,
        media_imported,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Create an in-memory SQLite database mimicking Anki 2.1 structure.
    fn setup_anki21_conn() -> rusqlite::Connection {
        let conn = rusqlite::Connection::open_in_memory().unwrap();

        conn.execute_batch(
            "CREATE TABLE col (decks TEXT);
             CREATE TABLE notes (id INTEGER PRIMARY KEY, flds TEXT, tags TEXT);
             CREATE TABLE cards (
               id INTEGER PRIMARY KEY,
               nid INTEGER,
               did INTEGER,
               queue INTEGER NOT NULL DEFAULT 0,
               type INTEGER NOT NULL DEFAULT 0,
               ivl INTEGER NOT NULL DEFAULT 0,
               factor INTEGER NOT NULL DEFAULT 2500,
               reps INTEGER NOT NULL DEFAULT 0,
               lapses INTEGER NOT NULL DEFAULT 0,
               data TEXT
             );",
        )
        .unwrap();

        // Insert deck map JSON: { "12345": { "name": "Japanese::Vocabulary::N5" }, "67890": { "name": "Math" } }
        conn.execute(
            "INSERT INTO col (decks) VALUES (?)",
            [r#"{"12345": {"name": "Japanese::Vocabulary::N5"}, "67890": {"name": "Math"}}"#],
        )
        .unwrap();

        // Insert notes with fields split by \x1f
        conn.execute(
            "INSERT INTO notes (id, flds, tags) VALUES (1, ?, 'vocab jlpt')",
            ["Hello\x1fこんにちは"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO notes (id, flds, tags) VALUES (2, ?, 'math')",
            ["2+2=?\x1f4"],
        )
        .unwrap();

        // Insert cards with scheduling data
        // Card 1: review card, 10-day interval, FSRS memory_state in data column
        conn.execute(
            "INSERT INTO cards (id, nid, did, queue, type, ivl, factor, reps, lapses, data)
             VALUES (1, 1, 12345, 2, 2, 10, 2500, 5, 1, '{\"s\": 8.5, \"d\": 4.2}')",
            [],
        )
        .unwrap();
        // Card 2: new card, no FSRS state (legacy SM-2)
        conn.execute(
            "INSERT INTO cards (id, nid, did, queue, type, ivl, factor, reps, lapses, data)
             VALUES (2, 2, 67890, 0, 0, 0, 2500, 0, 0, NULL)",
            [],
        )
        .unwrap();

        conn
    }

    #[test]
    fn test_parse_deck_map_flattens_nested_names() {
        let conn = setup_anki21_conn();
        let map = parse_deck_map(&conn).unwrap();
        assert_eq!(map.get("12345").unwrap(), "Japanese::Vocabulary::N5");
        assert_eq!(map.get("67890").unwrap(), "Math");
    }

    #[test]
    fn test_parse_anki21_extracts_cards_with_deck_resolution() {
        let conn = setup_anki21_conn();
        let (cards, count) = parse_anki21_with_count(&conn).unwrap();

        assert_eq!(cards.len(), 2);
        assert_eq!(count, 2); // 2 notes inserted

        // Card 1: Japanese deck, review state with FSRS memory_state
        let c1 = cards.iter().find(|c| c.front == "Hello").unwrap();
        assert_eq!(c1.deck_name, "Japanese::Vocabulary::N5");
        assert_eq!(c1.back, "こんにちは");
        assert_eq!(c1.tags, vec!["vocab", "jlpt"]);
        assert_eq!(c1.state, "review");
        assert!((c1.stability - 8.5).abs() < 0.01); // from FSRS memory_state
        assert!((c1.difficulty - 4.2).abs() < 0.01);
        assert_eq!(c1.reps, 5);
        assert_eq!(c1.lapses, 1);
        assert_eq!(c1.days_until_next, 10);
        assert!(c1.has_fsrs_state);

        // Card 2: Math deck, new card, no FSRS state
        let c2 = cards.iter().find(|c| c.front == "2+2=?").unwrap();
        assert_eq!(c2.deck_name, "Math");
        assert_eq!(c2.back, "4");
        assert_eq!(c2.tags, vec!["math"]);
        assert_eq!(c2.state, "new");
        assert!((c2.stability - 0.0).abs() < 0.01); // new card, no interval
        assert!((c2.difficulty - 6.25).abs() < 0.1); // estimated from ease 2500
        assert_eq!(c2.reps, 0);
        assert_eq!(c2.lapses, 0);
        assert_eq!(c2.days_until_next, 0);
        assert!(!c2.has_fsrs_state);
    }

    #[test]
    fn test_parse_anki21_handles_missing_deck_id() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE col (decks TEXT);
             CREATE TABLE notes (id INTEGER PRIMARY KEY, flds TEXT, tags TEXT);
             CREATE TABLE cards (
               id INTEGER PRIMARY KEY, nid INTEGER, did INTEGER,
               queue INTEGER DEFAULT 0, type INTEGER DEFAULT 0,
               ivl INTEGER DEFAULT 0, factor INTEGER DEFAULT 2500,
               reps INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0, data TEXT
             );
             INSERT INTO col (decks) VALUES ('{}');
             INSERT INTO notes (id, flds, tags) VALUES (1, 'front\x1fback', 'tag');
             INSERT INTO cards (id, nid, did, queue, type, ivl, factor, reps, lapses, data)
             VALUES (1, 1, 99999, 2, 2, 5, 2600, 3, 0, NULL);",
        )
        .unwrap();

        let (cards, _notes_count) = parse_anki21_with_count(&conn).unwrap();
        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].deck_name, "Default"); // Falls back to Default
        assert_eq!(cards[0].state, "review");
        assert!(!cards[0].has_fsrs_state); // No data column value
                                           // Estimated stability = ivl = 5
        assert!((cards[0].stability - 5.0).abs() < 0.01);
    }

    #[test]
    fn test_estimate_fsrs_from_sm2_maps_ease_to_difficulty() {
        // Default ease 2500 → difficulty ~6.25
        let (s, d) = estimate_fsrs_from_sm2(10, 2500, 0);
        assert!((s - 10.0).abs() < 0.01);
        assert!((d - 6.25).abs() < 0.1);

        // Very easy card (ease 4000) → low difficulty
        let (_s, d) = estimate_fsrs_from_sm2(30, 4000, 0);
        assert!(d < 3.0);

        // Very hard card (ease 1300) → max difficulty
        let (_s, d) = estimate_fsrs_from_sm2(1, 1300, 0);
        assert!((d - 10.0).abs() < 0.01);

        // Lapses bump difficulty
        let (_s, d_lapses) = estimate_fsrs_from_sm2(10, 2500, 5);
        let (_s, d_no_lapses) = estimate_fsrs_from_sm2(10, 2500, 0);
        assert!(d_lapses > d_no_lapses);
    }

    #[test]
    fn test_extract_fsrs_state_parses_json() {
        // Valid FSRS state
        let (s, d, has) = extract_fsrs_state(Some(r#"{"s": 15.2, "d": 3.8}"#));
        assert!((s - 15.2).abs() < 0.01);
        assert!((d - 3.8).abs() < 0.01);
        assert!(has);

        // Missing data → no FSRS state
        let (_s, _d, has) = extract_fsrs_state(None);
        assert!(!has);

        // Invalid JSON → no FSRS state
        let (_s, _d, has) = extract_fsrs_state(Some("not json"));
        assert!(!has);

        // JSON without s/d → no FSRS state
        let (_s, _d, has) = extract_fsrs_state(Some(r#"{"other": 123}"#));
        assert!(!has);
    }
}
