import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = join(SKILL_DIR, "..", "..");
const skillMd = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
const lock = JSON.parse(readFileSync(join(HUB_ROOT, ".skill-lock.json"), "utf8"));

function frontmatter() {
  const match = skillMd.match(/^---\n([\s\S]*?)\n---/);
  const fields = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return fields;
}

test("enforce frontmatter: name is enforce with a review+enforce description", () => {
  const fm = frontmatter();
  assert.equal(fm.name, "enforce");
  assert.ok(fm.description.length > 40, "description should be non-trivial");
  assert.match(fm.description, /review/i);
  assert.match(fm.description, /enforce/i);
});

test("enforce workflow has three phases (review -> write -> verify)", () => {
  assert.match(skillMd, /## Phase 1[^\n]*/i);
  assert.match(skillMd, /## Phase 2[^\n]*/i);
  assert.match(skillMd, /## Phase 3[^\n]*/i);
});

test("enforce produces a rationale table (what/why contract)", () => {
  assert.match(skillMd, /rationale table/i);
  assert.match(skillMd, /\| ID \|/i);
  assert.match(skillMd, /\| File:line \|/i);
  assert.match(skillMd, /\| What \|/i);
  assert.match(skillMd, /\| Why /i);
});

test("enforce keeps reviewer and writer as separate agents", () => {
  assert.match(skillMd, /separate agents/i);
});

test("enforce documents gate mode and hygiene mode", () => {
  assert.match(skillMd, /gate mode/i);
  assert.match(skillMd, /hygiene mode/i);
});

test("subagent-implementation-review skill directory is gone", () => {
  assert.equal(
    existsSync(join(HUB_ROOT, "skills", "subagent-implementation-review")),
    false,
    "skills/subagent-implementation-review must be deleted"
  );
});

test("lock registers enforce and no longer registers subagent-implementation-review", () => {
  const enforce = lock.skills?.["enforce"] ?? lock["enforce"];
  assert.ok(enforce, "lock must register enforce");
  assert.equal(enforce.skillPath, "skills/enforce/SKILL.md");
  assert.equal(
    lock.skills?.["subagent-implementation-review"] ??
      lock["subagent-implementation-review"],
    undefined,
    "lock must not register subagent-implementation-review"
  );
});

test("no stale subagent-implementation-review references in routing docs", () => {
  for (const file of ["AGENTS.md", "README.md"]) {
    const content = readFileSync(join(HUB_ROOT, file), "utf8");
    assert.doesNotMatch(
      content,
      /subagent-implementation-review/i,
      `${file} must not mention subagent-implementation-review`
    );
  }
});