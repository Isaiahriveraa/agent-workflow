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

test('existing reviser is dispatched proposal-first with ownership and approval boundaries', () => {
  const revision = read('skills/code-review/references/complexity-revision.md');
  const agent = read('agents/complexity-reviser.md');
  assert.match(revision, /generic subagent with that file's content/);
  assert.match(revision, /proposal-only/);
  assert.match(agent, /Default mode: proposal-only/);
  assert.match(agent, /explicit authorization/);
  assert.match(agent, /implementation ownership/);
  assert.match(agent, /intent and effects/);
  assert.match(agent, /domain and framework vocabulary/);
  assert.match(agent, /banned-word/);
  assert.match(revision, /fresh blind adversarial reviewer/);
  assert.match(revision, /Skip it only with `--no-revise`/);
  assert.match(revision, /Not run with `--review-only`/);
});

test('review references and agent dispatch targets resolve from the hub', () => {
  for (const file of ['SKILL.md', 'references/review-process.md', 'references/complexity-revision.md']) {
    const content = read(`skills/code-review/${file}`);
    for (const [, agent] of content.matchAll(/~\/\.agents\/(agents\/[a-z-]+\.md)/g)) {
      assert.ok(existsSync(new URL(`../${agent}`, import.meta.url)), agent);
    }
    for (const [, reference] of content.matchAll(/\]\(([^)]+\.md)\)/g)) {
      assert.ok(existsSync(new URL(`../skills/code-review/${file === 'SKILL.md' ? '' : 'references/'}${reference}`, import.meta.url)), reference);
    }
  }
  for (const file of ['README.md', 'skills/skill-index/SKILL.md']) {
    assert.match(read(file), /existing `complexity-reviser` is the cleaner/);
  }
});
