import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const writer = path.join(rootDir, "new-artifact.py");
const tempRoots = [];

afterEach(() => {
	for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function makeRepo() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "agents-artifact-"));
	tempRoots.push(root);
	execFileSync("git", ["init", "-q"], { cwd: root });
	return root;
}

describe("new-artifact.py", () => {
	it("writes plans into the current worktree context directory", () => {
		const root = makeRepo();
		const output = execFileSync("python3", [writer, "--type", "plans", "local plan"], {
			cwd: root,
			encoding: "utf8",
		});

		const match = output.match(/Created: (.+)$/m);
		assert.ok(match, `writer output did not include a created path: ${output}`);
		assert.match(match[1], /\/context\/plans\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_local-plan\.md$/);
		assert.equal(fs.existsSync(match[1]), true);
	});

	it("generates terminal-first grill artifacts without callouts or wiki-links", () => {
		const root = makeRepo();
		const output = execFileSync("python3", [writer, "--type", "grill", "grill session"], {
			cwd: root,
			encoding: "utf8",
		});

		const match = output.match(/Created: (.+)$/m);
		assert.ok(match, `writer output did not include a created path: ${output}`);
		const content = fs.readFileSync(match[1], "utf8");
		assert.equal(content.includes("[!"), false, "grill artifact should not contain callout syntax");
		assert.equal(content.includes("[["), false, "grill artifact should not contain wiki-links");
		assert.ok(content.includes("## Summary"));
		assert.ok(content.includes("### Open Questions"));
	});

	it("writes and appends to context/glossary/glossary.md", () => {
		const root = makeRepo();
		const out1 = execFileSync("python3", [writer, "--type", "glossary", "Order"], {
			cwd: root,
			encoding: "utf8",
		});
		assert.ok(out1.includes("Created:"));
		const glossaryPath = path.join(root, "context", "glossary", "glossary.md");
		assert.equal(fs.existsSync(glossaryPath), true);
		const content1 = fs.readFileSync(glossaryPath, "utf8");
		assert.ok(content1.includes("# Glossary"));
		assert.ok(content1.includes("**Order**:"));

		const out2 = execFileSync("python3", [writer, "--type", "glossary", "Invoice"], {
			cwd: root,
			encoding: "utf8",
		});
		assert.ok(out2.includes("Appended to:"));
		const content2 = fs.readFileSync(glossaryPath, "utf8");
		assert.ok(content2.includes("**Order**:"));
		assert.ok(content2.includes("**Invoice**:"));
	});

	it("generates structured templates for discover, frd, and tickets", () => {
		const root = makeRepo();
		for (const type of ["discover", "frd", "tickets"]) {
			const output = execFileSync("python3", [writer, "--type", type, `sample ${type}`], {
				cwd: root,
				encoding: "utf8",
			});
			const match = output.match(/Created: (.+)$/m);
			assert.ok(match, `writer did not create file for ${type}`);
			const content = fs.readFileSync(match[1], "utf8");
			assert.ok(content.includes(`type: ${type}`));
		}
	});

	it("accepts --topic flag as well as positional topic", () => {
		const root = makeRepo();
		const output = execFileSync("python3", [writer, "--type", "research", "--topic", "caching layer"], {
			cwd: root,
			encoding: "utf8",
		});
		const match = output.match(/Created: (.+)$/m);
		assert.ok(match, `writer did not create file with --topic`);
		assert.match(match[1], /caching-layer\.md$/);
	});

	it("generates timestamped ADR files under context/adr/", () => {
		const root = makeRepo();
		const output = execFileSync("python3", [writer, "--type", "adr", "--topic", "use postgres"], {
			cwd: root,
			encoding: "utf8",
		});
		const match = output.match(/Created: (.+)$/m);
		assert.ok(match, `writer did not create ADR file`);
		assert.match(match[1], /\/context\/adr\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_use-postgres\.md$/);
		const content = fs.readFileSync(match[1], "utf8");
		assert.ok(content.includes("type: adr"));
		assert.ok(content.includes("status: proposed"));
		assert.ok(content.includes("# use postgres"));
	});
});
