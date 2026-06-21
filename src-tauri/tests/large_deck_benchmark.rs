//! Benchmark test for large deck operations (10k cards).
//! This guards against performance regressions for A1/A2 optimizations.

use rusqlite::Connection;
use std::time::Instant;

/// Create the schema for an in-memory SQLite database.
fn create_schema(conn: &Connection) {
    conn.execute_batch(
        "
        CREATE TABLE decks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            color TEXT NOT NULL,
            exam_deadline TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE cards (
            id TEXT PRIMARY KEY,
            deck_id TEXT NOT NULL,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            hint TEXT NOT NULL,
            source TEXT NOT NULL,
            tags TEXT NOT NULL,
            card_type TEXT NOT NULL,
            state TEXT NOT NULL,
            last_review_date TEXT,
            next_review_date TEXT NOT NULL,
            stability REAL NOT NULL,
            difficulty REAL NOT NULL,
            elapsed_days INTEGER NOT NULL,
            scheduled_days INTEGER NOT NULL,
            reps INTEGER NOT NULL,
            lapses INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (deck_id) REFERENCES decks(id)
        );

        CREATE INDEX idx_cards_deck_id ON cards(deck_id);
        CREATE INDEX idx_cards_next_review_date ON cards(next_review_date);
        CREATE INDEX idx_cards_state ON cards(state);
        ",
    )
    .expect("Failed to create schema");
}

#[test]
fn test_large_deck_upsert_and_query_performance() {
    let conn = Connection::open_in_memory().expect("Failed to open in-memory DB");
    create_schema(&conn);

    // Create a test deck
    conn.execute(
        "INSERT INTO decks (id, name, description, color, exam_deadline, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            "deck-1",
            "Large Test Deck",
            "A deck with 10,000 cards for performance testing",
            "blue",
            None::<String>,
            "2026-01-01T00:00:00.000Z",
            "2026-01-01T00:00:00.000Z"
        ],
    )
    .expect("Failed to insert deck");

    // Benchmark: Insert 10,000 cards in a transaction
    let insert_start = Instant::now();
    {
        let tx = conn
            .unchecked_transaction()
            .expect("Failed to start transaction");

        {
            let mut stmt = tx
                .prepare(
                    "INSERT INTO cards (
                    id, deck_id, front, back, hint, source, tags, card_type, state,
                    last_review_date, next_review_date, stability, difficulty,
                    elapsed_days, scheduled_days, reps, lapses, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
                )
                .expect("Failed to prepare insert statement");

            for i in 0..10_000 {
                let card_id = format!("card-{}", i);
                let front = format!("Front of card {}", i);
                let back = format!("Back of card {}", i);
                let next_review = format!("2026-01-{:02}T00:00:00.000Z", (i % 28) + 1);

                stmt.execute(rusqlite::params![
                    card_id,
                    "deck-1",
                    front,
                    back,
                    "",
                    "",
                    "[]",
                    "basic",
                    "new",
                    None::<String>,
                    next_review,
                    0.0,
                    0.0,
                    0,
                    0,
                    0,
                    0,
                    "2026-01-01T00:00:00.000Z",
                    "2026-01-01T00:00:00.000Z"
                ])
                .expect("Failed to insert card");
            }
        } // stmt dropped here

        tx.commit().expect("Failed to commit transaction");
    }
    let insert_duration = insert_start.elapsed();

    println!(
        "Inserted 10,000 cards in {:?} ({:.2} cards/sec)",
        insert_duration,
        10_000.0 / insert_duration.as_secs_f64()
    );

    // Assert: Insert should complete in under 5 seconds (reasonable for in-memory DB)
    assert!(
        insert_duration.as_secs() < 5,
        "Insert took too long: {:?}",
        insert_duration
    );

    // Benchmark: Query all cards
    let query_start = Instant::now();
    let mut stmt = conn
        .prepare("SELECT COUNT(*) FROM cards WHERE deck_id = ?1")
        .expect("Failed to prepare count query");
    let count: i64 = stmt
        .query_row(rusqlite::params!["deck-1"], |row| row.get(0))
        .expect("Failed to count cards");
    let query_duration = query_start.elapsed();

    assert_eq!(count, 10_000, "Expected 10,000 cards");
    println!(
        "Queried card count in {:?} ({:.2} queries/sec)",
        query_duration,
        1.0 / query_duration.as_secs_f64()
    );

    // Benchmark: Query cards with filtering (simulating FSRS due card selection)
    let filter_start = Instant::now();
    let mut stmt = conn
        .prepare(
            "SELECT id, front, back FROM cards 
             WHERE deck_id = ?1 AND state = ?2 AND next_review_date <= ?3
             ORDER BY next_review_date ASC
             LIMIT 20",
        )
        .expect("Failed to prepare filter query");
    let due_cards: Vec<(String, String, String)> = stmt
        .query_map(
            rusqlite::params!["deck-1", "new", "2026-01-15T00:00:00.000Z"],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .expect("Failed to query due cards")
        .filter_map(|r| r.ok())
        .collect();
    let filter_duration = filter_start.elapsed();

    println!(
        "Queried {} due cards in {:?} ({:.2} queries/sec)",
        due_cards.len(),
        filter_duration,
        1.0 / filter_duration.as_secs_f64()
    );

    // Assert: Filter query should complete in under 100ms
    assert!(
        filter_duration.as_millis() < 100,
        "Filter query took too long: {:?}",
        filter_duration
    );

    // Benchmark: Update cards (simulating review session)
    let update_start = Instant::now();
    {
        let tx = conn
            .unchecked_transaction()
            .expect("Failed to start transaction");

        {
            let mut stmt = tx
                .prepare(
                    "UPDATE cards SET 
                    state = ?1, 
                    next_review_date = ?2,
                    stability = ?3,
                    difficulty = ?4,
                    reps = reps + 1,
                    updated_at = ?5
                 WHERE id = ?6",
                )
                .expect("Failed to prepare update statement");

            // Update first 100 cards (simulating a review session)
            for i in 0..100 {
                let card_id = format!("card-{}", i);
                stmt.execute(rusqlite::params![
                    "review",
                    "2026-02-01T00:00:00.000Z",
                    1.5,
                    5.0,
                    "2026-01-15T12:00:00.000Z",
                    card_id
                ])
                .expect("Failed to update card");
            }
        } // stmt dropped here

        tx.commit().expect("Failed to commit update transaction");
    }
    let update_duration = update_start.elapsed();

    println!(
        "Updated 100 cards in {:?} ({:.2} updates/sec)",
        update_duration,
        100.0 / update_duration.as_secs_f64()
    );

    // Assert: Update should complete in under 500ms
    assert!(
        update_duration.as_millis() < 500,
        "Update took too long: {:?}",
        update_duration
    );
}
