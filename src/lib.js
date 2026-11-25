// Small helpers and the sample data that ships with the app.
// Kept separate from the UI so the quiz and weekly totals can be tested on their own.

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

// Fisher-Yates shuffle. Returns a new array, the original is left alone.
export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Build a multiple choice quiz from a deck's cards.
// Each question shows the front of a card and offers the right back plus
// three wrong backs taken from other cards in the same deck.
// Needs at least 4 cards, otherwise there are not enough wrong answers.
export function makeQuiz(cards, maxQuestions = 10) {
  if (!cards || cards.length < 4) return [];
  const picked = shuffle(cards).slice(0, Math.min(maxQuestions, cards.length));
  return picked.map((card) => {
    const wrong = shuffle(cards.filter((c) => c.id !== card.id))
      .slice(0, 3)
      .map((c) => c.back);
    const options = shuffle([card.back, ...wrong]);
    return {
      cardId: card.id,
      front: card.front,
      options,
      correctIndex: options.indexOf(card.back),
    };
  });
}

// Monday of the week that contains the given YYYY-MM-DD date.
export function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Total minutes logged for one subject in the week that contains todayStr.
export function minutesThisWeek(sessions, subjectId, todayStr) {
  const start = weekStart(todayStr);
  const endDate = new Date(start + 'T00:00:00');
  endDate.setDate(endDate.getDate() + 6);
  const end = toDateStr(endDate);
  return sessions
    .filter((s) => s.subjectId === subjectId && s.date >= start && s.date <= end)
    .reduce((sum, s) => sum + s.minutes, 0);
}

// What a first-time user sees: two subjects and one ready-made deck
// so the app is useful before they add anything of their own.
export function sampleData() {
  const biologyId = uid();
  const mathsId = uid();
  const cards = [
    ['What does a plant use sunlight for?', 'Photosynthesis, making its own food'],
    ['What is the powerhouse of the cell?', 'The mitochondria'],
    ['What gas do plants take in from the air?', 'Carbon dioxide'],
    ['What gas do plants release?', 'Oxygen'],
    ['What is the basic unit of life?', 'The cell'],
    ['Which organ pumps blood round the body?', 'The heart'],
    ['What do we call animals that eat only plants?', 'Herbivores'],
    ['What is the green pigment in leaves called?', 'Chlorophyll'],
    ['Where does digestion start?', 'In the mouth'],
    ['What carries oxygen in the blood?', 'Red blood cells'],
    ['What is a group of the same species living in one area called?', 'A population'],
    ['Which part of the plant takes in water?', 'The roots'],
  ].map(([front, back]) => ({ id: uid(), front, back, known: null }));

  return {
    subjects: [
      { id: biologyId, name: 'Biology', targetHours: 3 },
      { id: mathsId, name: 'Mathematics', targetHours: 4 },
    ],
    decks: [
      { id: uid(), subjectId: biologyId, name: 'Biology basics', cards },
    ],
    sessions: [],
    settings: { studyMinutes: 25, breakMinutes: 5 },
  };
}
