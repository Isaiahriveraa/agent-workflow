import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "slop-lint.py");
const roots = [];

function makeRepo() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "slop-lint-"));
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

test("flags slop words with file, line, and a plain rewrite", () => {
	const root = makeRepo();
	write(root, "note.md", "# Note\nWe should leverage the new API.\nIt is a robust and seamless setup.\n");
	const result = run(root, "note.md");
	assert.equal(result.status, 1);
	assert.match(result.stdout, /note\.md:2: "leverage" -> use/);
	assert.match(result.stdout, /note\.md:3: "robust" -> /);
	assert.match(result.stdout, /note\.md:3: "seamless" -> /);
	assert.match(result.stdout, /3 hits/);
});

test("matches case-insensitively and inflected forms", () => {
	const root = makeRepo();
	write(root, "note.md", "Leveraging this, we Delved deeper.\n");
	const result = run(root, "note.md");
	assert.equal(result.status, 1);
	assert.match(result.stdout, /"Leveraging" -> use/);
	assert.match(result.stdout, /"Delved" -> /);
});

test("flags overblown abstraction words like atomic and constitutional", () => {
	const root = makeRepo();
	write(root, "note.md", "The constitutional rewrite made the save atomic.\n");
	const result = run(root, "note.md");
	assert.equal(result.status, 1);
	assert.match(result.stdout, /"constitutional" -> /);
	assert.match(result.stdout, /"atomic" -> /);
});

test("flags formulaic phrases", () => {
	const root = makeRepo();
	write(root, "note.md", "It's not just a cache, it's a system that plays a crucial role in today's fast-paced world.\n");
	const result = run(root, "note.md");
	assert.equal(result.status, 1);
	assert.match(result.stdout, /"It's not just" -> /);
	assert.match(result.stdout, /"plays a crucial role" -> /);
	assert.match(result.stdout, /"in today's fast-paced world" -> /);
});

test("skips fenced code blocks", () => {
	const root = makeRepo();
	write(root, "note.md", "```\nleverage\n```\nThe draft is saved after a short pause.\n");
	const result = run(root, "note.md");
	assert.equal(result.status, 0);
	assert.match(result.stdout, /clean/);
});

test("honors disable markers", () => {
	const root = makeRepo();
	write(root, "one.md", "Leverage this by hand. <!-- slop-lint:disable-line -->\n");
	write(root, "two.md", "<!-- slop-lint:disable-file -->\nThis would leverage everything.\n");
	const result = run(root, "one.md", "two.md");
	assert.equal(result.status, 0);
	assert.match(result.stdout, /clean/);
});

test("scans directories for markdown files only", () => {
	const root = makeRepo();
	write(root, "docs/a.md", "We leverage the cache.\n");
	write(root, "docs/b.txt", "leverage\n");
	write(root, "docs/sub/c.md", "A seamless flow.\n");
	const result = run(root, "docs");
	assert.equal(result.status, 1);
	assert.match(result.stdout, /docs\/a\.md:1/);
	assert.match(result.stdout, /docs\/sub\/c\.md:1/);
	assert.doesNotMatch(result.stdout, /b\.txt/);
});

test("exits 2 on a missing path", () => {
	const root = makeRepo();
	const result = run(root, "missing.md");
	assert.equal(result.status, 2);
	assert.match(result.stderr, /missing\.md/);
});

test("reports clean prose with exit 0", () => {
	const root = makeRepo();
	write(root, "note.md", "The server stores the draft.\nWhen the tab opens again, the draft is still there.\n");
	const result = run(root, "note.md");
	assert.equal(result.status, 0);
	assert.match(result.stdout, /clean/);
});
