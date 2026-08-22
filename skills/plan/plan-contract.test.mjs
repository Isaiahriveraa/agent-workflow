// Behavioral contract test for the `plan` skill. Dependency-free: Node
// built-ins only (`node:test`, `node:assert`), run with `node --test`.
// Asserts the public contract — headings, required concepts, canonical
// output conventions — not line layout or internal wording.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = join(SKILL_DIR, "SKILL.md");
const HUB_ROOT = join(SKILL_DIR, "..", "..");
const LOCK_PATH = join(HUB_ROOT, ".skill-lock.json");

let _content;
const load = () => {
  if (_content === undefined) _content = readFileSync(SKILL_PATH, "utf8");
  return _content;
};

const frontmatter = () => {
  const m = load().match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : "";
};

const field = (name) => {
  const m = frontmatter().match(new RegExp(`^${name}:\\s*(.+)$`, "m"));
  return m ? m[1].trim() : "";
};

const mentions = (re) => re.test(load());

describe("plan skill contract", () => {
  it("exposes skills/plan/SKILL.md", () => {
    assert.doesNotThrow(load, `expected ${SKILL_PATH} to exist`);
  });

  it("frontmatter declares lower-case kebab name `plan` with a description", () => {
    assert.equal(field("name"), "plan");
    assert.ok(field("description").length > 20, "description must be non-trivial");
  });

  it("clarifies intent before planning", () => {
    assert.ok(mentions(/clarif/i), "must require clarifying intent");
    assert.ok(mentions(/\bask\b|\bquestion/i), "must instruct asking the human");
  });

  it("requires repository research grounded in file:line evidence", () => {
    assert.ok(mentions(/research/i), "must require repository research");
    assert.ok(mentions(/file:line/), "must cite file:line evidence");
  });

  it("distinguishes current behavior from desired behavior", () => {
    assert.ok(mentions(/current/i));
    assert.ok(mentions(/desired|target/i));
  });

  it("records reuse, conventions, and architecture constraints", () => {
    assert.ok(mentions(/reuse/i));
    assert.ok(mentions(/convention/i));
    assert.ok(mentions(/architectur/i));
    assert.ok(mentions(/constraint/i));
  });

  it("decomposes by independent concerns: understand, implement, test, review, deliver", () => {
    for (const stem of [/understand/i, /implement/i, /test/i, /review/i, /deliver/i]) {
      assert.ok(mentions(stem), `missing concern stem ${stem}`);
    }
  });

  it("declares explicit dependencies with start-now / concurrent / blocked reasons", () => {
    assert.ok(mentions(/dependenc/i));
    assert.ok(mentions(/start.?now/i));
    assert.ok(mentions(/concurrent/i));
    assert.ok(mentions(/blocked/i));
    assert.ok(mentions(/reason/i));
  });

  it("orders work as vertical slices", () => {
    assert.ok(mentions(/vertical slice/i));
  });

  it("stacks steps only when dependency and review criteria hold", () => {
    assert.ok(mentions(/stack/i));
    assert.ok(mentions(/dependenc/i));
    assert.ok(mentions(/review/i));
  });

  it("requires tests, edge cases, and observable acceptance criteria", () => {
    assert.ok(mentions(/test/i));
    assert.ok(mentions(/edge case/i));
    assert.ok(mentions(/acceptance/i));
    assert.ok(mentions(/observable/i));
  });

  it("assesses architecture impact with the full deep-module vocabulary", () => {
    for (const term of [
      /module/i, /interface/i, /implementation/i, /depth/i,
      /seam/i, /adapter/i, /leverage/i, /locality/i,
    ]) {
      assert.ok(mentions(term), `missing architecture term ${term}`);
    }
  });

  it("requires explicit non-goals", () => {
    assert.ok(mentions(/non.?goal|out of scope/i));
  });

  it("defines local output at .omo/plans/<slug>/ honoring an existing repo convention", () => {
    assert.ok(mentions(/\.omo\/plans\//), "must define .omo/plans/ default output");
    assert.ok(mentions(/convention/i), "must honor an existing repo convention first");
  });

  it("requires 00-index.md for multi-step plans", () => {
    assert.ok(mentions(/00-index\.md/));
  });

  it("allows simple single-concern work as one file, avoiding nesting", () => {
    assert.ok(mentions(/single.concern/i));
    assert.ok(mentions(/one file/i));
    assert.ok(mentions(/nest/i), "must warn against unnecessary nesting");
  });

  it("defines exact index fields for 00-index.md", () => {
    assert.ok(mentions(/concern map/i));
    assert.ok(mentions(/dependency graph/i));
    assert.ok(mentions(/step index/i));
  });

  it("defines implementation-ready plan fields per step", () => {
    assert.ok(mentions(/repository evidence/i));
    assert.ok(mentions(/acceptance criteria/i));
    assert.ok(mentions(/verification/i));
  });

  it("states relationships to sibling skills", () => {
    assert.ok(mentions(/to-tickets/) && mentions(/approve/), "to-tickets consumes an approved plan");
    assert.ok(mentions(/issue-delivery/) && mentions(/deliver/), "issue-delivery delivers a ready issue");
    assert.ok(mentions(/to-spec/) && mentions(/github/i), "to-spec is a GitHub spec workflow");
    assert.ok(mentions(/research/) && mentions(/external/i), "research is external-source research");
    assert.ok(mentions(/plan-server/) && mentions(/publish/i), "plan-server is explicit publishing");
    assert.ok(mentions(/codebase-design/) && mentions(/unchanged/i), "codebase-design is unchanged");
  });

	it("publishes the completed local plan through the plan-server script", () => {
		assert.ok(mentions(/plan-server\/scripts\/plan-server\.mjs/));
		assert.ok(mentions(/input-file/));
		assert.ok(mentions(/url|file/i));
	});

	it("keeps concern splitting inside plan instead of exposing split-plan", () => {
		assert.equal(existsSync(join(HUB_ROOT, "skills", "split-plan")), false);
		const lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
		assert.equal(lock.skills["split-plan"], undefined);
	});

  it("includes a stop-and-ask rule for materially unresolved decisions", () => {
    assert.ok(mentions(/stop and ask/i));
    assert.ok(mentions(/behavior|architectur|security/i));
  });
});
