import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = path.join(root, "skills/ui-design");

test("ui-design is discoverable through the hub", () => {
  const skill = readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  assert.match(skill, /^name: ui-design$/m);
  for (const file of ["README.md", "skills/skill-index/SKILL.md"]) {
    assert.ok(readFileSync(path.join(root, file), "utf8").includes("ui-design"), file);
  }
  const registry = JSON.parse(readFileSync(path.join(root, ".skill-lock.json"), "utf8"));
  assert.equal(registry.skills["ui-design"].skillPath, "skills/ui-design/SKILL.md");
});

test("every reference the skill routes to exists, including inspiration and interaction guidance", () => {
  const skill = readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  const references = [...skill.matchAll(/references\/[a-z-]+\.md/g)].map(([reference]) => reference);
  for (const reference of ["proven-products", "attention-and-momentum", "inspiration", "interaction", "motion", "components", "critique"]) {
    assert.ok(references.includes(`references/${reference}.md`), reference);
  }
  for (const reference of new Set(references)) {
    assert.ok(existsSync(path.join(skillRoot, reference)), reference);
  }
});
