#!/usr/bin/env node
// Claude Code hook for plan mode and plan maps (see the plan-map skill).
//
// PreToolUse on ExitPlanMode: blocks leaving plan mode until the plan carries a
// "**Plan map:** ..." line. Plan mode can't publish anything, so inside it the
// line says "pending"; a claude.ai link or "skipped" (the user's escape hatch)
// also passes.
// PostToolUse on ExitPlanMode: reminds Claude that approval happens on the map,
// so the next move is publishing it and waiting, not building.
//
// Any input or plan file this hook cannot read is allowed through, so a hook bug
// never freezes the session.

const fs = require('fs');
const os = require('os');
const path = require('path');

const MAP_LINE = /^\s*(?:[-*]\s+)?\*\*Plan map:\*\*\s*(?:https:\/\/claude\.ai\/\S+|skipped\b|pending\b)/im;
const PLANS_DIR = path.join(os.homedir(), '.claude', 'plans');

function newestPlanFile(dir) {
	const files = fs.readdirSync(dir)
		.filter((name) => name.endsWith('.md'))
		.map((name) => path.join(dir, name))
		.map((file) => ({ file, mtime: fs.statSync(file).mtimeMs }))
		.sort((a, b) => b.mtime - a.mtime);
	return files[0]?.file ?? null;
}

function readPlan(event, plansDir) {
	const input = event.tool_input ?? {};
	if (typeof input.plan === 'string' && input.plan.trim()) return input.plan;
	const file = typeof input.planFilePath === 'string' ? input.planFilePath : newestPlanFile(plansDir);
	return file ? fs.readFileSync(file, 'utf8') : null;
}

function beforeExit(event, plansDir) {
	let plan;
	try {
		plan = readPlan(event, plansDir);
	} catch {
		return null;
	}
	if (plan === null || MAP_LINE.test(plan)) return null;

	return {
		hookSpecificOutput: {
			hookEventName: 'PreToolUse',
			permissionDecision: 'deny',
			permissionDecisionReason:
				'This plan has no Plan map line. Plan mode cannot publish the map, so add "**Plan map:** pending" under the plan title, then exit plan mode again. ' +
				'Right after exiting, run the plan-map skill: publish the map and wait for the user to approve on it. ' +
				'Only if the user said they want no map, write "**Plan map:** skipped (user)" instead.',
		},
	};
}

function afterExit() {
	return {
		hookSpecificOutput: {
			hookEventName: 'PostToolUse',
			additionalContext:
				'Plan approval happens on the plan map, not here. Before building anything: run the plan-map skill, publish the map, ' +
				'replace "**Plan map:** pending" with its link, give the user the link, and wait for their Approve message from the map.',
		},
	};
}

/**
 * @behavior Picks this hook's answer for one Claude Code hook event.
 * @returns the hook's JSON output, or null to stay silent (allow).
 */
function decide(event, plansDir = PLANS_DIR) {
	if (event?.tool_name !== 'ExitPlanMode') return null;
	if (event.hook_event_name === 'PostToolUse') return afterExit();
	return beforeExit(event, plansDir);
}

function main() {
	let input = '';
	try {
		input = fs.readFileSync(0, 'utf8');
		const decision = decide(JSON.parse(input));
		if (decision) process.stdout.write(JSON.stringify(decision));
	} catch {
		// Unreadable input is allowed through; see the header comment.
	}
}

if (require.main === module) main();

module.exports = { decide };
