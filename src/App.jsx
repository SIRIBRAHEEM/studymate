import { useEffect, useMemo, useRef, useState } from 'react';
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">S</span>
          <div>
            <h1>StudyMate</h1>
            <p>Flashcards, quick quizzes and a study timer in one place.</p>
          </div>
        </div>
        <nav className="tabs">
          {[
            ['decks', 'Flashcards'],
            ['quiz', 'Quick quiz'],
            ['timer', 'Study timer'],
            ['subjects', 'Subjects'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? 'tab active' : 'tab'}
              onClick={() => setTab(key)}
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

      <footer className="footer">
        Your decks and study time are saved in this browser only.
      </footer>
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
      <h2>Your decks</h2>
      {state.decks.length === 0 && (
        <p className="empty">No decks yet. Create your first one below.</p>
      )}
      <div className="deck-grid">
        {state.decks.map((deck) => {
          const known = deck.cards.filter((c) => c.known === true).length;
          return (
            <article key={deck.id} className="deck-card">
              <h3>{deck.name}</h3>
              <p className="muted">
                {subjectName(deck.subjectId)} · {deck.cards.length}{' '}
                {deck.cards.length === 1 ? 'card' : 'cards'}
                {deck.cards.length > 0 && ` · ${known} known`}
              </p>
              <div className="row">
                <button className="primary" onClick={() => setOpenDeckId(deck.id)}>
                  Study
                </button>
                <button className="ghost danger" onClick={() => deleteDeck(deck.id)}>
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="panel">
        <h3>New deck</h3>
        {state.subjects.length === 0 ? (
          <p className="muted">Add a subject first in the Subjects tab, then come back.</p>
        ) : (
          <div className="form-row">
            <input
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Deck name, e.g. Chemistry terms"
              onKeyDown={(e) => e.key === 'Enter' && createDeck()}
            />
            <select
              value={newDeckSubject || state.subjects[0]?.id || ''}
              onChange={(e) => setNewDeckSubject(e.target.value)}
            >
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button className="primary" onClick={createDeck}>
              Create deck
            </button>
          </div>
        )}
      </div>
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
      <button className="ghost" onClick={onBack}>
        ← All decks
      </button>
      <h2>{deck.name}</h2>
      <p className="muted">
        {subjectLabel} · {deck.cards.length} cards · {knownCount} marked known
      </p>

      {deck.cards.length === 0 ? (
        <p className="empty">This deck is empty. Add your first card below.</p>
      ) : (
        <>
          <div
            className={flipped ? 'flashcard flipped' : 'flashcard'}
            onClick={() => setFlipped(!flipped)}
            title="Click to flip"
          >
            <span className="flashcard-side">{flipped ? 'Answer' : 'Question'}</span>
            <p>{flipped ? card.back : card.front}</p>
            <span className="flashcard-hint">
              {flipped ? 'Click to see the question' : 'Click to reveal the answer'}
            </span>
          </div>

          <div className="row centre">
            <button onClick={() => goTo(index - 1)} disabled={index === 0}>
              Previous
            </button>
            <span className="muted">
              Card {Math.min(index + 1, orderedCards.length)} of {orderedCards.length}
            </span>
            <button
              onClick={() => goTo(index + 1)}
              disabled={index >= orderedCards.length - 1}
            >
              Next
            </button>
            <button
              onClick={() => {
                setOrder(shuffle(order));
                setIndex(0);
                setFlipped(false);
              }}
            >
              Shuffle
            </button>
          </div>

          <div className="row centre">
            <button className="primary" onClick={() => mark(true)}>
              Know it
            </button>
            <button onClick={() => mark(false)}>Still learning</button>
            {card.known !== null && (
              <span className="muted">
                {card.known ? 'Marked as known' : 'Marked as still learning'}
              </span>
            )}
          </div>
        </>
      )}

      <div className="panel">
        <h3>Add a card</h3>
        <div className="form-col">
          <input
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Front (the question or term)"
          />
          <input
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Back (the answer)"
            onKeyDown={(e) => e.key === 'Enter' && addCard()}
          />
          <button className="primary" onClick={addCard}>
            Add card
          </button>
        </div>
      </div>

      {deck.cards.length > 0 && (
        <div className="panel">
          <h3>Cards in this deck</h3>
          <ul className="card-list">
            {deck.cards.map((c) => (
              <li key={c.id}>
                <span>
                  <strong>{c.front}</strong> — {c.back}
                  {c.known === true && <em className="tag">known</em>}
                  {c.known === false && <em className="tag warn">still learning</em>}
                </span>
                <button className="ghost danger" onClick={() => deleteCard(c.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
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
        <h2>Quick quiz</h2>
        <p className="empty">
          A quiz needs a deck with at least 4 cards. Add more cards to a deck in the
          Flashcards tab, then come back.
        </p>
      </section>
    );
  }

  if (quiz && quiz.index >= quiz.questions.length) {
    return (
      <section>
        <h2>Quiz finished</h2>
        <p className="score">
          You scored {quiz.score} out of {quiz.questions.length}.
        </p>
        {quiz.missed.length === 0 ? (
          <p>Nothing missed. Nice work.</p>
        ) : (
          <>
            <h3>Ones to look at again</h3>
            <ul className="card-list">
              {quiz.missed.map((m, i) => (
                <li key={i}>
                  <span>
                    <strong>{m.front}</strong> — {m.answer}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="row">
          <button className="primary" onClick={start}>
            Try again
          </button>
          <button onClick={() => setQuiz(null)}>Pick another deck</button>
        </div>
      </section>
    );
  }

  if (quiz) {
    const q = quiz.questions[quiz.index];
    return (
      <section>
        <h2>Quick quiz</h2>
        <p className="muted">
          Question {quiz.index + 1} of {quiz.questions.length} · Score so far: {quiz.score}
        </p>
        <div className="quiz-question">
          <p>{q.front}</p>
        </div>
        <div className="quiz-options">
          {q.options.map((option, i) => {
            let cls = 'option';
            if (quiz.chosen !== null) {
              if (i === q.correctIndex) cls += ' right';
              else if (i === quiz.chosen) cls += ' wrong';
            }
            return (
              <button key={i} className={cls} onClick={() => choose(i)}>
                {option}
              </button>
            );
          })}
        </div>
        {quiz.chosen !== null && (
          <div className="row">
            <span>
              {quiz.chosen === q.correctIndex
                ? 'Correct.'
                : `Not quite. The answer is: ${q.options[q.correctIndex]}`}
            </span>
            <button className="primary" onClick={next}>
              {quiz.index + 1 >= quiz.questions.length ? 'See results' : 'Next question'}
            </button>
          </div>
        )}
        <button className="ghost" onClick={() => setQuiz(null)}>
          Quit quiz
        </button>
      </section>
    );
  }

  return (
    <section>
      <h2>Quick quiz</h2>
      <p>
        Pick a deck and StudyMate turns it into a multiple choice quiz. You get up to 10
        questions, and at the end you see the ones you missed.
      </p>
      <div className="form-row">
        <select value={deck?.id || ''} onChange={(e) => setDeckId(e.target.value)}>
          {usableDecks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.cards.length} cards)
            </option>
          ))}
        </select>
        <button className="primary" onClick={start}>
          Start quiz
        </button>
      </div>
      {state.decks.some((d) => d.cards.length < 4) && (
        <p className="muted">
          Decks with fewer than 4 cards cannot make a quiz yet, so they are not listed.
        </p>
      )}
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

  return (
    <section>
      <h2>Study timer</h2>
      <p>
        Study for a set time, then take a short break. When a study session finishes it is
        logged against the subject you picked, so your weekly progress stays up to date.
      </p>

      <div className="timer-box">
        <p className="timer-phase">{phase === 'study' ? 'Study time' : 'Break time'}</p>
        <p className="timer-clock">
          {mm}:{ss}
        </p>
        <div className="row centre">
          {running ? (
            <button className="primary" onClick={() => setRunning(false)}>
              Pause
            </button>
          ) : (
            <button className="primary" onClick={() => setRunning(true)}>
              Start
            </button>
          )}
          <button onClick={reset}>Reset</button>
        </div>
        <p className="muted">Sessions finished today: {sessionsToday}</p>
      </div>

      <div className="panel">
        <h3>Settings</h3>
        <div className="form-row">
          <label>
            Subject
            <select
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
            Study minutes
            <input
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
            Break minutes
            <input
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
          <p className="muted">
            Add a subject in the Subjects tab so finished sessions have somewhere to go.
          </p>
        )}
      </div>
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
      <h2>Subjects</h2>
      <p>
        Set a weekly target for each subject. Study time from the timer, and time you log
        by hand, counts towards this week's progress.
      </p>

      {state.subjects.length === 0 && (
        <p className="empty">No subjects yet. Add your first one below.</p>
      )}

      <div className="subject-list">
        {state.subjects.map((subject) => {
          const done = minutesThisWeek(state.sessions, subject.id, today);
          const targetMinutes = subject.targetHours * 60;
          const pct = Math.min(100, Math.round((done / targetMinutes) * 100));
          const deckCount = state.decks.filter((d) => d.subjectId === subject.id).length;
          return (
            <article key={subject.id} className="subject-card">
              <div className="subject-head">
                <h3>{subject.name}</h3>
                <button className="ghost danger" onClick={() => deleteSubject(subject)}>
                  Delete
                </button>
              </div>
              <p className="muted">
                {deckCount} {deckCount === 1 ? 'deck' : 'decks'} · Target{' '}
                {subject.targetHours}h a week
              </p>
              <div className="progress">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="muted">
                {done} of {targetMinutes} minutes this week ({pct}%)
                {pct >= 100 && ' — target reached'}
              </p>
            </article>
          );
        })}
      </div>

      <div className="panel">
        <h3>Add a subject</h3>
        <div className="form-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Subject name, e.g. Chemistry"
            onKeyDown={(e) => e.key === 'Enter' && addSubject()}
          />
          <label>
            Hours a week
            <input
              type="number"
              min="1"
              max="40"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <button className="primary" onClick={addSubject}>
            Add subject
          </button>
        </div>
      </div>

      {state.subjects.length > 0 && (
        <div className="panel">
          <h3>Log study time by hand</h3>
          <p className="muted">For studying you did away from the timer.</p>
          <div className="form-row">
            <select
              value={logSubject || state.subjects[0]?.id || ''}
              onChange={(e) => setLogSubject(e.target.value)}
            >
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <label>
              Minutes
              <input
                type="number"
                min="1"
                max="600"
                value={logMinutes}
                onChange={(e) => setLogMinutes(e.target.value)}
              />
            </label>
            <button className="primary" onClick={logSession}>
              Log time
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
