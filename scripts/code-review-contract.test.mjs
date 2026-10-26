import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('review accepts evidenced comprehension findings without inventing behavioral failures', () => {
  const skill = read('skills/code-review/SKILL.md');
  const reviewer = read('agents/reviewer-maintainability.md');
  const adjudicator = read('agents/adjudicator.md');
  const process = read('skills/code-review/references/review-process.md');
  const reporting = read('skills/code-review/references/reporting.md');
  assert.match(skill, /Behavioral findings.*execution trace/);
  assert.match(skill, /Design findings.*before\/after/);
  assert.doesNotMatch(skill, /Omit naming, formatting/);
  assert.match(reviewer, /Kind: BEHAVIORAL \| DESIGN/);
  assert.match(reviewer, /Before\/after:/);
  assert.doesNotMatch(reviewer, /Do not report naming/);
  assert.match(adjudicator, /For DESIGN findings/);
  assert.match(process, /Design-only findings.*Suggestion/);
  assert.match(reporting, /before\/after.*instead of.*trigger/i);
});
