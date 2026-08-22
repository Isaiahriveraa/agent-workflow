// Behavioral contract test for the `skill-index` skill (renamed from
// `ask-yonie`). Dependency-free: Node built-ins only (`node:test`,
// `node:assert`), run with `node --test`. Asserts the public routing
// contract: skill name, registry entry, and that no stale `ask-yonie`
// references remain in the hub's routing surfaces.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = join(SKILL_DIR, "SKILL.md");
const HUB_ROOT = join(SKILL_DIR, "..", "..");
const LOCK_PATH = join(HUB_ROOT, ".skill-lock.json");

const read = (path) => readFileSync(path, "utf8");

const frontmatter = () => {
  const m = read(SKILL_PATH).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : "";
};

const field = (name) => {
  const m = frontmatter().match(new RegExp(`^${name}:\\s*(.+)$`, "m"));
  return m ? m[1].trim() : "";
};

describe("skill-index contract", () => {
  it("exposes skills/skill-index/SKILL.md with lower-case kebab name `skill-index`", () => {
    assert.equal(field("name"), "skill-index");
    assert.ok(field("description").length > 20, "description must be non-trivial");
  });

  it("drops the old persona branding from the title", () => {
    assert.ok(read(SKILL_PATH).includes("# Skill Index"));
    assert.ok(!/Ask Yonie|ask-yonie/i.test(read(SKILL_PATH)), "no stale persona name");
  });

  it("registers as `skill-index` in .skill-lock.json pointing at the renamed folder", () => {
    const lock = JSON.parse(read(LOCK_PATH));
    assert.equal(lock.skills["ask-yonie"], undefined, "old key must be removed");
    assert.ok(lock.skills["skill-index"], "new key must exist");
    assert.equal(lock.skills["skill-index"].skillPath, "skills/skill-index/SKILL.md");
  });

  it("leaves no stale ask-yonie routing references in hub routing surfaces", () => {
    for (const path of [
      join(HUB_ROOT, "AGENTS.md"),
      join(HUB_ROOT, "README.md"),
    ]) {
      assert.ok(!/ask-yonie/i.test(read(path)), `stale reference in ${path}`);
    }
  });
});