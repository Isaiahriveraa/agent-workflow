import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "workflow.py");
const GENERATOR = path.join(path.dirname(fileURLToPath(import.meta.url)), "new-artifact.py");
const columns = "ID | Ticket | Issue | Status | Depends on | Plan | Research | PR | Evidence";

function write(root, name, content) {
	fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
	fs.writeFileSync(path.join(root, name), content);
}

function git(root, ...args) {
	const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
	assert.equal(result.status, 0, result.stderr);
	return result.stdout.trim();
}

function repo(t) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-"));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	git(root, "init", "-q");
	git(root, "config", "user.email", "test@example.com");
	git(root, "config", "user.name", "Workflow Test");
	write(root, "src/main.txt", "baseline\n");
	git(root, "add", ".");
	git(root, "commit", "-qm", "baseline");
	return root;
}

function row(id, status = "ready", dependencies = "-", extra = {}) {
	return { ID: id, Ticket: `context/tickets/${id}.md`, Issue: `#${id}`, Status: status,
		"Depends on": dependencies, Plan: `context/plans/${id}.md`, Research: "-", PR: "-", Evidence: "-", ...extra };
}

function queue(root, rows) {
	for (const entry of rows) write(root, entry.Ticket, "# Ticket\n");
	write(root, "context/tickets/index.md", `# Tickets\n\n## Queue\n\n| ${columns} |\n| ${columns.split(" | ").map(() => "---").join(" | ")} |\n${rows.map(entry => `| ${Object.values(entry).join(" | ")} |`).join("\n")}\n`);
}

function run(root, ...args) {
	const result = spawnSync("python3", [SCRIPT, ...args], { cwd: root, encoding: "utf8" });
	assert.doesNotMatch(result.stderr, /Traceback/);
	return { status: result.status, data: JSON.parse(result.stdout) };
}

function select(root, ...args) {
	return run(root, "select", "context/tickets/index.md", ...args);
}

function plan(root, overrides = {}) {
	const fields = { Ticket: "context/tickets/001.md", "Plan status": "approved",
		"Planned at": git(root, "rev-parse", "HEAD"), "In-scope files": "src/main.txt", ...overrides };
	write(root, "context/plans/001.md", Object.entries(fields).map(([key, value]) => `**${key}:** ${value}`).join("\n\n") + "\n");
}

function check(root, ...args) {
	return run(root, "check", "context/tickets/index.md", "--target", "001", "--plan", "context/plans/001.md", ...args);
}

test("select chooses the lowest eligible ID, not table order or an unfinished dependency", t => {
	const root = repo(t);
	queue(root, [row("003"), row("002", "ready", "001"), row("001", "draft"), row("004")]);
	const result = select(root);
	assert.equal(result.status, 0);
	assert.equal(result.data.selected.ID, "003");
	assert.deepEqual(result.data.eligible.map(entry => entry.ID), ["003", "004"]);
	assert.match(result.data.blocked.find(entry => entry.id === "002").reason, /001/);
});

test("explicit target wins only when eligible and never falls back", t => {
	const root = repo(t);
	queue(root, [row("001"), row("002"), row("003", "blocked")]);
	assert.equal(select(root, "--target", "002").data.selected.ID, "002");
	for (const target of ["003", "999"]) {
		const result = select(root, "--target", target);
		assert.notEqual(result.status, 0);
		assert.match(result.data.error, new RegExp(target));
	}
});

test("done dependencies unlock ready rows, while active PRs and other statuses block", t => {
	const root = repo(t);
	queue(root, [row("001", "done", "-", { Evidence: "merged #1" }), row("002", "ready", "001"),
		row("003", "ready", "-", { PR: "#3" }), row("004", "needs-review"),
		row("005", "in-progress"), row("006", "in-review")]);
	assert.deepEqual(select(root).data.eligible.map(entry => entry.ID), ["002"]);
	assert.match(select(root).data.blocked.find(entry => entry.id === "003").reason, /PR/);
	queue(root, [row("001", "draft")]);
	assert.equal(select(root).data.selected, null);
	queue(root, []);
	assert.deepEqual(select(root).data, { selected: null, eligible: [], blocked: [] });
});

test("rejects invalid queue rows and dependency graphs before selecting any candidate", t => {
	const root = repo(t);
	for (const rows of [
		[row("001"), row("001")],
		[row("001", "ready", "999")],
		[row("001", "draft", "002"), row("002", "draft", "001")],
		[row("001", "unknown")],
		[row("01")],
		[row("001", "done")],
		[row("001", "ready", "1")],
	]) {
		queue(root, rows);
		const result = select(root);
		assert.notEqual(result.status, 0, JSON.stringify(rows));
		assert.equal(typeof result.data.error, "string");
	}
	for (const text of ["# No queue\n", "## Queue\n| ID | Ticket |\n| --- | --- |\n",
		`## Queue\n| ${columns} |\n| --- |\n`,
		`## Queue\n| ${columns} |\n| ${columns.split(" | ").map(() => "---").join(" | ")} |\n| 001 | short |\n`]) {
		write(root, "context/tickets/index.md", text);
		assert.notEqual(select(root).status, 0);
	}
});

test("queue section treats Markdown comments as notes, not table rows", t => {
	const root = repo(t);
	queue(root, [row("001"), row("002")]);
	const index = path.join(root, "context/tickets/index.md");
	let text = fs.readFileSync(index, "utf8");
	text = text.replace("## Queue\n", "## Queue\n\n<!-- why this queue exists,\nacross two lines -->\n");
	text = text.replace(/\n(\| 002)/, "\n<!-- dependency note -->\n$1");
	write(root, "context/tickets/index.md", text);
	const result = select(root);
	assert.equal(result.status, 0);
	assert.deepEqual(result.data.eligible.map(entry => entry.ID), ["001", "002"]);
});

test("generated issue bundles are consumable by select despite scaffold comments", t => {
	const root = repo(t);
	execFileSync("python3", [GENERATOR, "--type", "issues", "checkout flow"], { cwd: root, encoding: "utf8" });
	const result = run(root, "select", "context/issues/checkout-flow/000-index.md");
	assert.equal(result.status, 0);
	assert.equal(result.data.selected, null, "the scaffolded row is a draft, not ready");
	assert.deepEqual(result.data.blocked.map(entry => entry.id), ["001"]);
});

test("validates every artifact path and ticket existence inside the Git root", t => {
	const root = repo(t);
	queue(root, [row("001"), row("002", "done", "-", { Evidence: "merged" })]);
	fs.unlinkSync(path.join(root, "context/tickets/002.md"));
	assert.notEqual(select(root).status, 0);
	for (const field of ["Ticket", "Plan", "Research"]) {
		for (const unsafe of ["../outside.md", "/outside.md", "[doc](inside.md)", "-option", "context/../../outside.md"]) {
			queue(root, [row("001")]);
			const index = path.join(root, "context/tickets/index.md");
			const entry = row("001", "ready", "-", { [field]: unsafe });
			write(root, "context/tickets/index.md", fs.readFileSync(index, "utf8").replace(Object.values(row("001")).join(" | "), Object.values(entry).join(" | ")));
			assert.notEqual(select(root).status, 0, `${field}: ${unsafe}`);
		}
	}
	queue(root, [row("001")]);
	fs.symlinkSync(os.tmpdir(), path.join(root, "outside"));
	write(root, "context/tickets/index.md", fs.readFileSync(path.join(root, "context/tickets/index.md"), "utf8").replace("context/plans/001.md", "outside/plan.md"));
	assert.notEqual(select(root).status, 0);
	assert.notEqual(run(root, "select", "../missing.md").status, 0);
	queue(root, [row("001")]);
	assert.equal(select(path.join(root, "src")).data.selected.ID, "001");
});

test("check requires an eligible target and the matching strictly approved plan fields", t => {
	const root = repo(t);
	queue(root, [row("001")]);
	plan(root);
	assert.equal(check(root).status, 0);
	plan(root, { Ticket: "#001" });
	assert.equal(check(root).status, 0);
	for (const invalid of [{ "Plan status": "draft" }, { Ticket: "context/tickets/002.md" },
		{ "Planned at": "HEAD" }, { "In-scope files": "<!-- TODO -->" }, { Ticket: "-" }]) {
		plan(root, invalid);
		assert.notEqual(check(root).status, 0, JSON.stringify(invalid));
	}
	plan(root);
	const valid = fs.readFileSync(path.join(root, "context/plans/001.md"), "utf8");
	for (const field of ["Ticket", "Plan status", "Planned at", "In-scope files"]) {
		write(root, "context/plans/001.md", valid.replace(new RegExp(`^\\*\\*${field}:\\*\\*.*$`, "m"), ""));
		assert.notEqual(check(root).status, 0, `missing ${field}`);
		write(root, "context/plans/001.md", valid + valid.split("\n").find(line => line.startsWith(`**${field}:**`)) + "\n");
		assert.notEqual(check(root).status, 0, `duplicate ${field}`);
	}
	plan(root);
	write(root, "other-plan.md", valid);
	assert.notEqual(check(root, "--plan", "other-plan.md").status, 0);
	assert.equal(check(root, "--plan", "context/plans/./001.md").status, 0);
	queue(root, [row("001", "blocked")]);
	assert.notEqual(check(root).status, 0);
});

test("plan freshness permits unrelated commits but rejects scoped drift and invalid baselines", t => {
	const root = repo(t);
	queue(root, [row("001")]);
	plan(root);
	const baseline = git(root, "rev-parse", "HEAD");
	write(root, "unrelated.txt", "new\n");
	git(root, "add", "unrelated.txt");
	git(root, "commit", "-qm", "unrelated");
	assert.equal(check(root).status, 0);
	write(root, "src/main.txt", "changed\n");
	git(root, "add", "src/main.txt");
	git(root, "commit", "-qm", "relevant");
	const stale = check(root);
	assert.notEqual(stale.status, 0);
	assert.match(stale.data.error, /stale.*src\/main.txt/);
	assert.equal(check(root, "--base", baseline).status, 0);
	plan(root);
	assert.notEqual(check(root, "--base", baseline).status, 0, "planned commit must be ancestor of base");
	plan(root, { "Planned at": "f".repeat(40) });
	assert.notEqual(check(root).status, 0);
	plan(root);
	assert.notEqual(check(root, "--base", "not-a-ref").status, 0);
	assert.notEqual(check(root, "--base", "--output=evil").status, 0);
});

test("linked worktrees read ignored original artifacts but never unrelated-repo artifacts", t => {
	const root = repo(t);
	write(root, ".gitignore", "context/\n");
	git(root, "add", ".gitignore");
	git(root, "commit", "-qm", "ignore local artifacts");
	queue(root, [row("001")]);
	plan(root);
	git(root, "worktree", "add", "--detach", "delivery", "HEAD");
	const delivery = path.join(root, "delivery");
	const index = path.join(root, "context/tickets/index.md");
	assert.equal(fs.existsSync(path.join(delivery, "context")), false);
	write(root, "src/main.txt", "dirty original must not affect delivery\n");
	assert.equal(run(delivery, "select", index).data.selected.ID, "001");
	for (const artifact of ["context/plans/001.md", path.join(root, "context/plans/001.md")]) {
		assert.equal(run(delivery, "check", index, "--target", "001", "--plan", artifact).status, 0);
	}
	const other = repo(t);
	queue(other, [row("001")]);
	plan(other);
	assert.notEqual(run(delivery, "select", path.join(other, "context/tickets/index.md")).status, 0);
	assert.notEqual(run(delivery, "check", index, "--target", "001", "--plan", path.join(other, "context/plans/001.md")).status, 0);
	fs.symlinkSync(path.join(other, "context/plans/001.md"), path.join(root, "context/plans/escape.md"));
	assert.notEqual(run(delivery, "check", index, "--target", "001", "--plan", "context/plans/escape.md").status, 0);
});

test("scoped staged, unstaged, untracked and ignored files stale a plan even with alternate base", t => {
	const root = repo(t);
	queue(root, [row("001")]);
	plan(root);
	const baseline = git(root, "rev-parse", "HEAD");
	write(root, "src/main.txt", "unstaged\n");
	assert.notEqual(check(root).status, 0);
	assert.notEqual(check(root, "--base", baseline).status, 0);
	git(root, "add", "src/main.txt");
	assert.notEqual(check(root).status, 0);
	write(root, "src/main.txt", "baseline\n");
	assert.notEqual(check(root).status, 0, "staged drift is detected even when worktree matches HEAD");
	git(root, "add", "src/main.txt");
	assert.equal(check(root).status, 0);
	plan(root, { "In-scope files": "src/new.txt" });
	assert.equal(check(root).status, 0, "absent future files are allowed");
	write(root, "src/new.txt", "untracked\n");
	assert.notEqual(check(root).status, 0);
	write(root, ".gitignore", "src/new.txt\n");
	assert.notEqual(check(root).status, 0, "ignored scope is still dirty");
	plan(root, { "In-scope files": "src/main.txt" });
	assert.equal(check(root).status, 0, "unrelated dirt is allowed");
});

test("scope accepts only literal repo files, never *? globs, directories or escaping paths", t => {
	const root = repo(t);
	queue(root, [row("001")]);
	for (const scope of ["src/*.txt", "src/?.txt", "src", ".", "../outside", "/outside", "-option", "src/main.txt,"]) {
		plan(root, { "In-scope files": scope });
		assert.notEqual(check(root).status, 0, scope);
	}
	plan(root, { "In-scope files": "src/[a].txt" });
	assert.equal(check(root).status, 0, "a bracket path is a literal future file, not a wildcard");
	fs.symlinkSync(os.tmpdir(), path.join(root, "outside"));
	plan(root, { "In-scope files": "outside/new.txt" });
	assert.notEqual(check(root).status, 0);
	write(root, "src/other.txt", "other\n");
	fs.symlinkSync("main.txt", path.join(root, "src/link.txt"));
	git(root, "add", "src");
	git(root, "commit", "-qm", "link baseline");
	plan(root, { "In-scope files": "src/link.txt" });
	assert.equal(check(root).status, 0);
	fs.unlinkSync(path.join(root, "src/link.txt"));
	fs.symlinkSync("other.txt", path.join(root, "src/link.txt"));
	assert.notEqual(check(root).status, 0, "scope tracks the symlink itself, not only its resolved target");
});

test("literal bracket filenames are valid queue and scope paths, Markdown links and globs are not", t => {
	const root = repo(t);
	const bracket = "src/app/[id]/page.tsx";
	write(root, bracket, "export default function Page() {}\n");
	git(root, "add", "-A");
	git(root, "commit", "-qm", "bracket route");
	queue(root, [row("001")]);
	plan(root, { "In-scope files": bracket });
	assert.equal(check(root).status, 0, "existing bracket file is a valid literal scope");
	plan(root, { "In-scope files": "src/app/[slug]/page.tsx" });
	assert.equal(check(root).status, 0, "absent bracket file is a valid future file");
	for (const invalid of ["src/*.txt", "src/?.txt", "[doc](inside.md)", "src/[doc](inside.md)"]) {
		plan(root, { "In-scope files": invalid });
		assert.notEqual(check(root).status, 0, invalid);
	}
});

test("CLI errors are JSON and an empty explicit target never falls back", t => {
	const root = repo(t);
	queue(root, [row("001")]);
	assert.notEqual(select(root, "--target", "").status, 0);
	for (const args of [[], ["unknown"], ["check", "context/tickets/index.md"],
		["select", "missing.md"], ["select", "context/tickets/index.md", "--unknown"]]) {
		const result = run(root, ...args);
		assert.notEqual(result.status, 0);
		assert.equal(typeof result.data.error, "string");
	}
	assert.notEqual(check(root).status, 0, "missing plan is a JSON read error");
	const notRepo = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-no-git-"));
	t.after(() => fs.rmSync(notRepo, { recursive: true, force: true }));
	assert.notEqual(run(notRepo, "select", "index.md").status, 0);
});

test("placeholder scope cannot masquerade as an absent future file", t => {
	const root = repo(t);
	queue(root, [row("001")]);
	for (const placeholder of ["TODO", "TBD", "...", "<files>"]) {
		plan(root, { "In-scope files": placeholder });
		assert.notEqual(check(root).status, 0, placeholder);
	}
});

test("literal filenames and artifact contents are data, and successful checks do not mutate the repo", t => {
	const root = repo(t);
	const literal = "src/$(touch NEVER_EXECUTED).txt";
	write(root, literal, "literal file\n");
	git(root, "add", "--", literal);
	git(root, "commit", "-qm", "literal filename");
	queue(root, [row("001")]);
	plan(root, { "In-scope files": literal });
	fs.appendFileSync(path.join(root, "context/plans/001.md"), "\n$(touch NEVER_EXECUTED)\n");
	const before = fs.readFileSync(path.join(root, ".git/index"));
	const planBefore = fs.readFileSync(path.join(root, "context/plans/001.md"));
	assert.equal(check(root).status, 0);
	assert.equal(fs.existsSync(path.join(root, "NEVER_EXECUTED")), false);
	assert.deepEqual(fs.readFileSync(path.join(root, ".git/index")), before);
	assert.deepEqual(fs.readFileSync(path.join(root, "context/plans/001.md")), planBefore);
});

test("index file symlinks cannot escape their owning root even to a related worktree", t => {
	const root = repo(t);
	queue(root, [row("001")]);
	const delivery = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-linked-"));
	t.after(() => fs.rmSync(delivery, { recursive: true, force: true }));
	git(root, "worktree", "add", "--detach", delivery, "HEAD");
	queue(delivery, [row("001")]);
	const index = path.join(root, "context/tickets/index.md");
	fs.unlinkSync(index);
	fs.symlinkSync(path.join(delivery, "context/tickets/index.md"), index);
	assert.notEqual(run(delivery, "select", index).status, 0);
});

test("validates dependency chains across the full three-digit ID range without a traceback", t => {
	const root = repo(t);
	const rows = Array.from({ length: 1000 }, (_, i) => row(String(i).padStart(3, "0"), "draft", i === 999 ? "-" : String(i + 1).padStart(3, "0")));
	queue(root, rows);
	assert.equal(select(root).status, 0);
	rows[999]["Depends on"] = "000";
	queue(root, rows);
	const result = select(root);
	assert.notEqual(result.status, 0);
	assert.match(result.data.error, /cycle/);
});
