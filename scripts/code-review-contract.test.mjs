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

test('reviser directly cleans authorized tests while unrelated revisions retain approval boundaries', () => {
  const revision = read('skills/code-review/references/complexity-revision.md');
  const agent = read('agents/complexity-reviser.md');
  assert.match(revision, /generic subagent with that file's content/);
  assert.match(revision, /proposal-only/);
  assert.match(revision, /Dispatch directly in automatic-test-cleanup mode, not proposal-only/);
  assert.match(revision, /without per-test proposals or approval/);
  assert.match(agent, /automatic test cleanup is direct implementation/);
  assert.match(agent, /Unrelated readability and architecture revisions remain proposal-first/);
  assert.match(agent, /Explicit proposal-only or read-only assignments override automatic mode/);
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
    assert.match(read(file), /existing `complexity-reviser` directly performs authorized scoped test cleanup/);
  }
});

test('shared cleanup protects behavior contracts rather than incidental implementation details', () => {
  const cleanup = read('references/test-cleanup.md');
  assert.match(cleanup, /user interactions, observable outcomes, and meaningful public contracts/);
  assert.match(cleanup, /private helpers, helper call order, or exact production copy unless an explicit/);
  assert.match(cleanup, /Exact fixture strings/);
  assert.match(cleanup, /structural accessibility assertions/);
});

test('automatic cleanup keeps uncertain guarantees and never conceals failures', () => {
  const cleanup = read('references/test-cleanup.md');
  const cleaner = read('skills/code-judgment/SKILL.md');
  const hardener = read('agents/hardener.md');
  assert.match(cleanup, /report \*\*Keep \/ Rewrite \/ Delete\*\* retrospectively/);
  assert.match(cleanup, /Activate automatic mode when the user explicitly requests automatic test cleanup/);
  assert.match(cleanup, /neither selecting a finding nor `--fix` alone grants it/);
  assert.match(cleanup, /Keep and report blocked when unique/);
  assert.match(cleanup, /Never delete,[\s\S]*conceal a failure/);
  assert.match(cleaner, /without per-test proposals or approval/);
  assert.match(hardener, /does not grant the hardener deletion authority/);
});

test('unauthorized cleanup keeps deletions pending the user rather than accepting parent approval', () => {
  for (const file of [
    'references/test-cleanup.md',
    'skills/code-judgment/SKILL.md',
    'agents/complexity-reviser.md',
    'skills/code-review/references/complexity-revision.md',
  ]) {
    const policy = read(file);
    assert.match(policy, /without (?:automatic-cleanup|that) authorization/i, file);
    assert.match(policy, /leave\s+(?:proposed\s+)?(?:test\s+)?deletions\s+intact/i, file);
    assert.match(policy, /parent acceptance cannot replace/i, file);
  }
});
