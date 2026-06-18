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
            let did: String = row.get(2).unwrap_or_default();
            let deck_name = deck_map
                .get(&did)
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
