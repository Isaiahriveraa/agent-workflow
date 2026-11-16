import assert from "node:assert/strict";
import { accessSync, constants, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hubRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const name of ["rederive"]) {
  test(`${name} requires explicit user invocation`, () => {
    const skill = readFileSync(path.join(hubRoot, "skills", name, "SKILL.md"), "utf8");
    const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(frontmatter, "skill must have frontmatter");
    assert.match(frontmatter[1], /^disable-model-invocation: true$/m);
  });
}

test("rederive includes its analysis tools and is listed for manual use", () => {
  for (const script of ["history.sh", "structure.py"]) {
    accessSync(path.join(hubRoot, "skills/rederive/scripts", script), constants.X_OK);
  }
  for (const document of ["README.md", "skills/skill-index/SKILL.md"]) {
    assert.match(readFileSync(path.join(hubRoot, document), "utf8"), /`rederive\/?`|`\/skill:rederive`/);
  }
});
