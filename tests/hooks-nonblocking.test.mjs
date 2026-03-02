import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('compatibility hook wrappers delegate to claude adapter files', () => {
  const updateWrapper = read('hooks/gsd-check-update.js');
  const statuslineWrapper = read('hooks/gsd-statusline.js');

  assert.match(updateWrapper, /adapters\/claude-code\/hooks\/gsd-check-update\.js/);
  assert.match(statuslineWrapper, /adapters\/claude-code\/statusline\/gsd-statusline\.js/);
});

test('claude adapter hook implementations are defensive and non-blocking', () => {
  const updateHook = read('adapters/claude-code/hooks/gsd-check-update.js');
  const statusline = read('adapters/claude-code/statusline/gsd-statusline.js');

  assert.match(updateHook, /try \{/);
  assert.match(statusline, /Silent fail|Silently fail/);
});
