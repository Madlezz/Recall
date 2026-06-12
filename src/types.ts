export type CardState = "new" | "learning" | "review" | "relearning";
export type ReviewRating = "again" | "hard" | "good" | "easy";
export type Theme = "dark" | "light";
export type DeckColor = "blue" | "green" | "amber" | "rose" | "violet" | "slate";
export type CardType = "basic" | "cloze";

export interface Deck {
  id: string;
  name: string;
  description: string;
  color: DeckColor;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint: string;
  tags: string[];
  cardType: CardType;

  // FSRS fields
  state: CardState;
  lastReviewDate: string | null;
  nextReviewDate: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;

  createdAt: string;
  updatedAt: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: ReviewRating;
  reviewDate: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
}

export interface StudySession {
  id: string;
  deckId: string | null;
  startedAt: string;
  endedAt: string;
  cardsStudied: number;
}

export interface RecallSettings {
  theme: Theme;
  seededAt: string;
  dailyNewCardLimit: number;
  leechThreshold: number;
  onboardingComplete: boolean;
  xp: number;
  achievements: Achievement[];
  dailyGoal: number;
}

export interface SessionSummary {
  cardsStudied: number;
  timeSpentMs: number;
  averageRating: number; // 1-4
  newCards: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
}

export interface RecallStateSnapshot {
  decks: Deck[];
  cards: Card[];
  studySessions: StudySession[];
  reviewLogs: ReviewLog[];
  settings: RecallSettings;
}

export interface RecallExportPayload extends RecallStateSnapshot {
  version: 2;
  exportedAt: string;
}

export interface ActiveStudySession {
  id: string;
  deckId: string | null;
  cardIds: string[];
  currentIndex: number;
  revealed: boolean;
  startedAt: string;
  ratings: Record<ReviewRating, number>;
  completed: boolean;
  previousCardState: Card | null;
  newCardsCount: number;
  sessionXp: number;
}

export type AppView = "dashboard" | "deck" | "study" | "settings" | "onboarding" | "match" | "stats";

// ── XP, Levels & Achievements ──

export const LEVEL_THRESHOLDS: number[] = [
  0, 50, 120, 250, 500, 900, 1500, 2300, 3500, 5000,
];

export const LEVEL_TITLES: string[] = [
  "Curious Mind",
  "Quick Learner",
  "Knowledge Seeker",
  "Brain Trainer",
  "Memory Master",
  "Wisdom Keeper",
  "Scholar",
  "Sage",
  "Grandmaster",
  "Legend",
];

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

export type AchievementId =
  | "first_steps"
  | "hot_streak"
  | "on_fire"
  | "unstoppable"
  | "century"
  | "half_marathon"
  | "marathon"
  | "perfectionist"
  | "night_owl"
  | "early_bird"
  | "deck_collector"
  | "card_hoarder"
  | "speed_demon"
  | "comeback_kid";

export const ACHIEVEMENT_DEFS: Record<AchievementId, Omit<Achievement, "id" | "unlockedAt">> = {
  first_steps: { title: "First Steps", description: "Complete your first review session", icon: "👶" },
  hot_streak: { title: "Hot Streak", description: "3-day study streak", icon: "🔥" },
  on_fire: { title: "On Fire", description: "7-day study streak", icon: "🚀" },
  unstoppable: { title: "Unstoppable", description: "30-day study streak", icon: "💎" },
  century: { title: "Century", description: "100 total reviews", icon: "💯" },
  half_marathon: { title: "Half Marathon", description: "500 total reviews", icon: "🏃" },
  marathon: { title: "Marathon", description: "1,000 total reviews", icon: "🏆" },
  perfectionist: { title: "Perfectionist", description: "100% accuracy in a session (min 10 cards)", icon: "✨" },
  night_owl: { title: "Night Owl", description: "Review after midnight", icon: "🦉" },
  early_bird: { title: "Early Bird", description: "Review before 6 AM", icon: "🌅" },
  deck_collector: { title: "Deck Collector", description: "Created 5+ decks", icon: "📚" },
  card_hoarder: { title: "Card Hoarder", description: "100+ cards in library", icon: "🗂️" },
  speed_demon: { title: "Speed Demon", description: "Review 50+ cards in one session", icon: "⚡" },
  comeback_kid: { title: "Comeback Kid", description: "Review after 7+ days away", icon: "🔙" },
};
