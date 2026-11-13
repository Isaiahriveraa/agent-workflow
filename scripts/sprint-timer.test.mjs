import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

function timer() {
  const html = fs.readFileSync(new URL('../profiles/timer.html', import.meta.url), 'utf8');
  const elements = Object.fromEntries(['minutes', 'remaining', 'status', 'start', 'reset'].map(id => [id, {
    value: '3', textContent: '', addEventListener(event, callback) { this[event] = callback; },
  }]));
  let now = 0;
  let tick;
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], {
    document: { getElementById: id => elements[id] }, Date: { now: () => now },
    setInterval(callback) { tick = callback; return 1; }, clearInterval() { tick = null; },
  });
  return { elements, advance(ms) { now += ms; tick?.(); } };
}

test('counts elapsed wall time and stops at zero even after a delayed browser tick', () => {
  const { elements, advance } = timer();
  elements.start.click();
  assert.equal(elements.remaining.textContent, '3:00');
  advance(65000);
  assert.equal(elements.remaining.textContent, '1:55');
  advance(180000);
  assert.equal(elements.remaining.textContent, '0:00');
  assert.match(elements.status.textContent, /Time is up/);
});

test('rejects invalid durations without starting a countdown', () => {
  for (const value of ['', '0', '-1', '121', 'not a number']) {
    const { elements, advance } = timer();
    elements.minutes.value = value;
    elements.start.click();
    advance(60000);
    assert.match(elements.status.textContent, /Choose a duration/);
    assert.equal(elements.remaining.textContent, '');
  }
});

test('reset cancels the current attempt and a new duration can start', () => {
  const { elements, advance } = timer();
  elements.start.click();
  elements.reset.click();
  advance(600000);
  assert.match(elements.status.textContent, /Ready/);
  elements.minutes.value = '5';
  elements.start.click();
  assert.equal(elements.remaining.textContent, '5:00');
});
