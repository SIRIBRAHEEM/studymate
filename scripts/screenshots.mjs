// Takes the 6 documentation screenshots in docs/ and reports console errors.
// Run after `npm run build`: node scripts/screenshots.mjs

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const EXE = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const PORT = 4181;
const BASE = `http://localhost:${PORT}/`;

mkdirSync('docs', { recursive: true });

const server = spawn('./node_modules/.bin/vite', ['preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'pipe',
});
server.stdout.on('data', (d) => process.stdout.write(`[preview] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) {
        const html = await res.text();
        if (html.includes('<title>StudyMate</title>')) return;
      }
    } catch {
      // not up yet
    }
    await wait(500);
  }
  throw new Error('preview server did not start');
}

const errors = [];

async function newPage(browser, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return page;
}

try {
  await waitForServer();
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await newPage(browser, { width: 1280, height: 900 });

  // 1. decks list
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const title = await page.title();
  if (title !== 'StudyMate') throw new Error(`Wrong app on port ${PORT}: title is "${title}"`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/1-decks.png' });

  // 2. flashcard study view
  await page.getByRole('button', { name: 'Study', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/2-flashcard.png' });

  // 3. quiz question
  await page.getByRole('button', { name: 'Quick quiz' }).click();
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/3-quiz.png' });

  // 4. study timer hero
  await page.getByRole('button', { name: 'Study timer' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'docs/4-timer.png' });

  // 5. subjects with progress
  await page.getByRole('button', { name: 'Subjects' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/5-subjects.png' });

  // 6. mobile decks view
  const mobile = await newPage(browser, { width: 390, height: 844 });
  await mobile.goto(BASE, { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(600);
  await mobile.screenshot({ path: 'docs/6-mobile.png' });

  await browser.close();
  console.log('screenshots done');
  console.log('console errors:', errors.length === 0 ? 'none' : errors.join('\n'));
} finally {
  server.kill();
}
