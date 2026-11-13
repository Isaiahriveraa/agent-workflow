import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "hooks", "require-plan-map.cjs");
const { decide } = createRequire(import.meta.url)(HOOK);
const roots = [];

after(() => {
	for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function plansDir(files) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "plan-map-"));
	roots.push(root);
	let time = Date.now() / 1000 - files.length;
	for (const [name, content] of files) {
		const file = path.join(root, name);
		fs.writeFileSync(file, content);
		fs.utimesSync(file, time, time);
		time += 1;
	}
	return root;
}

function exitPlan(toolInput = {}) {
	return { hook_event_name: "PreToolUse", tool_name: "ExitPlanMode", tool_input: toolInput };
}

function assertDenied(output) {
	assert.ok(output, "expected ExitPlanMode to be denied");
	assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
	assert.match(output.hookSpecificOutput.permissionDecisionReason, /plan-map skill/);
}

test("denies a plan without a map line", () => {
	assertDenied(decide(exitPlan({ plan: "# Plan\n\nAdd login.\n" })));
});

test("allows a plan with a claude.ai map link", () => {
	assert.equal(decide(exitPlan({ plan: "# Plan\n\n**Plan map:** https://claude.ai/code/artifact/abc-123\n" })), null);
	assert.equal(decide(exitPlan({ plan: "# Plan\n\n- **Plan map:** https://claude.ai/artifact/xyz\n" })), null);
});

test("allows a pending map line, since plan mode can't publish", () => {
	assert.equal(decide(exitPlan({ plan: "# Plan\n\n**Plan map:** pending\n" })), null);
});

test("after exiting plan mode, reminds Claude to publish the map and wait for approval", () => {
	const output = decide({ hook_event_name: "PostToolUse", tool_name: "ExitPlanMode", tool_input: {} });
	assert.equal(output.hookSpecificOutput.hookEventName, "PostToolUse");
	assert.match(output.hookSpecificOutput.additionalContext, /wait for their Approve/);
});

test("allows a plan the user chose to skip", () => {
	assert.equal(decide(exitPlan({ plan: "**Plan map:** skipped (user)\n" })), null);
});

test("does not accept a map line without a link", () => {
	assertDenied(decide(exitPlan({ plan: "**Plan map:** TODO\n" })));
	assertDenied(decide(exitPlan({ plan: "**Plan map:** https://example.com/map\n" })));
});

test("reads the newest plan file when the tool input has no plan text", () => {
	const withMap = plansDir([["old.md", "# Old\n"], ["new.md", "**Plan map:** https://claude.ai/code/artifact/1\n"]]);
	assert.equal(decide(exitPlan(), withMap), null);
	const withoutMap = plansDir([["old.md", "**Plan map:** https://claude.ai/code/artifact/1\n"], ["new.md", "# New\n"]]);
	assertDenied(decide(exitPlan(), withoutMap));
});

test("reads planFilePath when given", () => {
	const dir = plansDir([["mine.md", "**Plan map:** skipped (user)\n"]]);
	assert.equal(decide(exitPlan({ planFilePath: path.join(dir, "mine.md") }), "/nonexistent"), null);
});

test("ignores other tools and allows unreadable input", () => {
	assert.equal(decide({ tool_name: "Bash", tool_input: { command: "ls" } }), null);
	assert.equal(decide(exitPlan(), "/nonexistent/plans"), null);
	const result = spawnSync("node", [HOOK], { input: "not json", encoding: "utf8" });
	assert.equal(result.status, 0);
	assert.equal(result.stdout, "");
});

test("prints a deny decision when run as a hook", () => {
	const input = JSON.stringify(exitPlan({ plan: "# Plan\n" }));
	const result = spawnSync("node", [HOOK], { input, encoding: "utf8" });
	assert.equal(result.status, 0, result.stderr);
	assertDenied(JSON.parse(result.stdout));
});
