import { useEffect, useRef, useState } from 'react';
import { uid, shuffle, makeQuiz, minutesThisWeek, toDateStr, sampleData } from './lib.js';

const STORAGE_KEY = 'studymate.state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.subjects && parsed.decks && parsed.sessions) return parsed;
    }
  } catch {
    // storage unavailable or broken, fall through to the sample data
  }
  return sampleData();
}

/* ---------- small design-system pieces (shadcn-style, hand built) ---------- */

function Button({ variant = 'default', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-bold text-[15px] px-5 py-2.5 transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pen-blue active:scale-[0.97]';
  const styles = {
    default:
      'bg-pen-red text-white shadow-[0_3px_0_0_var(--color-pen-red-dark)] hover:brightness-105 hover:-translate-y-px',
    blue:
      'bg-pen-blue text-white shadow-[0_3px_0_0_var(--color-pen-blue-dark)] hover:brightness-105 hover:-translate-y-px',
    outline:
      'bg-white text-ink border-2 border-ink/15 shadow-[0_3px_0_0_rgba(46,42,38,0.12)] hover:border-pen-blue hover:text-pen-blue-dark',
    ghost: 'bg-transparent text-ink-soft hover:bg-paper-deep hover:text-ink shadow-none',
    danger: 'bg-transparent text-pen-red-dark hover:bg-red-50 shadow-none',
  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

function Card({ className = '', children }) {
  return (
    <div
      className={`bg-white rounded-3xl border-2 border-ink/10 shadow-[0_6px_24px_rgba(46,42,38,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

function Badge({ tone = 'blue', children }) {
  const tones = {
    blue: 'bg-sky-100 text-sky-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-amber-100 text-amber-800',
    green: 'bg-emerald-100 text-emerald-800',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

const inputCls =
  'w-full rounded-2xl border-2 border-ink/15 bg-white px-4 py-2.5 text-[15px] font-semibold text-ink placeholder:font-semibold placeholder:text-ink-soft/70 focus:border-pen-blue focus:outline-none focus:ring-4 focus:ring-pen-blue/15 transition';

function FieldLabel({ children }) {
  return (
    <span className="block text-xs font-extrabold uppercase tracking-wider text-ink-soft mb-1.5">
      {children}
    </span>
  );
}

function SectionTitle({ children, tone = 'blue' }) {
  return (
    <h2 className="font-display text-3xl font-semibold text-ink mb-2">
      <span className={tone === 'red' ? 'marker-underline-red' : 'marker-underline'}>
        {children}
      </span>
    </h2>
  );
}

function EmptyNote({ children }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-ink/20 bg-white/70 px-5 py-6 text-ink-soft font-semibold">
      {children}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('decks');
  const [state, setState] = useState(loadState);

  // save everything to the browser whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or blocked, the app still works for this session
    }
  }, [state]);

  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  const tabs = [
    ['decks', 'Flashcards'],
    ['quiz', 'Quick quiz'],
    ['timer', 'Study timer'],
    ['subjects', 'Subjects'],
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-16">
        <header className="pt-8 pb-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="font-display inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-pen-red text-3xl font-bold text-white shadow-[0_4px_0_0_var(--color-pen-red-dark)] -rotate-3">
              S
            </span>
            <div>
              <h1 className="font-display text-4xl font-semibold leading-none text-ink">
                StudyMate
              </h1>
              <p className="mt-1.5 font-semibold text-ink-soft">
                Flashcards, quick quizzes and a study timer in one place.
              </p>
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2" aria-label="StudyMate sections">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={
                  tab === key
                    ? 'rounded-full bg-ink px-5 py-2.5 font-display text-base font-medium text-paper shadow-[0_3px_0_0_rgba(46,42,38,0.35)] cursor-pointer transition hover:-translate-y-px'
                    : 'rounded-full bg-white px-5 py-2.5 font-display text-base font-medium text-ink-soft border-2 border-ink/10 cursor-pointer transition hover:border-pen-blue hover:text-pen-blue-dark hover:-translate-y-px'
                }
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <main>
          {tab === 'decks' && <DecksTab state={state} update={update} />}
          {tab === 'quiz' && <QuizTab state={state} />}
          {tab === 'timer' && <TimerTab state={state} update={update} />}
          {tab === 'subjects' && <SubjectsTab state={state} update={update} />}
        </main>

        <footer className="mt-14 text-center text-sm font-semibold text-ink-soft">
          Your decks and study time are saved in this browser only.
        </footer>
      </div>
    </div>
  );
}

/* ---------------- Flashcards ---------------- */

function DecksTab({ state, update }) {
  const [openDeckId, setOpenDeckId] = useState(null);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckSubject, setNewDeckSubject] = useState('');

  const subjectName = (id) =>
    state.subjects.find((s) => s.id === id)?.name || 'No subject';

  const createDeck = () => {
    const name = newDeckName.trim();
    const subjectId = newDeckSubject || state.subjects[0]?.id;
    if (!name || !subjectId) return;
    const deck = { id: uid(), subjectId, name, cards: [] };
    update({ decks: [...state.decks, deck] });
    setNewDeckName('');
    setOpenDeckId(deck.id);
  };

  const deleteDeck = (deckId) => {
    if (!window.confirm('Delete this deck and all its cards?')) return;
    update({ decks: state.decks.filter((d) => d.id !== deckId) });
    if (openDeckId === deckId) setOpenDeckId(null);
  };

  const openDeck = state.decks.find((d) => d.id === openDeckId);

  if (openDeck) {
    return (
      <DeckStudy
        deck={openDeck}
        subjectLabel={subjectName(openDeck.subjectId)}
        onBack={() => setOpenDeckId(null)}
        onChange={(deck) =>
          update({ decks: state.decks.map((d) => (d.id === deck.id ? deck : d)) })
        }
      />
    );
  }

  return (
    <section>
      <SectionTitle>Your decks</SectionTitle>
      <p className="mb-6 font-semibold text-ink-soft">
        Pick a deck to study, or start a new one for your next topic.
      </p>
      {state.decks.length === 0 && (
        <EmptyNote>No decks yet. Create your first one below.</EmptyNote>
      )}
      <div className="grid gap-6 pt-3 sm:grid-cols-2">
        {state.decks.map((deck, i) => {
          const known = deck.cards.filter((c) => c.known === true).length;
          return (
            <Card
              key={deck.id}
              className={`tape p-5 pt-6 transition hover:-translate-y-1 hover:rotate-0 ${
                i % 2 === 0 ? '-rotate-1' : 'rotate-1'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge tone="blue">{subjectName(deck.subjectId)}</Badge>
                {deck.cards.length > 0 && (
                  <Badge tone="green">
                    {known} of {deck.cards.length} known
                  </Badge>
                )}
              </div>
              <h3 className="font-display text-2xl font-medium text-ink">{deck.name}</h3>
              <p className="mt-1 font-semibold text-ink-soft">
                {deck.cards.length} {deck.cards.length === 1 ? 'card' : 'cards'}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button onClick={() => setOpenDeckId(deck.id)}>Study</Button>
                <Button variant="danger" onClick={() => deleteDeck(deck.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-10 p-5 sm:p-6">
        <h3 className="font-display text-xl font-medium text-ink mb-4">New deck</h3>
        {state.subjects.length === 0 ? (
          <p className="font-semibold text-ink-soft">
            Add a subject first in the Subjects tab, then come back.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-52 flex-1">
              <FieldLabel>Deck name</FieldLabel>
              <input
                className={inputCls}
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="e.g. Chemistry terms"
                onKeyDown={(e) => e.key === 'Enter' && createDeck()}
              />
            </label>
            <label>
              <FieldLabel>Subject</FieldLabel>
              <select
                className={inputCls}
                value={newDeckSubject || state.subjects[0]?.id || ''}
                onChange={(e) => setNewDeckSubject(e.target.value)}
              >
                {state.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="blue" onClick={createDeck}>
              Create deck
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}

function DeckStudy({ deck, subjectLabel, onBack, onChange }) {
  const [order, setOrder] = useState(() => deck.cards.map((c) => c.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  // keep the study order in step when cards are added or removed
  useEffect(() => {
    setOrder((prev) => {
      const ids = deck.cards.map((c) => c.id);
      const kept = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [deck.cards]);

  const orderedCards = order
    .map((id) => deck.cards.find((c) => c.id === id))
    .filter(Boolean);
  const card = orderedCards[Math.min(index, Math.max(orderedCards.length - 1, 0))];
  const knownCount = deck.cards.filter((c) => c.known === true).length;

  const goTo = (i) => {
    setIndex(Math.max(0, Math.min(i, orderedCards.length - 1)));
    setFlipped(false);
  };

  const mark = (known) => {
    if (!card) return;
    const cards = deck.cards.map((c) => (c.id === card.id ? { ...c, known } : c));
    onChange({ ...deck, cards });
    if (index < orderedCards.length - 1) goTo(index + 1);
    else setFlipped(false);
  };

  const addCard = () => {
    const f = front.trim();
    const b = back.trim();
    if (!f || !b) return;
    const newCard = { id: uid(), front: f, back: b, known: null };
    onChange({ ...deck, cards: [...deck.cards, newCard] });
    setFront('');
    setBack('');
  };

  const deleteCard = (cardId) => {
    onChange({ ...deck, cards: deck.cards.filter((c) => c.id !== cardId) });
    setIndex(0);
    setFlipped(false);
  };

  return (
    <section>
      <Button variant="ghost" onClick={onBack} className="-ml-3 mb-2">
        ← All decks
      </Button>
      <div className="flex flex-wrap items-center gap-3">
        <SectionTitle>{deck.name}</SectionTitle>
        <Badge tone="blue">{subjectLabel}</Badge>
        <Badge tone="green">
          {knownCount} of {deck.cards.length} known
        </Badge>
      </div>

      {deck.cards.length === 0 ? (
        <EmptyNote>This deck is empty. Add your first card below.</EmptyNote>
      ) : (
        <>
          <div
            className="flashcard-scene mx-auto mt-6 max-w-xl cursor-pointer select-none"
            onClick={() => setFlipped(!flipped)}
            title="Click to flip"
          >
            <div className={`flashcard-inner relative h-64 ${flipped ? 'flipped' : ''}`}>
              <div className="flashcard-face absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-pen-blue/40 bg-white px-6 py-8 text-center shadow-[0_10px_30px_rgba(47,168,213,0.18)]">
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-pen-blue-dark">
                  Question
                </span>
                <p className="font-display text-2xl font-medium leading-snug text-ink">
                  {card.front}
                </p>
                <span className="text-sm font-semibold text-ink-soft">
                  Click to reveal the answer
                </span>
              </div>
              <div className="flashcard-face flashcard-back absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-pen-red/40 bg-red-50 px-6 py-8 text-center shadow-[0_10px_30px_rgba(244,87,76,0.16)]">
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-pen-red-dark">
                  Answer
                </span>
                <p className="font-display text-2xl font-medium leading-snug text-ink">
                  {card.back}
                </p>
                <span className="text-sm font-semibold text-ink-soft">
                  Click to see the question
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0}>
              Previous
            </Button>
            <span className="font-bold text-ink-soft">
              Card {Math.min(index + 1, orderedCards.length)} of {orderedCards.length}
            </span>
            <Button
              variant="outline"
              onClick={() => goTo(index + 1)}
              disabled={index >= orderedCards.length - 1}
            >
              Next
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOrder(shuffle(order));
                setIndex(0);
                setFlipped(false);
              }}
            >
              Shuffle
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => mark(true)}>Know it</Button>
            <Button variant="blue" onClick={() => mark(false)}>
              Still learning
            </Button>
            {card.known !== null && (
              <Badge tone={card.known ? 'green' : 'yellow'}>
                {card.known ? 'Marked as known' : 'Marked as still learning'}
              </Badge>
            )}
          </div>
        </>
      )}

      <Card className="mt-10 p-5 sm:p-6">
        <h3 className="font-display text-xl font-medium text-ink mb-4">Add a card</h3>
        <div className="flex max-w-lg flex-col gap-3">
          <input
            className={inputCls}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Front (the question or term)"
          />
          <input
            className={inputCls}
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Back (the answer)"
            onKeyDown={(e) => e.key === 'Enter' && addCard()}
          />
          <div>
            <Button variant="blue" onClick={addCard}>
              Add card
            </Button>
          </div>
        </div>
      </Card>

      {deck.cards.length > 0 && (
        <Card className="mt-6 p-5 sm:p-6">
          <h3 className="font-display text-xl font-medium text-ink mb-3">
            Cards in this deck
          </h3>
          <ul className="divide-y divide-ink/8">
            {deck.cards.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <span className="font-semibold text-ink">
                  <strong className="font-extrabold">{c.front}</strong>
                  <span className="text-ink-soft">: {c.back}</span>
                  {c.known === true && (
                    <span className="ml-2">
                      <Badge tone="green">known</Badge>
                    </span>
                  )}
                  {c.known === false && (
                    <span className="ml-2">
                      <Badge tone="yellow">still learning</Badge>
                    </span>
                  )}
                </span>
                <Button variant="danger" onClick={() => deleteCard(c.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

/* ---------------- Quick quiz ---------------- */

function QuizTab({ state }) {
  const [deckId, setDeckId] = useState('');
  const [quiz, setQuiz] = useState(null); // {questions, index, chosen, score, missed}

  const usableDecks = state.decks.filter((d) => d.cards.length >= 4);
  const deck = usableDecks.find((d) => d.id === deckId) || usableDecks[0];

  const start = () => {
    if (!deck) return;
    setQuiz({ questions: makeQuiz(deck.cards), index: 0, chosen: null, score: 0, missed: [] });
  };

  const choose = (optionIndex) => {
    if (!quiz || quiz.chosen !== null) return;
    const q = quiz.questions[quiz.index];
    const right = optionIndex === q.correctIndex;
    setQuiz({
      ...quiz,
      chosen: optionIndex,
      score: quiz.score + (right ? 1 : 0),
      missed: right
        ? quiz.missed
        : [...quiz.missed, { front: q.front, answer: q.options[q.correctIndex] }],
    });
  };

  const next = () => {
    if (quiz.index + 1 >= quiz.questions.length) {
      setQuiz({ ...quiz, index: quiz.questions.length });
    } else {
      setQuiz({ ...quiz, index: quiz.index + 1, chosen: null });
    }
  };

  if (usableDecks.length === 0) {
    return (
      <section>
        <SectionTitle tone="red">Quick quiz</SectionTitle>
        <EmptyNote>
          A quiz needs a deck with at least 4 cards. Add more cards to a deck in the
          Flashcards tab, then come back.
        </EmptyNote>
      </section>
    );
  }

  if (quiz && quiz.index >= quiz.questions.length) {
    return (
      <section>
        <SectionTitle tone="red">Quiz finished</SectionTitle>
        <Card className="p-6 text-center">
          <p className="font-display text-4xl font-semibold text-ink">
            {quiz.score} <span className="text-ink-soft">/ {quiz.questions.length}</span>
          </p>
          <p className="mt-1 font-semibold text-ink-soft">
            {quiz.missed.length === 0
              ? 'Nothing missed. Nice work.'
              : 'Here are the ones to look at again.'}
          </p>
        </Card>
        {quiz.missed.length > 0 && (
          <Card className="mt-6 p-5 sm:p-6">
            <h3 className="font-display text-xl font-medium text-ink mb-3">
              Ones to look at again
            </h3>
            <ul className="divide-y divide-ink/8">
              {quiz.missed.map((m, i) => (
                <li key={i} className="py-3 font-semibold text-ink">
                  <strong className="font-extrabold">{m.front}</strong>
                  <span className="text-ink-soft">: {m.answer}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={start}>Try again</Button>
          <Button variant="outline" onClick={() => setQuiz(null)}>
            Pick another deck
          </Button>
        </div>
      </section>
    );
  }

  if (quiz) {
    const q = quiz.questions[quiz.index];
    const pct = Math.round(((quiz.index + (quiz.chosen !== null ? 1 : 0)) / quiz.questions.length) * 100);
    return (
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <SectionTitle tone="red">Quick quiz</SectionTitle>
          <Badge tone="yellow">
            Question {quiz.index + 1} of {quiz.questions.length}
          </Badge>
          <Badge tone="green">Score: {quiz.score}</Badge>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-pen-red transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Card className="mt-5 border-pen-blue/40 p-6 text-center">
          <p className="font-display text-2xl font-medium leading-snug text-ink">{q.front}</p>
        </Card>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {q.options.map((option, i) => {
            let cls =
              'rounded-3xl border-2 border-ink/15 bg-white px-5 py-4 text-left text-base font-bold text-ink shadow-[0_3px_0_0_rgba(46,42,38,0.10)] transition cursor-pointer hover:border-pen-blue hover:-translate-y-0.5';
            if (quiz.chosen !== null) {
              if (i === q.correctIndex)
                cls =
                  'rounded-3xl border-2 border-emerald-500 bg-emerald-50 px-5 py-4 text-left text-base font-bold text-emerald-900 transition cursor-pointer';
              else if (i === quiz.chosen)
                cls =
                  'rounded-3xl border-2 border-pen-red bg-red-50 px-5 py-4 text-left text-base font-bold text-red-900 transition cursor-pointer';
              else cls += ' opacity-60';
            }
            return (
              <button key={i} className={cls} onClick={() => choose(i)}>
                {option}
              </button>
            );
          })}
        </div>
        {quiz.chosen !== null && (
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className="font-bold text-ink">
              {quiz.chosen === q.correctIndex
                ? 'Correct.'
                : `Not quite. The answer is: ${q.options[q.correctIndex]}`}
            </span>
            <Button onClick={next}>
              {quiz.index + 1 >= quiz.questions.length ? 'See results' : 'Next question'}
            </Button>
          </div>
        )}
        <div className="mt-6">
          <Button variant="ghost" onClick={() => setQuiz(null)}>
            Quit quiz
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionTitle tone="red">Quick quiz</SectionTitle>
      <p className="mb-6 max-w-xl font-semibold text-ink-soft">
        Pick a deck and StudyMate turns it into a multiple choice quiz. You get up to 10
        questions, and at the end you see the ones you missed.
      </p>
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-52 flex-1">
            <FieldLabel>Deck</FieldLabel>
            <select
              className={inputCls}
              value={deck?.id || ''}
              onChange={(e) => setDeckId(e.target.value)}
            >
              {usableDecks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.cards.length} cards)
                </option>
              ))}
            </select>
          </label>
          <Button onClick={start}>Start quiz</Button>
        </div>
        {state.decks.some((d) => d.cards.length < 4) && (
          <p className="mt-3 text-sm font-semibold text-ink-soft">
            Decks with fewer than 4 cards cannot make a quiz yet, so they are not listed.
          </p>
        )}
      </Card>
    </section>
  );
}

/* ---------------- Study timer ---------------- */

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // sound is a bonus, the timer works without it
  }
}

function TimerTab({ state, update }) {
  const { studyMinutes, breakMinutes } = state.settings;
  const [phase, setPhase] = useState('study'); // 'study' or 'break'
  const [subjectId, setSubjectId] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(studyMinutes * 60);
  const [running, setRunning] = useState(false);
  const endAtRef = useRef(null);

  const activeSubjectId = subjectId || state.subjects[0]?.id || '';
  const today = toDateStr(new Date());
  const sessionsToday = state.sessions.filter((s) => s.date === today).length;

  // when the phase or the settings change, reset the clock (only while paused)
  useEffect(() => {
    if (!running) {
      setSecondsLeft((phase === 'study' ? studyMinutes : breakMinutes) * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, studyMinutes, breakMinutes]);

  useEffect(() => {
    if (!running) return;
    endAtRef.current = Date.now() + secondsLeft * 1000;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(timer);
        beep();
        if (phase === 'study') {
          // a finished study session counts towards the chosen subject
          if (activeSubjectId) {
            update({
              sessions: [
                ...state.sessions,
                { id: uid(), subjectId: activeSubjectId, date: today, minutes: studyMinutes },
              ],
            });
          }
          setPhase('break');
          setSecondsLeft(breakMinutes * 60);
        } else {
          setPhase('study');
          setSecondsLeft(studyMinutes * 60);
        }
        // keep going into the next phase, the user can pause any time
        endAtRef.current = Date.now() + (phase === 'study' ? breakMinutes : studyMinutes) * 60000;
      }
    }, 250);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  const reset = () => {
    setRunning(false);
    setPhase('study');
    setSecondsLeft(studyMinutes * 60);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  // progress ring for the hero timer
  const totalSeconds = (phase === 'study' ? studyMinutes : breakMinutes) * 60;
  const fraction = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const ringR = 104;
  const ringC = 2 * Math.PI * ringR;
  const ringColor = phase === 'study' ? 'var(--color-pen-red)' : 'var(--color-pen-blue)';

  return (
    <section>
      <SectionTitle>Study timer</SectionTitle>
      <p className="mb-6 max-w-xl font-semibold text-ink-soft">
        Study for a set time, then take a short break. When a study session finishes it is
        logged against the subject you picked, so your weekly progress stays up to date.
      </p>

      <Card className="mx-auto max-w-lg p-6 pt-8 text-center sm:p-8">
        <Badge tone={phase === 'study' ? 'red' : 'blue'}>
          {phase === 'study' ? 'Study time' : 'Break time'}
        </Badge>
        <div className="relative mx-auto mt-5 h-60 w-60">
          <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90">
            <circle
              cx="120"
              cy="120"
              r={ringR}
              fill="none"
              stroke="rgba(46,42,38,0.08)"
              strokeWidth="14"
            />
            <circle
              cx="120"
              cy="120"
              r={ringR}
              fill="none"
              stroke={ringColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - fraction)}
              style={{ transition: 'stroke-dashoffset 0.3s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display text-6xl font-semibold tabular-nums text-ink">
              {mm}:{ss}
            </p>
            <p className="mt-1 text-sm font-bold text-ink-soft">
              {running ? 'Keep going' : 'Ready when you are'}
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-center gap-3">
          {running ? (
            <Button onClick={() => setRunning(false)}>Pause</Button>
          ) : (
            <Button onClick={() => setRunning(true)}>Start</Button>
          )}
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
        <p className="mt-4 font-semibold text-ink-soft">
          Sessions finished today: {sessionsToday}
        </p>
      </Card>

      <Card className="mt-8 p-5 sm:p-6">
        <h3 className="font-display text-xl font-medium text-ink mb-4">Settings</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label>
            <FieldLabel>Subject</FieldLabel>
            <select
              className={inputCls}
              value={activeSubjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>Study minutes</FieldLabel>
            <input
              className={`${inputCls} w-28`}
              type="number"
              min="1"
              max="180"
              value={studyMinutes}
              onChange={(e) =>
                update({
                  settings: {
                    ...state.settings,
                    studyMinutes: Math.max(1, Number(e.target.value) || 1),
                  },
                })
              }
            />
          </label>
          <label>
            <FieldLabel>Break minutes</FieldLabel>
            <input
              className={`${inputCls} w-28`}
              type="number"
              min="1"
              max="60"
              value={breakMinutes}
              onChange={(e) =>
                update({
                  settings: {
                    ...state.settings,
                    breakMinutes: Math.max(1, Number(e.target.value) || 1),
                  },
                })
              }
            />
          </label>
        </div>
        {state.subjects.length === 0 && (
          <p className="mt-3 font-semibold text-ink-soft">
            Add a subject in the Subjects tab so finished sessions have somewhere to go.
          </p>
        )}
      </Card>
    </section>
  );
}

/* ---------------- Subjects ---------------- */

function SubjectsTab({ state, update }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('3');
  const [logSubject, setLogSubject] = useState('');
  const [logMinutes, setLogMinutes] = useState('25');

  const today = toDateStr(new Date());

  const addSubject = () => {
    const n = name.trim();
    if (!n) return;
    update({
      subjects: [
        ...state.subjects,
        { id: uid(), name: n, targetHours: Math.max(1, Number(target) || 1) },
      ],
    });
    setName('');
  };

  const deleteSubject = (subject) => {
    if (
      !window.confirm(
        `Delete ${subject.name}? Its decks and logged study time will be deleted too.`
      )
    )
      return;
    update({
      subjects: state.subjects.filter((s) => s.id !== subject.id),
      decks: state.decks.filter((d) => d.subjectId !== subject.id),
      sessions: state.sessions.filter((s) => s.subjectId !== subject.id),
    });
  };

  const logSession = () => {
    const subjectId = logSubject || state.subjects[0]?.id;
    const minutes = Math.max(1, Number(logMinutes) || 0);
    if (!subjectId || !minutes) return;
    update({
      sessions: [...state.sessions, { id: uid(), subjectId, date: today, minutes }],
    });
  };

  return (
    <section>
      <SectionTitle>Subjects</SectionTitle>
      <p className="mb-6 max-w-xl font-semibold text-ink-soft">
        Set a weekly target for each subject. Study time from the timer, and time you log
        by hand, counts towards this week's progress.
      </p>

      {state.subjects.length === 0 && (
        <EmptyNote>No subjects yet. Add your first one below.</EmptyNote>
      )}

      <div className="flex flex-col gap-4">
        {state.subjects.map((subject, i) => {
          const done = minutesThisWeek(state.sessions, subject.id, today);
          const targetMinutes = subject.targetHours * 60;
          const pct = Math.min(100, Math.round((done / targetMinutes) * 100));
          const deckCount = state.decks.filter((d) => d.subjectId === subject.id).length;
          return (
            <Card key={subject.id} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl font-medium text-ink">
                    {subject.name}
                  </h3>
                  <p className="mt-1 font-semibold text-ink-soft">
                    {deckCount} {deckCount === 1 ? 'deck' : 'decks'} · Target{' '}
                    {subject.targetHours}h a week
                  </p>
                </div>
                <Button variant="danger" onClick={() => deleteSubject(subject)}>
                  Delete
                </Button>
              </div>
              <div className="mt-4 h-4 overflow-hidden rounded-full bg-ink/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    i % 2 === 0 ? 'bg-pen-blue' : 'bg-pen-red'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 font-semibold text-ink-soft">
                {done} of {targetMinutes} minutes this week ({pct}%)
                {pct >= 100 && (
                  <span className="ml-2">
                    <Badge tone="green">target reached</Badge>
                  </span>
                )}
              </p>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 p-5 sm:p-6">
        <h3 className="font-display text-xl font-medium text-ink mb-4">Add a subject</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-52 flex-1">
            <FieldLabel>Subject name</FieldLabel>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chemistry"
              onKeyDown={(e) => e.key === 'Enter' && addSubject()}
            />
          </label>
          <label>
            <FieldLabel>Hours a week</FieldLabel>
            <input
              className={`${inputCls} w-28`}
              type="number"
              min="1"
              max="40"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <Button variant="blue" onClick={addSubject}>
            Add subject
          </Button>
        </div>
      </Card>

      {state.subjects.length > 0 && (
        <Card className="mt-6 p-5 sm:p-6">
          <h3 className="font-display text-xl font-medium text-ink mb-1">
            Log study time by hand
          </h3>
          <p className="mb-4 font-semibold text-ink-soft">
            For studying you did away from the timer.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label>
              <FieldLabel>Subject</FieldLabel>
              <select
                className={inputCls}
                value={logSubject || state.subjects[0]?.id || ''}
                onChange={(e) => setLogSubject(e.target.value)}
              >
                {state.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldLabel>Minutes</FieldLabel>
              <input
                className={`${inputCls} w-28`}
                type="number"
                min="1"
                max="600"
                value={logMinutes}
                onChange={(e) => setLogMinutes(e.target.value)}
              />
            </label>
            <Button variant="blue" onClick={logSession}>
              Log time
            </Button>
          </div>
        </Card>
      )}
    </section>
  );
}
