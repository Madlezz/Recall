import { addDays, subDays } from "date-fns";
import { ACHIEVEMENT_DEFS } from "@/types";
import type { Card, CardState, Deck, RecallStateSnapshot, ReviewLog, ReviewRating, StudySession, Achievement, AchievementId, RecallSettings } from "@/types";

const ISO = (date: Date): string => date.toISOString();

// Rich demo data simulating 45 days of active usage
export function createDemoSnapshot(now = new Date()): RecallStateSnapshot {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const decks = createDecks(today);
  const { cards, reviewLogs } = createCardsAndLogs(today);
  const studySessions = createSessions(today);
  const settings = createSettings(today);

  return { decks, cards, studySessions, reviewLogs, settings };
}

function createDecks(today: Date): Deck[] {
  const defs: [string, string, string, string, number][] = [
    ["deck_japanese", "🇯🇵 Japanese Basics", "Common words and phrases for everyday conversation", "rose", 42],
    ["deck_korean", "🇰🇷 Korean Essentials", "Hangul fundamentals and survival phrases", "blue", 28],
    ["deck_science", "🔬 Science Facts", "Physics, biology, and chemistry fundamentals", "green", 35],
    ["deck_history", "🏛️ World History", "Key dates and events that shaped civilization", "amber", 22],
    ["deck_medical", "⚕️ Medical Terminology", "Anatomy, conditions, and pharmacology basics", "violet", 18],
    ["deck_programming", "💻 Programming Concepts", "Algorithms, data structures, and design patterns", "slate", 30],
    ["deck_geography", "🌍 World Geography", "Capitals, rivers, mountains, and landmarks", "green", 15],
    ["deck_music", "🎵 Music Theory", "Scales, chords, intervals, and ear training", "rose", 12],
  ];
  return defs.map(([id, name, desc, color, daysAgo]) => ({
    id, name, description: desc, color: color as Deck["color"],
    createdAt: ISO(subDays(today, daysAgo)),
    updatedAt: ISO(subDays(today, Math.floor(Math.random() * 3))),
  }));
}

const CARD_BANK: Record<string, [string, string, string, string][]> = {
  deck_japanese: [
    ["Hello", "こんにちは (Konnichiwa)", "Daytime greeting", "greetings"],
    ["Thank you", "ありがとう (Arigatou)", "Casual thanks", "greetings"],
    ["Excuse me", "すみません (Sumimasen)", "Getting attention / apology", "greetings"],
    ["Good morning", "おはようございます (Ohayou gozaimasu)", "Polite morning greeting", "greetings"],
    ["Good night", "おやすみなさい (Oyasuminasai)", "Before sleep", "greetings"],
    ["Water", "水 (Mizu)", "Basic necessity", "food"],
    ["Delicious", "美味しい (Oishii)", "Food compliment", "food"],
    ["How much?", "いくらですか (Ikura desu ka)", "Shopping phrase", "shopping"],
    ["Where is...?", "...はどこですか (...wa doko desu ka)", "Asking directions", "travel"],
    ["Train", "電車 (Densha)", "Transportation", "travel"],
    ["One", "一 (Ichi)", "Numbers 1-10", "numbers"],
    ["Two", "二 (Ni)", "Numbers 1-10", "numbers"],
    ["Today", "今日 (Kyou)", "Time words", "time"],
    ["Tomorrow", "明日 (Ashita)", "Time words", "time"],
    ["Yesterday", "昨日 (Kinou)", "Time words", "time"],
  ],
  deck_korean: [
    ["Hello", "안녕하세요 (Annyeonghaseyo)", "Polite greeting", "greetings"],
    ["Thank you", "감사합니다 (Gamsahamnida)", "Formal thanks", "greetings"],
    ["Sorry", "죄송합니다 (Joesonghamnida)", "Formal apology", "greetings"],
    ["Yes", "네 (Ne)", "Affirmation", "basics"],
    ["No", "아니요 (Aniyo)", "Negation", "basics"],
    ["Water", "물 (Mul)", "Basic need", "food"],
    ["Delicious", "맛있어요 (Masisseoyo)", "Food compliment", "food"],
    ["How much?", "얼마예요? (Eolmayeyo)", "Shopping", "shopping"],
    ["Bathroom", "화장실 (Hwajangsil)", "Essential phrase", "travel"],
    ["Subway", "지하철 (Jihacheol)", "Transportation", "travel"],
  ],
  deck_science: [
    ["Speed of light", "~300,000 km/s", "In vacuum", "physics"],
    ["Human bones", "206 in adult", "Babies have ~300", "biology"],
    ["Water formula", "H₂O", "Two hydrogen, one oxygen", "chemistry"],
    ["Mitochondria", "Powerhouse of the cell", "Produces ATP", "biology"],
    ["Photosynthesis", "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂", "Plants make food from light", "biology"],
    ["Newton's 2nd Law", "F = ma", "Force equals mass times acceleration", "physics"],
    ["pH of pure water", "7.0", "Neutral", "chemistry"],
    ["Absolute zero", "-273.15°C / 0K", "Lowest possible temperature", "physics"],
    ["DNA bases", "A, T, G, C", "Adenine-Thymine, Guanine-Cytosine", "biology"],
    ["Speed of sound", "~343 m/s in air", "At 20°C", "physics"],
    ["Avogadro's number", "6.022 × 10²³", "Particles per mole", "chemistry"],
    ["Largest organ", "Skin", "Covers ~2 m²", "biology"],
  ],
  deck_history: [
    ["WWII ended", "1945", "September 2, 1945", "modern"],
    ["First moon landing", "1969", "Apollo 11, July 20", "modern"],
    ["Berlin Wall fell", "1989", "November 9", "modern"],
    ["French Revolution", "1789", "Storming of the Bastille", "revolution"],
    ["Columbus reached Americas", "1492", "October 12", "exploration"],
    ["Roman Empire fell", "476 AD", "Fall of Western Rome", "ancient"],
    ["Magna Carta signed", "1215", "English constitutional document", "medieval"],
    ["Industrial Revolution", "~1760-1840", "Started in Britain", "modern"],
  ],
  deck_medical: [
    ["Hypertension", "High blood pressure", "≥130/80 mmHg", "cardio"],
    ["Tachycardia", "Heart rate >100 bpm", "Fast heartbeat", "cardio"],
    ["Bradycardia", "Heart rate <60 bpm", "Slow heartbeat", "cardio"],
    ["Dyspnea", "Difficulty breathing", "Shortness of breath", "pulmonary"],
    ["Hemoglobin", "Carries oxygen in blood", "Normal: 12-17 g/dL", "heme"],
    ["Aspirin", "NSAID / antiplatelet", "Acetylsalicylic acid", "pharma"],
    ["Metformin", "First-line for Type 2 DM", "Biguanide class", "pharma"],
    ["CBC", "Complete Blood Count", "Basic blood panel", "labs"],
  ],
  deck_programming: [
    ["Big O of binary search", "O(log n)", "Halves search space each step", "algorithms"],
    ["Big O of merge sort", "O(n log n)", "Divide and conquer", "algorithms"],
    ["Stack vs Queue", "LIFO vs FIFO", "Last-in-first-out vs First-in-first-out", "data-structures"],
    ["HTTP 404", "Not Found", "Resource doesn't exist", "web"],
    ["HTTP 500", "Internal Server Error", "Generic server failure", "web"],
    ["SQL JOIN", "Combines rows from tables", "INNER, LEFT, RIGHT, FULL", "database"],
    ["ACID properties", "Atomicity, Consistency, Isolation, Durability", "Transaction guarantees", "database"],
    ["REST", "Representational State Transfer", "Stateless API architecture", "web"],
    ["DNS", "Domain Name System", "Resolves names to IPs", "networking"],
    ["TCP 3-way handshake", "SYN → SYN-ACK → ACK", "Connection establishment", "networking"],
  ],
  deck_geography: [
    ["Capital of Japan", "Tokyo", "Largest metro area in world", "asia"],
    ["Capital of Australia", "Canberra", "Not Sydney!", "oceania"],
    ["Longest river", "Nile", "~6,650 km", "africa"],
    ["Highest mountain", "Mount Everest", "8,849 m", "asia"],
    ["Largest desert", "Antarctic Desert", "Cold desert, 14.2M km²", "general"],
    ["Largest ocean", "Pacific Ocean", "165.25M km²", "general"],
    ["Capital of Brazil", "Brasília", "Not Rio or São Paulo", "south-america"],
  ],
  deck_music: [
    ["Notes in major scale", "7 (W-W-H-W-W-W-H)", "Whole and half step pattern", "scales"],
    ["C major scale notes", "C D E F G A B", "No sharps or flats", "scales"],
    ["Perfect fifth interval", "7 semitones", "Most consonant interval", "intervals"],
    ["BPM for allegro", "120-156", "Fast, lively tempo", "tempo"],
    ["4/4 time signature", "Common time", "4 beats per bar, quarter note gets beat", "rhythm"],
    ["Circle of fifths", "Shows key relationships", "Clockwise = up a fifth", "theory"],
  ],
};

function createCardsAndLogs(today: Date): { cards: Card[]; reviewLogs: ReviewLog[] } {
  const cards: Card[] = [];
  const reviewLogs: ReviewLog[] = [];
  let cardIdx = 0;
  let logIdx = 0;
  const ratings: ReviewRating[] = ["again", "hard", "good", "easy"];

  for (const [deckId, qaList] of Object.entries(CARD_BANK)) {
    qaList.forEach(([front, back, hint, tag], i) => {
      const id = `card_${cardIdx++}`;
      // Distribute states: ~50% review, ~25% learning, ~15% new, ~10% relearning
      const roll = (i * 7 + cardIdx * 3) % 20;
      let state: CardState;
      let lastReview: Date | null;
      let nextReview: Date;
      let stability: number, difficulty: number, reps: number, lapses: number;

      if (roll < 10) {
        // review
        state = "review";
        const daysSinceReview = (i * 3) % 14;
        lastReview = subDays(today, daysSinceReview);
        nextReview = addDays(today, ((i * 5) % 30) + 1);
        stability = 5 + (i % 20);
        difficulty = 3 + (i % 7) * 0.5;
        reps = 5 + (i % 15);
        lapses = i % 3;
      } else if (roll < 15) {
        // learning
        state = "learning";
        lastReview = subDays(today, (i % 3));
        nextReview = today;
        stability = 0.5 + (i % 3);
        difficulty = 4 + (i % 5) * 0.3;
        reps = 1 + (i % 3);
        lapses = 0;
      } else if (roll < 18) {
        // new
        state = "new";
        lastReview = null;
        nextReview = addDays(today, 1);
        stability = 0;
        difficulty = 0;
        reps = 0;
        lapses = 0;
      } else {
        // relearning
        state = "relearning";
        lastReview = subDays(today, (i % 5) + 1);
        nextReview = today;
        stability = 2 + (i % 5);
        difficulty = 6 + (i % 3) * 0.5;
        reps = 3 + (i % 8);
        lapses = 3 + (i % 4);
      }

      const createdAt = subDays(today, 45 - (i % 40));
      cards.push({
        id, deckId, cardType: "basic", front, back, hint, source: "",
        tags: [tag], state,
        lastReviewDate: lastReview ? ISO(lastReview) : null,
        nextReviewDate: ISO(nextReview),
        stability, difficulty, elapsedDays: reps > 0 ? (i % 10) : 0,
        scheduledDays: state === "review" ? ((i * 5) % 30) + 1 : 0,
        reps, lapses,
        createdAt: ISO(createdAt), updatedAt: ISO(createdAt),
      });

      // Generate 2-5 review logs per non-new card
      if (state !== "new") {
        const numLogs = 2 + (i % 4);
        for (let j = 0; j < numLogs; j++) {
          const logDate = subDays(today, (numLogs - j) * 2 + (i % 5));
          const rating = ratings[(i + j) % 4];
          reviewLogs.push({
            id: `log_${logIdx++}`, cardId: id, rating,
            reviewDate: ISO(logDate),
            stability: stability - (numLogs - j) * 0.5,
            difficulty, elapsedDays: j, scheduledDays: j * 2 + 1,
          });
        }
      }
    });
  }

  return { cards, reviewLogs };
}

function createSessions(today: Date): StudySession[] {
  // 35 sessions over 45 days, simulating consistent daily study
  const sessions: StudySession[] = [];
  const deckIds = ["deck_japanese", "deck_korean", "deck_science", "deck_history",
    "deck_medical", "deck_programming", "deck_geography", "deck_music"];

  for (let i = 0; i < 35; i++) {
    const sessionDay = subDays(today, i);
    // 1-2 sessions per day
    const numSessions = i % 3 === 0 ? 2 : 1;
    for (let s = 0; s < numSessions; s++) {
      const deckId = deckIds[(i + s) % deckIds.length];
      const started = new Date(sessionDay);
      started.setHours(9 + (s * 8) + (i % 4), (i * 7) % 60);
      const ended = new Date(started);
      ended.setMinutes(ended.getMinutes() + 15 + (i % 30));
      sessions.push({
        id: `session_demo_${i}_${s}`,
        deckId: s === 0 ? deckId : null, // some sessions are "all decks"
        startedAt: ISO(started),
        endedAt: ISO(ended),
        cardsStudied: 5 + (i % 15),
      });
    }
  }
  return sessions;
}

function createSettings(today: Date): RecallSettings {
  // Simulate 45 days of usage: high XP, many achievements
  const unlockedIds: AchievementId[] = [
    "first_steps", "hot_streak", "on_fire", "century",
    "deck_collector", "card_hoarder", "night_owl", "early_bird",
  ];

  const achievements: Achievement[] = unlockedIds.map((id, i) => ({
    id,
    title: ACHIEVEMENT_DEFS[id].title,
    description: ACHIEVEMENT_DEFS[id].description,
    icon: ACHIEVEMENT_DEFS[id].icon,
    unlockedAt: ISO(subDays(today, 30 - i * 4)),
  }));

  return {
    theme: "light",
    accentColor: "zinc",
    dyslexiaFont: false,
    seededAt: ISO(subDays(today, 45)),
    dailyNewCardLimit: 20,
    leechThreshold: 5,
    onboardingComplete: true,
    xp: 2847, // Level 7: Scholar (needs 2300)
    achievements,
    dailyGoal: 20,
    notificationsEnabled: true,
    soundVolume: 80,
    allowHtml: false,
    desiredRetention: 0.9,
    backupFolder: null,
    backupSchedule: "weekly",
    lastBackupAt: ISO(subDays(today, 2)),
    syncFolder: null,
    syncEnabled: false,
    ttsEnabled: true,
    ttsAutoRead: false,
    ttsSpeed: 1,
    fsrsWeights: null,
  };
}
