import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { renderPage } from "./plan-map.mjs";

const core = createRequire(import.meta.url)("../skills/plan-map/references/plan-map-core.cjs");
const plan = { title: "Example plan", source: "context/plans/example/00-index.md", decisions: [] };

test("map approval accepts the plan without requesting implementation", () => {
	const message = core.approvalMessage(plan, {});
	assert.match(message, /^APPROVED · Example plan\nPlan file: context\/plans\/example\/00-index.md\n/);
	assert.match(message, /Set the plan status to approved/);
	assert.match(message, /Wait for an explicit implementation request before building/);
	assert.doesNotMatch(message, /and start building/);
});

test("approval page does not claim implementation has started", () => {
	const html = renderPage(plan);
	assert.match(html, /Approving accepts the plan; it does not start implementation/);
	assert.match(html, /Plan approved\. Ask Claude to implement it when ready/);
	assert.doesNotMatch(html, /Approving tells Claude to start building|Claude is building this plan/);
});

test("plan-map instructions separate approval from implementation and allow a combined request", () => {
	const skill = fs.readFileSync(new URL("../skills/plan-map/SKILL.md", import.meta.url), "utf8");
	assert.match(skill, /Plan approval alone does not authorize implementation/);
	assert.match(skill, /approved, implement it/);
	assert.doesNotMatch(skill, /Only that message authorizes building|Approved — starting step 1|only then start\s+building/);
});
