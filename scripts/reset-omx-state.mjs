#!/usr/bin/env node

/**
 * Reset .omx/ state to a clean baseline.
 *
 * Cleans transient runtime state (sessions, logs, state JSON, metrics, notepad)
 * while preserving intentional artifacts (plans, specs) by default.
 *
 * Usage:
 *   node scripts/reset-omx-state.mjs              # safe reset (preserves plans/specs)
 *   node scripts/reset-omx-state.mjs --full        # aggressive: clean everything
 *   node scripts/reset-omx-state.mjs --dry-run     # preview only
 *   node scripts/reset-omx-state.mjs --keep-logs   # preserve log files
 */

import fs from "node:fs";
import path from "node:path";
import { ensureProjectContext, getProjectContext } from "./project-context.mjs";

const args = process.argv.slice(2);
const FLAGS = {
	dryRun: args.includes("--dry-run"),
	full: args.includes("--full"),
	keepLogs: args.includes("--keep-logs"),
	keepPlans: args.includes("--keep-plans"),
	keepSpecs: args.includes("--keep-specs"),
};

const project = FLAGS.dryRun ? getProjectContext() : ensureProjectContext();
const omxDir = project.projectDir;

const log = (message) => console.log(`[reset-omx] ${message}`);
const dryLog = (message) => {
	if (FLAGS.dryRun) console.log(`[dry-run] would ${message}`);
	else console.log(`[reset-omx] ${message}`);
};

const ensureDir = (dirPath) => {
	if (!FLAGS.dryRun) fs.mkdirSync(dirPath, { recursive: true });
};

const rmDir = (dirPath) => {
	if (fs.existsSync(dirPath)) {
		if (FLAGS.dryRun) {
			log(`would remove directory: ${dirPath}`);
		} else {
			fs.rmSync(dirPath, { recursive: true, force: true });
			log(`removed directory: ${dirPath}`);
		}
	}
};

const rmFile = (filePath) => {
	if (fs.existsSync(filePath)) {
		if (FLAGS.dryRun) {
			log(`would remove file: ${filePath}`);
		} else {
			fs.rmSync(filePath);
			log(`removed file: ${filePath}`);
		}
	}
};

const cleanDir = (dirPath, label) => {
	if (!fs.existsSync(dirPath)) return;
	const entries = fs.readdirSync(dirPath);
	if (entries.length === 0) return;
	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry);
		if (FLAGS.dryRun) {
			log(`would remove ${label}: ${fullPath}`);
		} else {
			fs.rmSync(fullPath, { recursive: true, force: true });
		}
	}
	if (!FLAGS.dryRun)
		log(`cleaned ${entries.length} ${label}(s) from ${dirPath}`);
	else log(`would clean ${entries.length} ${label}(s) from ${dirPath}`);
};

const writeIfChanged = (filePath, content) => {
	const current = fs.existsSync(filePath)
		? fs.readFileSync(filePath, "utf8")
		: "";
	if (current === content) {
		log(`no change needed: ${path.relative(omxDir, filePath)}`);
		return;
	}
	if (FLAGS.dryRun) {
		log(`would write: ${path.relative(omxDir, filePath)}`);
	} else {
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, content);
		log(`wrote: ${path.relative(omxDir, filePath)}`);
	}
};

// ─── Context file templates ────────────────────────────────────────────────

const stateMd = `# Workflow State

Use this file as the canonical resumable state for in-flight work in the current project.

## Current Workflow
- Not set.

## Current Phase
- Not set.

## Next Step
- Run node scripts/reset-omx-state.mjs to reset state, or begin work.

## Blockers
- None.

## Last Verified At
- Not set.

## Related Plan
- None.

## Active Artifact Working Set
- Last updated: not set
- Source: not set
- Focus: not set

### Selected By Category
- intake: not set
- plan: not set
- research: not set
- session: not set
- handoff: not set

### Ordered Artifacts
1. not set
`;

const sessionIndexMd = `# Session Index

Use this file to track project-local lightweight work sessions for the current project.

## Active Sessions
- No active sessions recorded.

## Recent Sessions
- No recent sessions recorded.

## Entry Template
- Session ID:
- Date:
- Topic:
- Status:
- Artifact path:
- Related plan:
- Next command:
- Summary:
`;

const researchIndexMd = `# Research Index

Per-project runtime research tracking for the current project.

## Entries
- No research entries recorded yet.

## Entry Template
- Topic:
- Date:
- Source files:
- Artifact path:
- Summary:
`;

const artifactsMd = `# Artifact Retrieval Context

Describes where resumable workflow artifacts live and how they should be prioritized.

Runtime state and context artifacts are split by type: plans, research, lightweight runtime continuity, and handoffs are worktree-local workflow artifacts.

Lightweight continuity artifacts are project-local runtime files. Project-local handoffs are transfer artifacts, not the ordinary pause/resume path.

## Sources
All documentation paths resolve under the current worktree's \`context/\` directory.
- plans: \`context/plans\`
- research: \`context/research\`
- sessions: (removed — use \`.sisyphus/run-continuation/\`)
- handoffs: \`context/handoffs\`
- active working set metadata: (removed — use \`.sisyphus/run-continuation/\`)

## Preferred Retrieval Order
1. active or explicitly requested intake/session artifact from the current project's runtime state
2. related plan from the current project's runtime \`state.md\`
3. latest matching repo-local research artifact
4. latest matching project-local handoff artifact
`;

const notepadMd = `# Working Notepad

Scratch space for active work. Reset between sessions.
`;

const projectMemoryJson = JSON.stringify(
	{
		project: path.basename(project.projectRoot),
		initialized: new Date().toISOString(),
		last_updated: new Date().toISOString(),
		key_patterns: [],
		key_decisions: [],
		known_issues: [],
	},
	null,
	2,
);

const metricsJson = JSON.stringify(
	{
		total_turns: 0,
		session_turns: 0,
		last_activity: new Date().toISOString(),
		session_input_tokens: 0,
		session_output_tokens: 0,
		session_total_tokens: 0,
	},
	null,
	2,
);

// ─── Main ──────────────────────────────────────────────────────────────────

console.log("");
log(`Resetting .omx/ state for: ${project.projectRoot}`);
log(`Mode: ${FLAGS.dryRun ? "DRY RUN (preview only)" : "LIVE"}`);
log(`Preserving: ${FLAGS.full ? "nothing (--full)" : "plans, specs"}`);
if (FLAGS.keepLogs) log("Preserving: logs (--keep-logs)");
if (FLAGS.keepPlans) log("Preserving: plans (--keep-plans)");
if (FLAGS.keepSpecs) log("Preserving: specs (--keep-specs)");
console.log("");

// 1. Clean sessions directory
log("── Cleaning sessions ──");
cleanDir(project.runtimePaths.sessions, "session file");

// 2. Clean logs (unless --keep-logs)
if (!FLAGS.keepLogs) {
	log("── Cleaning logs ──");
	const logsDir = path.join(omxDir, "logs");
	cleanDir(logsDir, "log file");
} else {
	log("── Skipping logs (--keep-logs) ──");
}

// 3. Clean plans (only in --full mode, unless --keep-plans)
if (FLAGS.full && !FLAGS.keepPlans) {
	log("── Cleaning plans (--full) ──");
	cleanDir(project.contextPaths.plans, "plan file");
	cleanDir(path.join(omxDir, "plans"), "plan file");
} else {
	log("── Preserving plans ──");
}

// 4. Clean specs (only in --full mode, unless --keep-specs)
if (FLAGS.full && !FLAGS.keepSpecs) {
	log("── Cleaning specs (--full) ──");
	cleanDir(path.join(project.contextDir, "specs"), "spec file");
} else {
	log("── Preserving specs ──");
}

// 5. State directory removed — .sisyphus/run-continuation/ is the replacement
log("── State directory removed (use .sisyphus/run-continuation/) ──");

// 6. Clean metrics.json (reset to zero)
log("── Resetting metrics ──");
writeIfChanged(path.join(omxDir, "metrics.json"), metricsJson + "\n");

// 7. Clean tmux-hook.json
log("── Cleaning hook state ──");
rmFile(path.join(omxDir, "tmux-hook.json"));

// 8. Context files removed — no-op

// 9. Reset notepad and project memory
log("── Resetting notepad and project memory ──");
writeIfChanged(path.join(omxDir, "notepad.md"), notepadMd);
writeIfChanged(
	path.join(omxDir, "project-memory.json"),
	projectMemoryJson + "\n",
);

// 10. Ensure required directories exist
log("── Ensuring directory structure ──");
ensureDir(project.runtimePaths.sessions);
ensureDir(path.join(omxDir, "logs"));
ensureDir(project.contextPaths.plans);
console.log("");
log("Reset complete.");
if (FLAGS.dryRun)
	log("DRY RUN — no changes were made. Remove --dry-run to apply.");

// Print summary of current state
if (!FLAGS.dryRun) {
	console.log("");
	log("Current .omx/ state:");
	const tree = [];
	function walk(dir, prefix = "") {
		const entries = fs
			.readdirSync(dir, { withFileTypes: true })
			.sort((a, b) => {
				if (a.isDirectory() && !b.isDirectory()) return -1;
				if (!a.isDirectory() && b.isDirectory()) return 1;
				return a.name.localeCompare(b.name);
			});
		for (let i = 0; i < entries.length; i++) {
			const e = entries[i];
			const isLast = i === entries.length - 1;
			const connector = isLast ? "└── " : "├── ";
			const childPrefix = prefix + (isLast ? "    " : "│   ");
			tree.push(`${prefix}${connector}${e.name}${e.isDirectory() ? "/" : ""}`);
			if (e.isDirectory()) walk(path.join(dir, e.name), childPrefix);
		}
	}
	walk(omxDir, "");
	for (const line of tree) console.log(`  ${line}`);
}
