# StudyMate

StudyMate is a small web app that helps students revise. It puts flashcards, a quick quiz, a study timer and weekly subject targets in one place, so you do not need four different apps to plan your reading.

I built it for GenHacks 2026 (Open track). It runs in the browser and saves everything on your own device, so there is no sign-up and no account to make.

## The problem

Most students I know revise with loose notes, screenshots and a phone timer. Cards get lost, there is no easy way to test yourself, and nobody really knows if they studied enough this week. StudyMate keeps all of that together: make a deck for a subject, test yourself with a quiz made from the same cards, and use the timer so your study time is counted towards a weekly target.

## What it does

**Flashcards**
- Create a deck for any subject and add cards (question on the front, answer on the back).
- Click a card to flip it, move through the deck, or shuffle it.
- Mark each card "Know it" or "Still learning" so you can see what needs more work.
- Comes with a ready-made Biology basics deck (12 cards) so it is useful the first time you open it.

**Quick quiz**
- Pick a deck and StudyMate turns it into a multiple choice quiz: the right answer plus three wrong ones taken from other cards in the deck.
- Up to 10 questions, with right/wrong feedback as you go.
- At the end you get your score and a list of the ones you missed, so you know what to revise again.

**Study timer**
- A Pomodoro-style timer: study for a set time (25 minutes by default), then a short break (5 minutes). Both are adjustable.
- Pick the subject before you start. When a study session finishes, it is logged against that subject automatically.
- Shows how many sessions you have finished today.

**Subjects**
- Add your subjects and set a target, like 3 hours a week for Biology.
- A progress bar shows how much of this week's target you have done (the week runs Monday to Sunday).
- You can also log study time by hand for reading you did away from the timer.

Everything is saved in the browser's local storage. Your decks and study time stay on your device and are still there when you come back.

## How to run it

You need Node.js installed.

```
npm install
npm run dev
```

Then open the link Vite prints (usually http://localhost:5173).

To build the production version:

```
npm run build
npm run preview
```

## How it is built

- React with Vite and Tailwind CSS. The buttons, cards, inputs, badges and progress bars follow the shadcn/ui component patterns, written by hand in Tailwind so there is no heavy UI library to load.
- The design is a notebook-and-desk look: warm ruled paper with a red margin line, coral-red and sky-blue pen-mark accents, sticky-note deck cards and a big circular focus timer. Headings use the Fredoka font and body text uses Nunito, both self-hosted in `public/fonts` so the app works fully offline.
- No backend, no database. All data lives in localStorage as one JSON object (subjects, decks, sessions, timer settings).
- The quiz builder, the shuffle and the weekly progress maths are plain functions in `src/lib.js`, kept separate from the UI so they can be tested on their own. Run the tests with `npm test`.

## What I would add next

- A way to export and import decks so students can share them.
- Spaced repetition, so cards marked "still learning" come back more often.
- A streak counter for study days.
