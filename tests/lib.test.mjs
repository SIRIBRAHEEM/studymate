// Unit tests for the pure logic in src/lib.js.
// Run with: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shuffle,
  makeQuiz,
  weekStart,
  toDateStr,
  minutesThisWeek,
  sampleData,
} from '../src/lib.js';

test('shuffle returns a new array with the same items', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input);
  assert.notEqual(out, input);
  assert.deepEqual([...out].sort(), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
});

test('makeQuiz needs at least 4 cards', () => {
  assert.deepEqual(makeQuiz([]), []);
  assert.deepEqual(makeQuiz([{ id: 'a', front: 'f', back: 'b' }]), []);
});

test('makeQuiz builds questions with the right answer among 4 options', () => {
  const cards = Array.from({ length: 6 }, (_, i) => ({
    id: `c${i}`,
    front: `Q${i}`,
    back: `A${i}`,
  }));
  const quiz = makeQuiz(cards);
  assert.equal(quiz.length, 6);
  for (const q of quiz) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    const card = cards.find((c) => c.id === q.cardId);
    assert.equal(q.front, card.front);
    assert.equal(q.options[q.correctIndex], card.back);
  }
});

test('makeQuiz caps the number of questions at 10', () => {
  const cards = Array.from({ length: 20 }, (_, i) => ({
    id: `c${i}`,
    front: `Q${i}`,
    back: `A${i}`,
  }));
  assert.equal(makeQuiz(cards).length, 10);
});

test('weekStart returns the Monday of the same week', () => {
  assert.equal(weekStart('2026-11-25'), '2026-11-23'); // Wednesday to Monday
  assert.equal(weekStart('2026-11-23'), '2026-11-23'); // Monday stays
  assert.equal(weekStart('2026-11-29'), '2026-11-23'); // Sunday goes back
});

test('toDateStr formats YYYY-MM-DD with padding', () => {
  assert.equal(toDateStr(new Date(2026, 0, 5)), '2026-01-05');
});

test('minutesThisWeek only counts the current week and subject', () => {
  const sessions = [
    { subjectId: 's1', date: '2026-11-23', minutes: 25 }, // Monday, counts
    { subjectId: 's1', date: '2026-11-29', minutes: 30 }, // Sunday, counts
    { subjectId: 's1', date: '2026-11-22', minutes: 99 }, // last week, no
    { subjectId: 's1', date: '2026-11-30', minutes: 99 }, // next week, no
    { subjectId: 's2', date: '2026-11-25', minutes: 99 }, // other subject, no
  ];
  assert.equal(minutesThisWeek(sessions, 's1', '2026-11-25'), 55);
  assert.equal(minutesThisWeek(sessions, 's2', '2026-11-25'), 99);
  assert.equal(minutesThisWeek([], 's1', '2026-11-25'), 0);
});

test('sampleData gives a usable first-run state', () => {
  const data = sampleData();
  assert.equal(data.subjects.length, 2);
  assert.equal(data.decks.length, 1);
  assert.equal(data.decks[0].cards.length, 12);
  assert.equal(data.decks[0].subjectId, data.subjects[0].id);
  assert.deepEqual(data.sessions, []);
  assert.equal(data.settings.studyMinutes, 25);
  assert.equal(data.settings.breakMinutes, 5);
  // the sample deck must be big enough to make a quiz
  assert.equal(makeQuiz(data.decks[0].cards).length, 10);
});
