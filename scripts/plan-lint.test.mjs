import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "plan-lint.py");
const roots = [];

function makeRepo() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "plan-lint-"));
	roots.push(root);
	return root;
}

function write(root, name, content) {
	const file = path.join(root, name);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, content);
	return file;
}

function run(root, ...args) {
	return spawnSync("python3", [SCRIPT, ...args], { cwd: root, encoding: "utf8" });
}

after(() => {
	for (const root of roots) {
		fs.rmSync(root, { recursive: true, force: true });
	}
});

test("passes a step file with a new interface, sketch, and rejected alternative", () => {
	const root = makeRepo();
	write(
		root,
		"01-config.md",
		"# Step 01: Config loading\n\n- **Interface impact:** new — adds `loadConfig(path)`.\n\n**Interface sketch**\n\n`loadConfig(path: string): Config`\n\nThe caller reads: returns parsed config; a missing file returns defaults.\n\n**Rejected alternative**\n\nConsidered a `ConfigReader` class with read/validate steps; rejected because callers would have to keep the two calls in order.\n"
	);
	const result = run(root, "01-config.md");
	assert.equal(result.status, 0);
	assert.match(result.stdout, /clean \(1 file scanned\)/);
});

test("flags a changed interface missing both blocks", () => {
	const root = makeRepo();
	write(
		root,
		"02-parser.md",
		"# Step 02: Parser result object\n\n- **Interface impact:** changed — `parse()` returns a result object.\n"
	);
	const result = run(root, "02-parser.md");
	assert.equal(result.status, 1);
	assert.match(result.stdout, /Interface sketch/);
	assert.match(result.stdout, /Rejected alternative/);
	assert.match(result.stdout, /2 findings in 1 file/);
});

test("flags a step file with no interface impact declaration", () => {
	const root = makeRepo();
	write(root, "03-logging.md", "# Step 03: Tidy logging\n\nNo interface change here.\n");
	const result = run(root, "03-logging.md");
	assert.equal(result.status, 1);
	assert.match(result.stdout, /Interface impact/);
	assert.match(result.stdout, /1 finding in 1 file/);
});

test("passes a none declaration without extra blocks", () => {
	const root = makeRepo();
	write(root, "04-rename.md", "# Step 04: Rename helper\n\n- **Interface impact:** none — private rename only.\n");
	const result = run(root, "04-rename.md");
	assert.equal(result.status, 0);
});

test("flags placeholder-only blocks as empty", () => {
	const root = makeRepo();
	write(
		root,
		"05-retry.md",
		"# Step 05: Retry\n\n- **Interface impact:** new — adds `retry(fn)`.\n\n**Interface sketch**\n\n<!-- TODO -->\n\n**Rejected alternative**\n\n- \n"
	);
	const result = run(root, "05-retry.md");
	assert.equal(result.status, 1);
	assert.match(result.stdout, /2 findings in 1 file/);
});

test("skips 00-index.md when a plan directory has step files", () => {
	const root = makeRepo();
	write(root, "context/plans/demo/00-index.md", "# Plan\n\n## Overview\n\nNo declaration in the index.\n");
	write(root, "context/plans/demo/01-first.md", "# Step\n\n- **Interface impact:** none — private.\n");
	const result = run(root, "context/plans/demo");
	assert.equal(result.status, 0);
	assert.match(result.stdout, /clean \(1 file scanned\)/);
	assert.doesNotMatch(result.stdout, /00-index/);
});

test("lints a lone 00-index.md as a step file", () => {
	const root = makeRepo();
	write(root, "context/plans/solo/00-index.md", "# Plan\n\n## Overview\n\nSingle-file plan.\n");
	const result = run(root, "context/plans/solo");
	assert.equal(result.status, 1);
	assert.match(result.stdout, /00-index\.md:1/);
});

test("honors disable markers", () => {
	const root = makeRepo();
	write(root, "one.md", "# Step\n\n- **Interface impact:** changed — moved boundary. <!-- plan-lint:disable-line -->\n");
	write(root, "two.md", "<!-- plan-lint:disable-file -->\n# Step\n\n- **Interface impact:** new — adds `x()`.\n");
	const result = run(root, "one.md", "two.md");
	assert.equal(result.status, 0);
});

test("exits 2 on a missing path", () => {
	const root = makeRepo();
	const result = run(root, "missing.md");
	assert.equal(result.status, 2);
	assert.match(result.stderr, /missing\.md/);
});

test("matches declarations and labels case-insensitively", () => {
	const root = makeRepo();
	write(
		root,
		"10-case.md",
		"# Step 10\n\n- **interface impact:** NEW — adds `start()`.\n\n### interface sketch\n\n`start(): void`\n\n**Alternative considered**\n\nTried `start(callback)`; rejected because no caller needs completion.\n"
	);
	const result = run(root, "10-case.md");
	assert.equal(result.status, 0);
});
