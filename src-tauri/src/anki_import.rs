use serde::{Deserialize, Serialize};
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

#[tauri::command]
pub async fn parse_anki_apkg(file_path: String) -> Result<Vec<AnkiCard>, String> {
    let temp_dir = tempdir().map_err(|e| e.to_string())?;

    let file = File::open(&file_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut collection_file = archive
        .by_name("collection.anki2")
        .map_err(|_| "Invalid .apkg: missing collection.anki2".to_string())?;

    let db_path = temp_dir.path().join("collection.anki2");
    let mut db_file = File::create(&db_path).map_err(|e| e.to_string())?;
    std::io::copy(&mut collection_file, &mut db_file).map_err(|e| e.to_string())?;

    let conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT n.flds, n.tags, m.name
             FROM notes n
             JOIN models m ON n.mid = m.id
             JOIN cards c ON c.nid = n.id
             LIMIT 1000",
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
