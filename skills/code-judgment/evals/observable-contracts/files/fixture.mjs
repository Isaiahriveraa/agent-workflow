import assert from 'node:assert/strict';
import test from 'node:test';

export function renderMonth(title, expanded = false) {
  return `<button aria-label="Toggle month" aria-expanded="${expanded}" aria-controls="month-panel">${title}</button><section id="month-panel" class="month-panel">Events</section>`;
}
export const styles = '.month-panel { position: relative; }';
const fixtureTitle = 'Meet Ada: A & B, 9:00 AM';

test('renders the supplied fixture text unchanged', () => {
  assert.ok(renderMonth(fixtureTitle).includes(`>${fixtureTitle}</button>`));
});

test('native toggle exposes accessible state and its controlled panel', () => {
  const html = renderMonth(fixtureTitle, true);
  assert.match(html, /<button\b/);
  assert.match(html, /aria-label="Toggle month"/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(renderMonth(fixtureTitle, false), /aria-expanded="false"/);
  assert.match(html, /aria-controls="month-panel"/);
  assert.match(html, /<section id="month-panel"/);
});

// Weak source-level protection, but currently the only guard against out-of-flow cards.
test('collapsed panel stays in document flow', () => {
  assert.match(styles, /\.month-panel\s*\{\s*position:\s*relative;/);
});
