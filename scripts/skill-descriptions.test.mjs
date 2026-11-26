import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hubRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(hubRoot, "skills");

const motionChildren = [
  "animate-expo",
  "animation-performance",
  "animation-vocabulary",
  "choreograph",
  "find-animation-opportunities",
  "gestures",
  "improve-animations",
  "remove-animations",
  "review-animations",
];

const designChildren = ["apple-design", "emil-design-eng"];

function skillFiles() {
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsRoot, entry.name, "SKILL.md"))
    .filter((file) => {
      try {
        readFileSync(file);
        return true;
      } catch {
        return false;
      }
    });
}

function frontmatter(file) {
  const skill = readFileSync(file, "utf8");
  const match = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, `${path.basename(path.dirname(file))} is missing frontmatter`);
  return { skill, frontmatter: match[1] };
}

test("every skill description is one short trigger line", () => {
  for (const file of skillFiles()) {
    const name = path.basename(path.dirname(file));
    const { frontmatter: matter } = frontmatter(file);
    const description = matter.match(/^description: "([^"\n]*)"$/m);
    assert.ok(description, `${name} description must be one double-quoted line`);
    const text = description[1];
    assert.ok(text.startsWith("Use when "), `${name} must start with the trigger`);
    assert.ok(text.length <= 180, `${name} description is ${text.length} characters`);
  }
});

test("motion and design specialists stay behind their parent skill", () => {
  for (const name of [...motionChildren, ...designChildren]) {
    const { frontmatter: matter } = frontmatter(path.join(skillsRoot, name, "SKILL.md"));
    assert.match(matter, /^disable-model-invocation: true$/m, name);
  }

  const animate = readFileSync(path.join(skillsRoot, "animate/SKILL.md"), "utf8");
  assert.match(animate, /^## Route first$/m);
  for (const name of motionChildren) {
    assert.ok(animate.includes(`../${name}/SKILL.md`), name);
  }

  const uiDesign = readFileSync(path.join(skillsRoot, "ui-design/SKILL.md"), "utf8");
  assert.match(uiDesign, /^## Open a narrower skill first$/m);
  assert.ok(uiDesign.includes("../emil-design-eng/SKILL.md"));
  assert.ok(uiDesign.includes("../apple-design/SKILL.md"));
  assert.ok(uiDesign.includes("../animate/SKILL.md"));
});

test("the two routers advertise different jobs", () => {
  const index = frontmatter(path.join(skillsRoot, "skill-index/SKILL.md")).frontmatter;
  const emil = frontmatter(path.join(skillsRoot, "ask-emil/SKILL.md")).frontmatter;
  const indexDescription = index.match(/^description: "([^"\n]*)"$/m)[1];
  const emilDescription = emil.match(/^description: "([^"\n]*)"$/m)[1];
  assert.notEqual(indexDescription, emilDescription);
  assert.match(emilDescription, /Emil/);
  assert.match(indexDescription, /hub/);
});
