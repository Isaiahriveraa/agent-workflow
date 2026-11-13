#!/usr/bin/env node
// Plan map: check a plan's map data against the readability rules, and render it
// into the single-file page the Artifact tool publishes.
//
// Usage:
//   node plan-map.mjs check <plan.map.json>
//   node plan-map.mjs render <plan.map.json> <out.html>
//
// Exit codes: 0 ok, 1 the data breaks a rule (each problem printed), 2 usage or I/O error.

import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const SKILL_DIR = path.join(os.homedir(), ".agents", "skills", "plan-map", "references");
const CORE = path.join(SKILL_DIR, "plan-map-core.cjs");
const TEMPLATE = path.join(SKILL_DIR, "page-template.html");
const { checkPlan } = createRequire(import.meta.url)(CORE);

/**
 * @behavior Builds the page: the template with the core logic and the plan
 *   data inlined, and the page title set from the plan.
 * @exceptions Throws when the template lacks one of its placeholders.
 */
export function renderPage(plan, { template = fs.readFileSync(TEMPLATE, "utf8"), core = fs.readFileSync(CORE, "utf8") } = {}) {
	for (const marker of ["__PLAN_TITLE__", "/*__PLAN_DATA__*/", "/*__PLAN_CORE__*/"]) {
		if (!template.includes(marker)) throw new Error(`template is missing ${marker}`);
	}
	// Inline text must not close the surrounding <script> early.
	const safe = (text) => text.replace(/<\/(script)/gi, "<\\/$1");
	const title = `${plan.title} Map`.replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;"));
	const data = { ...plan, revision: planRevision(plan) };
	return template
		.replace("__PLAN_TITLE__", () => title)
		.replace("/*__PLAN_DATA__*/", () => safe(JSON.stringify(data, null, 1)))
		.replace("/*__PLAN_CORE__*/", () => safe(core));
}

/**
 * @behavior A short fingerprint of what the plan says. An approval is recorded
 *   against it, so changing the plan asks for approval again. The `approved`
 *   flag and the fingerprint itself are left out.
 */
export function planRevision(plan) {
	const { approved, revision, decisions, ...content } = plan;
	// A recorded choice is one the approval already named, so recording it doesn't reopen approval.
	const kept = decisions === undefined ? content : { ...content, decisions: decisions.map(({ decided, ...decision }) => decision) };
	const stable = JSON.stringify(kept, (_key, value) =>
		value && typeof value === "object" && !Array.isArray(value)
			? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
			: value);
	return crypto.createHash("sha256").update(stable).digest("hex").slice(0, 12);
}

function readPlan(file) {
	try {
		return JSON.parse(fs.readFileSync(file, "utf8"));
	} catch (error) {
		console.error(`plan-map: can't read ${file}: ${error.message}`);
		process.exit(2);
	}
}

function main([command, input, output]) {
	if (!["check", "render"].includes(command) || !input || (command === "render" && !output)) {
		console.error("usage: plan-map.mjs check <plan.map.json> | render <plan.map.json> <out.html>");
		return 2;
	}
	const plan = readPlan(input);
	const problems = checkPlan(plan);
	if (problems.length) {
		for (const problem of problems) console.log(`${input}: ${problem}`);
		console.log(`plan-map: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
		return 1;
	}
	if (command === "check") {
		console.log("plan-map: ok");
		return 0;
	}
	fs.writeFileSync(output, renderPage(plan));
	console.log(`plan-map: wrote ${output}`);
	return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = main(process.argv.slice(2));
