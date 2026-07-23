import type { Card, Deck, CardType } from "@/types";
import { createId } from "@/lib/utils";

export interface TemplateDeck {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tags: string[];
  cards: Array<{
    front: string;
    back: string;
    type: CardType;
    tags: string[];
  }>;
  defaultTryDeck?: boolean;
}

const today = new Date();
const iso = today.toISOString();

export const TEMPLATE_DECKS: TemplateDeck[] = [
  {
    id: "template_how_it_works",
    defaultTryDeck: true,
    name: "How This Works",
    description: "Learn spaced repetition by doing it - 5 quick cards",
    icon: "👋",
    color: "slate",
    tags: ["getting-started", "tutorial"],
    cards: [
      {
        front: "Welcome! This is a flashcard. The question is on the front, the answer is on the back. Press Space to reveal the answer.",
        back: "That's it! You just read a flashcard. In Recall, you rate how well you remembered it - and the app decides when to show it again.",
        type: "basic",
        tags: ["tutorial", "welcome"],
      },
      {
        front: "Spaced repetition is simple: instead of reviewing everything every day, you review things right before you'd forget them. Recall schedules this for you automatically. What do you need to do?",
        back: "Just rate each card: Again (forgot), Hard, Good, or Easy. Recall handles all the timing.",
        type: "basic",
        tags: ["tutorial", "how-it-works"],
      },
      {
        front: "If you rate a card 'Again' (you forgot it), when will Recall show it again?",
        back: "Soon - within minutes, so you get another chance while it's fresh. As you get it right more often, the gap grows to hours, then days, then weeks.",
        type: "basic",
        tags: ["tutorial", "intervals"],
      },
      {
        front: "If you rate a card 'Good' several times, the review interval gets {{c1::longer}}. This is called {{c2::spaced repetition}} - the gap grows so you review less often as you master it.",
        back: "",
        type: "cloze",
        tags: ["tutorial", "graduation"],
      },
      {
        front: "The best way to use Recall: create cards about things you're actually studying. Keep each card short - one fact per card. How many facts should each card test?",
        back: "One. One fact per card. \"What year did WWII end?\" → 1945. Not \"List all WWII events and dates.\"",
        type: "basic",
        tags: ["tutorial", "best-practices"],
      },
    ],
  },
  {
    id: "template_utbk",
    name: "UTBK Indonesia",
    description: "Soal latihan UTBK/SNBT - Tes Potensi Skolastik",
    icon: "🇮🇩",
    color: "rose",
    tags: ["utbk", "snbt", "indonesia"],
    cards: [
      {
        front: "Sinonim dari kata 'Hemat' adalah...",
        back: "Hemat = irit, boros (antonim), cermat dalam pengeluaran",
        type: "basic",
        tags: ["tps", "kosakata", "sinonim"],
      },
      {
        front: "Antonim dari kata 'Generous' (dermawan) adalah...",
        back: "Pelit / kikir / bakhil",
        type: "basic",
        tags: ["tps", "kosakata", "antonim"],
      },
      {
        front: "Jika 2x + 5 = 17, maka nilai x adalah {{c1::6}}",
        back: "",
        type: "cloze",
        tags: ["tps", "matematika", "aljabar"],
      },
      {
        front: "Penyebab utama terjadinya hujan asam adalah polutan gas {{c1::SO₂}} dan {{c2::NOₓ}} yang bereaksi dengan uap air di atmosfer.",
        back: "",
        type: "cloze",
        tags: ["tps", "sains", "lingkungan"],
      },
      {
        front: "Pancasila sebagai dasar negara Indonesia disahkan pada tanggal...",
        back: "18 Agustus 1945 (saat PPKI sidang pertama)",
        type: "basic",
        tags: ["tps", "pengetahuan-umum", "sejarah"],
      },
    ],
  },
  {
    id: "template_languages",
    name: "Languages",
    description: "Common phrases and vocabulary for language learning",
    icon: "🌍",
    color: "blue",
    tags: ["languages", "vocabulary"],
    cards: [
      {
        front: "How do you say 'Hello' in Spanish?",
        back: "Hola",
        type: "basic",
        tags: ["spanish", "greetings"],
      },
      {
        front: "Translate: 'Good morning' (French)",
        back: "Bonjour",
        type: "basic",
        tags: ["french", "greetings"],
      },
      {
        front: "What does 'Guten Tag' mean?",
        back: "Good day / Hello (German)",
        type: "basic",
        tags: ["german", "greetings"],
      },
      {
        front: "The {{c1::future}} tense in Spanish uses the auxiliary verb {{c2::ir}}",
        back: "",
        type: "cloze",
        tags: ["spanish", "grammar"],
      },
    ],
  },
  {
    id: "template_coding",
    name: "Coding",
    description: "Programming concepts, syntax, and best practices",
    icon: "💻",
    color: "green",
    tags: ["coding", "programming"],
    cards: [
      {
        front: "What does `map()` return in JavaScript?",
        back: "A new array with the results of calling a function on every element",
        type: "basic",
        tags: ["javascript", "arrays"],
      },
      {
        front: "Time complexity of binary search?",
        back: "O(log n)",
        type: "basic",
        tags: ["algorithms", "complexity"],
      },
      {
        front: "In Git, {{c1::rebase}} replays commits on top of another branch, while {{c2::merge}} creates a new commit combining both branches",
        back: "",
        type: "cloze",
        tags: ["git", "version-control"],
      },
      {
        front: "What's the difference between `==` and `===` in JavaScript?",
        back: "`===` checks type AND value (strict equality). `==` only checks value (loose equality, performs type coercion)",
        type: "basic",
        tags: ["javascript", "operators"],
      },
    ],
  },
  {
    id: "template_gre",
    name: "GRE",
    description: "Common GRE vocabulary and test prep",
    icon: "📚",
    color: "amber",
    tags: ["gre", "vocabulary", "test-prep"],
    cards: [
      {
        front: "Define: Ephemeral",
        back: "Lasting for a very short time; transient",
        type: "basic",
        tags: ["vocabulary"],
      },
      {
        front: "Define: Ubiquitous",
        back: "Present, appearing, or found everywhere",
        type: "basic",
        tags: ["vocabulary"],
      },
      {
        front: "The {{c1::pragmatic}} approach focuses on practical consequences rather than {{c2::theoretical}} considerations",
        back: "",
        type: "cloze",
        tags: ["vocabulary", "context"],
      },
      {
        front: "Define: Enervate",
        back: "To cause someone to feel drained of energy or vitality; weaken",
        type: "basic",
        tags: ["vocabulary"],
      },
    ],
  },
  {
    id: "template_medical",
    name: "Medical",
    description: "Anatomy, pharmacology, and clinical concepts",
    icon: "⚕️",
    color: "violet",
    tags: ["medical", "anatomy", "pharmacology"],
    cards: [
      {
        front: "What is the function of the {{c1::mitral valve}}?",
        back: "Prevents backflow of blood from the left ventricle to the left atrium",
        type: "cloze",
        tags: ["anatomy", "cardiology"],
      },
      {
        front: "Mechanism of action: Metformin",
        back: "Decreases hepatic glucose production, decreases intestinal absorption of glucose, and improves insulin sensitivity",
        type: "basic",
        tags: ["pharmacology", "diabetes"],
      },
      {
        front: "What cranial nerve controls eye movement, pupil constriction, and eyelid elevation?",
        back: "Oculomotor nerve (CN III)",
        type: "basic",
        tags: ["anatomy", "neurology"],
      },
      {
        front: "The {{c1::brachial plexus}} is formed by the ventral rami of spinal nerves {{c2::C5-T1}}",
        back: "",
        type: "cloze",
        tags: ["anatomy", "neurology"],
      },
    ],
  },
];

export function createCardsFromTemplate(template: TemplateDeck): { deck: Deck; cards: Card[] } {
  const deck: Deck = {
    id: createId("deck"),
    name: `${template.icon} ${template.name}`,
    description: template.description,
    color: template.color as Deck["color"],
    createdAt: iso,
    updatedAt: iso,
  };

  const cards: Card[] = template.cards.map((cardData) => ({
    id: createId("card"),
    deckId: deck.id,
    cardType: cardData.type,
    front: cardData.front,
    back: cardData.back,
    hint: "",
    source: "",
    tags: cardData.tags,
    state: "new",
    lastReviewDate: null,
    nextReviewDate: iso,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    learningSteps: 0,
    createdAt: iso,
    updatedAt: iso,
  }));

  return { deck, cards };
}
