import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const decksTable = sqliteTable(
  "decks",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    color: text("color").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("decks_name_unique").on(table.name)],
);

export const cardsTable = sqliteTable("cards", {
  id: text("id").primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => decksTable.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  hint: text("hint").notNull(),
  tags: text("tags").notNull(),
  status: text("status").notNull(),
  correctCount: integer("correct_count").notNull(),
  incorrectCount: integer("incorrect_count").notNull(),
  streak: integer("streak").notNull(),
  easeFactor: real("ease_factor").notNull().default(2.5),
  lastReviewedAt: text("last_reviewed_at"),
  nextReviewAt: text("next_review_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const studySessionsTable = sqliteTable("study_sessions", {
  id: text("id").primaryKey(),
  deckId: text("deck_id").references(() => decksTable.id, { onDelete: "set null" }),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at").notNull(),
  cardsStudied: integer("cards_studied").notNull(),
  correct: integer("correct").notNull(),
  incorrect: integer("incorrect").notNull(),
});

export const reviewsTable = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cardsTable.id, { onDelete: "cascade" }),
  sessionId: text("session_id")
    .notNull()
    .references(() => studySessionsTable.id, { onDelete: "cascade" }),
  answeredAt: text("answered_at").notNull(),
  result: text("result").notNull(),
});

export const settingsTable = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type DeckSelect = typeof decksTable.$inferSelect;
export type CardSelect = typeof cardsTable.$inferSelect;
export type StudySessionSelect = typeof studySessionsTable.$inferSelect;
export type ReviewSelect = typeof reviewsTable.$inferSelect;
export type SettingSelect = typeof settingsTable.$inferSelect;
