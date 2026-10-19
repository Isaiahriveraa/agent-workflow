import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYNC = path.join(ROOT, "sync.sh");
const MANIFEST = path.join(ROOT, "manifest.json");

function makeFixture(t) {
	const root = mkdtempSync(path.join(os.tmpdir(), "cursor-cli-sync-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const home = path.join(root, "home");
	const hub = path.join(root, "hub");
	mkdirSync(home);
	const rulePath = path.join(hub, "adapters", "cursor-cli", "rules", "hub-contract.mdc");
	mkdirSync(path.dirname(rulePath), { recursive: true });
	mkdirSync(path.join(hub, "skills", "sample"), { recursive: true });
	writeFileSync(rulePath, readFileSync(path.join(ROOT, "adapters", "cursor-cli", "rules", "hub-contract.mdc")));
	writeFileSync(path.join(hub, "skills", "sample", "SKILL.md"), "# Sample\n");
	return { root, home, hub };
}

function runSync(fixture, command, manifest = MANIFEST) {
	return spawnSync("bash", [SYNC, command], {
		cwd: ROOT,
		encoding: "utf8",
		env: { ...process.env, HOME: fixture.home, HUB: fixture.hub, MANIFEST: manifest },
	});
}

test("migrate installs the global Cursor contract rule declared by the manifest", (t) => {
	const fixture = makeFixture(t);
	const hubRule = "~/.agents/adapters/cursor-cli/rules/hub-contract.mdc";
	const bridge = JSON.parse(readFileSync(MANIFEST, "utf8")).symlinks.find(
		(entry) => entry.source === "~/.cursor/rules/hub-contract.mdc",
	);
	assert.ok(bridge, "manifest declares the Cursor global contract rule");
	assert.equal(bridge.target, hubRule);

	const manifest = path.join(fixture.root, "manifest.json");
	writeFileSync(manifest, JSON.stringify({
		symlinks: [bridge],
		generated: [{
			tool: "cursor-cli",
			surface: "skills",
			source: "~/.agents/skills",
			target: "~/.cursor/skills",
			generator: "sync.sh gen-cursor-skills",
			type: "adapter-output",
		}],
	}));

	const result = runSync(fixture, "migrate", manifest);
	assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
	const rulePath = path.join(fixture.home, ".cursor", "rules", "hub-contract.mdc");
	assert.equal(readlinkSync(rulePath), path.join(fixture.hub, "adapters", "cursor-cli", "rules", "hub-contract.mdc"));
	assert.match(readFileSync(rulePath, "utf8"), /alwaysApply: true/);
	assert.match(readFileSync(rulePath, "utf8"), /~\/\.agents\/AGENTS\.md/);
});

test("the documented Cursor skill generator command creates skill links", (t) => {
	const fixture = makeFixture(t);
	const result = runSync(fixture, "gen-cursor-skills");
	assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
	assert.equal(
		readlinkSync(path.join(fixture.home, ".cursor", "skills", "sample")),
		path.join(fixture.hub, "skills", "sample"),
	);
});
