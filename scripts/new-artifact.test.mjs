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

function run(root, ...args) {
	return execFileSync("python3", [writer, ...args], { cwd: root, encoding: "utf8" });
}

function createdPaths(output) {
	return [...output.matchAll(/^Created: (.+)$/gm)].map((match) => match[1]);
}

describe("new-artifact.py", () => {
	it("creates a canonical timestamped ADR path with frontmatter", () => {
		const root = makeRepo();
		const output = run(root, "--type", "adr", "use postgres");
		const [file] = createdPaths(output);
		assert.match(file, /\/context\/adr\/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_use-postgres\.md$/);
		const content = fs.readFileSync(file, "utf8");
		assert.match(content, /^---\ndate: \d{4}-\d{2}-\d{2}\ntitle: use postgres\ntype: adr\nstatus: proposed\n---/);
		assert.ok(content.includes("## Context"));
		assert.ok(content.includes("## Decision"));
		assert.ok(content.includes("## Consequences"));
	});

	it("uses shared profile headings and required metadata", () => {
		const root = makeRepo();
		const expected = {
			handoffs: ["## Active Goal", "## Open Questions or Blockers", "## Resume Here", "## Success Criteria"],
			designs: ["## Desired behavior", "## Decisions and trade-offs", "## Status"],
			research: ["## Question", "## Key Evidence", "## Options & Tradeoffs", "## Remaining Uncertainty"],
			reviews: ["## Rationale Table", "## Remaining Issues", "## Per-module Details"],
		};
		for (const [type, headings] of Object.entries(expected)) {
			const [file] = createdPaths(run(root, "--type", type, `sample ${type}`));
			const content = fs.readFileSync(file, "utf8");
			assert.ok(content.includes(`type: ${type === "handoffs" ? "handoff" : type === "reviews" ? "review" : type.slice(0, -1)}`));
			for (const heading of headings) assert.ok(content.includes(heading), `${type} missing ${heading}`);
			if (type === "handoffs") {
				for (const field of ["date", "author", "commit", "branch", "repository", "topic", "tags", "status", "last_updated", "last_updated_by", "type"]) {
					assert.match(content, new RegExp(`^${field}:`, "m"));
				}
			}
		}
	});

	it("accepts both review type aliases", () => {
		const root = makeRepo();
		for (const type of ["review", "reviews"]) {
			const [file] = createdPaths(run(root, "--type", type, `${type} sample`));
			assert.match(fs.readFileSync(file, "utf8"), /type: review/);
		}
	});

	it("preserves terminal-first grill orientation and transcript scaffolding", () => {
		const root = makeRepo();
		const [file] = createdPaths(run(root, "--type", "grill", "grill session"));
		const content = fs.readFileSync(file, "utf8");
		assert.ok(content.includes("## Opening Orientation"));
		assert.ok(content.includes("## Q&A Transcript"));
		assert.equal(content.includes("[!"), false);
		assert.equal(content.includes("[["), false);
		assert.ok(content.includes("## Summary"));
		assert.ok(content.includes("### Open Questions"));
	});

	it("creates canonical plan and issue bundles with stable files", () => {
		const root = makeRepo();
		const planOutput = run(root, "--type", "plans", "checkout flow");
		const planRoot = path.join(root, "context", "plans", "checkout-flow");
		assert.deepEqual(fs.readdirSync(planRoot).sort(), ["00-index.md"]);
		assert.ok(planOutput.includes(path.join(planRoot, "00-index.md")));
		assert.match(fs.readFileSync(path.join(planRoot, "00-index.md"), "utf8"), /type: plan/);

		const issueOutput = run(root, "--type", "issues", "checkout flow");
		const issueRoot = path.join(root, "context", "issues", "checkout-flow");
		assert.deepEqual(fs.readdirSync(issueRoot).sort(), ["000-index.md"]);
		assert.ok(issueOutput.includes(path.join(issueRoot, "000-index.md")));
		const issue = fs.readFileSync(path.join(issueRoot, "000-index.md"), "utf8");
		for (const heading of ["## Summary", "## Current behavior", "## Intended behavior", "## Context & Sub-issues", "## Expected outcome", "## Plan reference"]) {
			assert.ok(issue.includes(heading), `issue missing ${heading}`);
		}
	});

	it("does not overwrite an existing bundle on rerun", () => {
		const root = makeRepo();
		const bundle = path.join(root, "context", "plans", "safe-rerun");
		run(root, "--type", "plans", "safe rerun");
		const index = path.join(bundle, "00-index.md");
		fs.appendFileSync(index, "\nmanual note\n");
		const output = run(root, "--type", "plans", "safe rerun");
		assert.match(output, /Already exists:/);
		assert.ok(fs.readFileSync(index, "utf8").includes("manual note"));
	});

	it("preserves terminal-first grill and glossary append behavior", () => {
		const root = makeRepo();
		const [grill] = createdPaths(run(root, "--type", "grill", "grill session"));
		const content = fs.readFileSync(grill, "utf8");
		assert.equal(content.includes("[!"), false);
		assert.equal(content.includes("[["), false);
		assert.ok(content.includes("## Summary"));
		assert.ok(content.includes("### Open Questions"));

		run(root, "--type", "glossary", "Order");
		const glossary = path.join(root, "context", "glossary", "glossary.md");
		run(root, "--type", "glossary", "Invoice");
		const glossaryText = fs.readFileSync(glossary, "utf8");
		for (const field of ["_Avoid_", "Relationships:", "Flagged ambiguities:", "Example dialogue:"]) {
			assert.ok(glossaryText.includes(field), `glossary missing ${field}`);
		}
		assert.ok(glossaryText.includes("**Order**:"));
		assert.ok(glossaryText.includes("**Invoice**:"));
	});

	it("accepts --topic and positional topics", () => {
		const root = makeRepo();
		const [file] = createdPaths(run(root, "--type", "research", "--topic", "caching layer"));
		assert.match(file, /caching-layer\.md$/);
	});
});
