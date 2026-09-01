import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import { ensureProjectContext, getProjectContext } from "./project-context.mjs";

const tempRoots = [];

afterEach(() => {
	for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function makeRepo() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "agents-context-"));
	tempRoots.push(root);
	execFileSync("git", ["init", "-q"], { cwd: root });
	return root;
}

describe("project context", () => {
	it("resolves documentation paths inside the current worktree", () => {
		const root = makeRepo();
		const context = getProjectContext({ cwd: root });

		assert.equal(context.projectRoot, root);
		assert.equal(context.contextDir, path.join(root, "context"));
		assert.equal(context.contextPaths.plans, path.join(root, "context", "plans"));
		assert.equal(context.contextPaths.handoffs, path.join(root, "context", "handoffs"));
		assert.equal(context.contextPaths.adr, path.join(root, "context", "adr"));
	});

	it("creates the context root when explicitly ensured", () => {
		const root = makeRepo();
		const context = ensureProjectContext({ cwd: root });

		assert.equal(fs.existsSync(context.contextDir), true);
	});

	it("leaves context directory absent when running reset-omx-state --dry-run", () => {
		const root = makeRepo();
		const scriptPath = path.resolve("scripts/reset-omx-state.mjs");
		execFileSync("node", [scriptPath, "--dry-run"], { cwd: root });
		assert.equal(fs.existsSync(path.join(root, "context")), false);
	});

	it("cleans context/plans when running reset-omx-state --full", () => {
		const root = makeRepo();
		const scriptPath = path.resolve("scripts/reset-omx-state.mjs");
		const plansDir = path.join(root, "context", "plans");
		fs.mkdirSync(plansDir, { recursive: true });
		fs.writeFileSync(path.join(plansDir, "plan.md"), "plan content");
		assert.equal(fs.existsSync(path.join(plansDir, "plan.md")), true);

		execFileSync("node", [scriptPath, "--full"], { cwd: root });
		assert.equal(fs.existsSync(path.join(plansDir, "plan.md")), false);
	});
});
