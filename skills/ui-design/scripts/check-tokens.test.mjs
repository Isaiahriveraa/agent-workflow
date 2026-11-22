import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findRawColors, isTokenFile } from './check-tokens.mjs';

test('flags hex literals and color functions', () => {
  const findings = findRawColors('color: #2a2a2a;\nbackground: rgb(0, 0, 0);');
  assert.deepEqual(
    findings.map(({ line, value }) => [line, value]),
    [[1, '#2a2a2a'], [2, 'rgb(0, 0, 0)']],
  );
});

test('accepts short and alpha hex forms', () => {
  assert.equal(findRawColors('a: #fff; b: #ffff; c: #ffffff80;').length, 3);
});

test('ignores token references and non-color hashes', () => {
  assert.equal(findRawColors('color: var(--text-primary);').length, 0);
  assert.equal(findRawColors('<a href="#main">Skip</a>').length, 0);
});

test('skips comment lines', () => {
  assert.equal(findRawColors('// old: #123456\n/* #abcdef */\n * #fedcba').length, 0);
});

test('recognises token files', () => {
  assert.equal(isTokenFile('/app/styles/tokens.css'), true);
  assert.equal(isTokenFile('/app/theme.ts'), true);
  assert.equal(isTokenFile('/app/components/Button.tsx'), false);
});
