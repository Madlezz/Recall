use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use tempfile::tempdir;
use zip::ZipArchive;

#[derive(Serialize, Deserialize)]
pub struct AnkiCard {
    pub deck_name: String,
    pub front: String,
    pub back: String,
    pub tags: Vec<String>,
}

/// Parse deck name mappings from the col table's decks JSON blob (Anki 2.1+ format).
/// Returns a map of deck_id -> deck_name.
fn parse_deck_map(conn: &rusqlite::Connection) -> Result<HashMap<String, String>, String> {
    let mut deck_map = HashMap::new();

    // Try to read the col table (Anki 2.1+ stores deck metadata as JSON)
    let decks_json: Result<String, _> = conn.query_row(
        "SELECT decks FROM col LIMIT 1",
        [],
        |row| row.get(0),
    );

    if let Ok(json_str) = decks_json {
        // Parse the JSON: it's a map of deck_id -> deck_object
        if let Ok(decks) = serde_json::from_str::<HashMap<String, serde_json::Value>>(&json_str) {
            for (id, deck_obj) in decks {
                if let Some(name) = deck_obj.get("name").and_then(|v| v.as_str()) {
                    // Anki uses "::" as separator for nested decks (e.g., "Japanese::Vocabulary::N5")
                    // We flatten to the leaf name for simplicity
                    let flat_name = name.split("::").last().unwrap_or(name);
                    deck_map.insert(id, flat_name.to_string());
                }
            }
        }
    }

    Ok(deck_map)
}

/// Try to parse cards using the modern Anki 2.1+ format (col table with deck JSON).
fn parse_anki21(conn: &rusqlite::Connection) -> Result<Vec<AnkiCard>, String> {
    let deck_map = parse_deck_map(conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT n.flds, n.tags, c.did
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
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for card in cards {
        result.push(card.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

/// Try to parse cards using the legacy Anki 2.0 format (separate decks table).
fn parse_anki20(conn: &rusqlite::Connection) -> Result<Vec<AnkiCard>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT n.flds, n.tags, d.name
             FROM notes n
             JOIN cards c ON c.nid = n.id
             JOIN decks d ON c.did = d.id",
        )
        .map_err(|e| e.to_string())?;

    let cards = stmt
        .query_map([], |row| {
            let fields: String = row.get(0)?;
            let parts: Vec<&str> = fields.split('\x1f').collect();
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
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for card in cards {
        result.push(card.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
pub async fn parse_anki_apkg(file_path: String) -> Result<Vec<AnkiCard>, String> {
    let temp_dir = tempdir().map_err(|e| e.to_string())?;

    let file = File::open(&file_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

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

    let db_path = temp_dir.path().join(collection_name);
    let mut db_file = File::create(&db_path).map_err(|e| e.to_string())?;
    std::io::copy(&mut collection_entry, &mut db_file).map_err(|e| e.to_string())?;

    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Try Anki 2.1+ format first (col table with deck JSON), fall back to legacy (decks table)
    match parse_anki21(&conn) {
        Ok(cards) if !cards.is_empty() => Ok(cards),
        _ => parse_anki20(&conn),
    }
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
             CREATE TABLE cards (id INTEGER PRIMARY KEY, nid INTEGER, did INTEGER);",
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

        // Insert cards referencing the decks
        conn.execute("INSERT INTO cards (id, nid, did) VALUES (1, 1, 12345)", [])
            .unwrap();
        conn.execute("INSERT INTO cards (id, nid, did) VALUES (2, 2, 67890)", [])
            .unwrap();

        conn
    }

    #[test]
    fn test_parse_deck_map_flattens_nested_names() {
        let conn = setup_anki21_conn();
        let map = parse_deck_map(&conn).unwrap();
        assert_eq!(map.get("12345").unwrap(), "N5");
        assert_eq!(map.get("67890").unwrap(), "Math");
    }

    #[test]
    fn test_parse_anki21_extracts_cards_with_deck_resolution() {
        let conn = setup_anki21_conn();
        let cards = parse_anki21(&conn).unwrap();

        assert_eq!(cards.len(), 2);

        // Card 1: Japanese deck, front/back split by \x1f, tags parsed
        let c1 = cards.iter().find(|c| c.front == "Hello").unwrap();
        assert_eq!(c1.deck_name, "N5");
        assert_eq!(c1.back, "こんにちは");
        assert_eq!(c1.tags, vec!["vocab", "jlpt"]);

        // Card 2: Math deck
        let c2 = cards.iter().find(|c| c.front == "2+2=?").unwrap();
        assert_eq!(c2.deck_name, "Math");
        assert_eq!(c2.back, "4");
        assert_eq!(c2.tags, vec!["math"]);
    }

    #[test]
    fn test_parse_anki21_handles_missing_deck_id() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE col (decks TEXT);
             CREATE TABLE notes (id INTEGER PRIMARY KEY, flds TEXT, tags TEXT);
             CREATE TABLE cards (id INTEGER PRIMARY KEY, nid INTEGER, did INTEGER);
             INSERT INTO col (decks) VALUES ('{}');
             INSERT INTO notes (id, flds, tags) VALUES (1, 'front\x1fback', 'tag');
             INSERT INTO cards (id, nid, did) VALUES (1, 1, 99999);",
        )
        .unwrap();

        let cards = parse_anki21(&conn).unwrap();
        assert_eq!(cards.len(), 1);
        assert_eq!(cards[0].deck_name, "Default"); // Falls back to Default
    }
}
