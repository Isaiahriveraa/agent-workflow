import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hubRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("brag is available through the hub skill router and OpenCode registry", () => {
  const skill = readFileSync(path.join(hubRoot, "skills/brag/SKILL.md"), "utf8");
  const readme = readFileSync(path.join(hubRoot, "README.md"), "utf8");
  const index = readFileSync(path.join(hubRoot, "skills/skill-index/SKILL.md"), "utf8");
  const registry = JSON.parse(readFileSync(path.join(hubRoot, ".skill-lock.json"), "utf8"));

  assert.match(skill, /^---\nname: brag\n/m);
  assert.match(readme, /`\/skill:brag`/);
  assert.match(index, /`\/skill:brag`/);
  assert.equal(registry.skills.brag.skillPath, "skills/brag/SKILL.md");
});

test("brag only uses music with clear rights and handles music as optional", () => {
  const slim = readFileSync(path.join(hubRoot, "skills/brag/slim.md"), "utf8");
  const inspect = readFileSync(path.join(hubRoot, "skills/brag/references/step-1-inspect.md"), "utf8");
  const audio = readFileSync(path.join(hubRoot, "skills/brag/references/audio.md"), "utf8");
  const compose = readFileSync(path.join(hubRoot, "skills/brag/references/step-3-compose.md"), "utf8");
  const tones = readFileSync(path.join(hubRoot, "skills/brag/references/tones.md"), "utf8");

  assert.ok(/Use music only when a project or user-supplied track has clear usage rights/i.test(slim), "slim should require clear music rights");
  assert.ok(/Approved low music bed/.test(inspect), "audio examples should qualify music as approved");
  assert.ok(/If approved music is present, put it on a low track/i.test(audio), "audio track allocation should allow no music");
  assert.ok(/If approved music is present, lower it to 0\.12–0\.15/i.test(compose), "voiceover should only duck approved music when present");
  assert.ok(/Music swell if an approved track is available/i.test(tones), "tone examples should not imply music is always included");
});
