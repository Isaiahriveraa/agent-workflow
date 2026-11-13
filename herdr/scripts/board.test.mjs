import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
	applySet,
	applyStamp,
	emptyBoard,
	LIMITS,
	parseArgs,
	projectOf,
	readBoard,
	resolveTab,
	tabFromLabels,
	writeBoardAtomic,
} from "./board.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "board.mjs");
const NOW = "2026-11-05T12:00:00.000Z";
const LATER = "2026-11-05T12:05:00.000Z";
const roots = [];
after(() => roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function tempDir() {
	const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "board-test-")));
	roots.push(dir);
	return dir;
}

const fresh = () => emptyBoard({ tab: "tb1", root: "/work/app", project: "app" });

test("setting one field keeps the fields it doesn't name", () => {
	const first = applySet(fresh(), { goal: "Ship login", next: ["Write tests"] }, { at: NOW, by: "t1" });
	const second = applySet(first, { now: "Checking the redirect" }, { at: LATER, by: "t1" });
	assert.equal(second.goal, "Ship login");
	assert.deepEqual(second.next, ["Write tests"]);
	assert.equal(second.now, "Checking the redirect");
	assert.equal(second.updated, LATER);
});

test("text and lists are cut to their limits so every card stays readable", () => {
	const board = applySet(fresh(), {
		goal: "g".repeat(LIMITS.text + 50),
		next: Array.from({ length: LIMITS.listItems + 2 }, (_, index) => `step ${index}`),
		blockers: ["b".repeat(LIMITS.item + 50)],
	}, { at: NOW, by: "t1" });
	assert.equal(board.goal.length, LIMITS.text);
	assert.equal(board.next.length, LIMITS.listItems);
	assert.equal(board.blockers[0].length, LIMITS.item);
});

test("log lines are added newest last, stamped, and the oldest drop off", () => {
	let board = emptyBoard({ tab: "t", root: "/r", project: "r" });
	board = applySet(board, { log: [{ text: "Chose A over B", kind: "decision" }] }, { at: "T1", by: "x" });
	board = applySet(board, { now: "next step", log: [{ text: "Wired it", kind: "step" }] }, { at: "T2", by: "x" });
	assert.deepEqual(board.log, [
		{ at: "T1", kind: "decision", text: "Chose A over B" },
		{ at: "T2", kind: "step", text: "Wired it" },
	]);
	for (let i = 0; i < LIMITS.logItems + 5; i++) board = applySet(board, { log: [{ text: `s${i}`, kind: "step" }] }, { at: "T", by: "x" });
	assert.equal(board.log.length, LIMITS.logItems);
	assert.equal(board.log.at(-1).text, `s${LIMITS.logItems + 4}`);
});

test("--log and --decision become log changes in order", () => {
	assert.deepEqual(parseArgs(["set", "--decision", "D", "--log", "S"]).changes.log, [
		{ text: "D", kind: "decision" },
		{ text: "S", kind: "step" },
	]);
});

test("an empty blockers list clears the blockers", () => {
	const blocked = applySet(fresh(), { blockers: ["Waiting on an API key"] }, { at: NOW, by: "t1" });
	const cleared = applySet(blocked, { blockers: [] }, { at: LATER, by: "t1" });
	assert.deepEqual(cleared.blockers, []);
});

test("stamping records the prompt and time and leaves the plan fields alone", () => {
	const board = applySet(fresh(), { goal: "Ship login", next: ["Write tests"] }, { at: NOW, by: "t1" });
	const stamped = applyStamp(board, { prompt: "p".repeat(LIMITS.prompt + 80), at: LATER, by: "t1" });
	assert.equal(stamped.goal, "Ship login");
	assert.deepEqual(stamped.next, ["Write tests"]);
	assert.equal(stamped.last_prompt.length, LIMITS.prompt);
	assert.equal(stamped.updated, LATER);
});

test("the tab comes from the terminal's herdr.tab label", () => {
	assert.equal(tabFromLabels({ "herdr.tab": "tb9", "herdr.space": "sp1" }), "tb9");
	assert.equal(tabFromLabels({ where: "app" }), null);
});

test("a shell outside a Herdr tab resolves no tab and says so", () => {
	const lookup = () => ({ labels: { where: "app" } });
	assert.throws(() => resolveTab({ HC_TERMINAL_ID: "t1" }, lookup), /Not in a Herdr tab/);
	assert.throws(() => resolveTab({}, lookup), /Not in a Herdr tab/);
});

test("the project is the git folder above the current folder", () => {
	const repo = tempDir();
	fs.mkdirSync(path.join(repo, ".git"));
	const sub = path.join(repo, "src", "app");
	fs.mkdirSync(sub, { recursive: true });
	assert.deepEqual(projectOf(sub), { root: repo, project: path.basename(repo) });
});

test("a board is written in a private folder with no partial file left behind", () => {
	const file = path.join(tempDir(), "board", "tb1.json");
	writeBoardAtomic(file, applySet(fresh(), { goal: "Ship login" }, { at: NOW, by: "t1" }));
	assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).goal, "Ship login");
	assert.deepEqual(fs.readdirSync(path.dirname(file)), ["tb1.json"]);
	assert.equal(fs.statSync(path.dirname(file)).mode & 0o777, 0o700);
});

test("a board file that isn't valid JSON is reported and left untouched", () => {
	const file = path.join(tempDir(), "tb1.json");
	fs.writeFileSync(file, "{not json");
	assert.throws(() => readBoard(file), /not valid JSON/);
	assert.equal(fs.readFileSync(file, "utf8"), "{not json");
});

test("a tab with no board file reads as no board", () => {
	assert.equal(readBoard(path.join(tempDir(), "missing.json")), null);
});

test("the set flags become the changes they name", () => {
	const parsed = parseArgs([
		"set", "--goal", "Ship login", "--next", "Write tests", "--next", "Review",
		"--clear-blockers", "--link", "Docs=https://example.com/a?b=c",
	]);
	assert.equal(parsed.command, "set");
	assert.deepEqual(parsed.changes, {
		goal: "Ship login",
		next: ["Write tests", "Review"],
		blockers: [],
		links: [{ label: "Docs", target: "https://example.com/a?b=c" }],
	});
});

test("from an open Herdr tab, set writes that tab's board and show reads it back", () => {
	const home = tempDir();
	const bin = tempDir();
	fs.writeFileSync(path.join(bin, "hc"), "#!/bin/sh\necho '{\"labels\":{\"herdr.tab\":\"tb42\"}}'\n", { mode: 0o755 });
	const env = { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}`, HC_TERMINAL_ID: "t7" };

	const set = spawnSync(process.execPath, [SCRIPT, "set", "--goal", "Ship login"], { env, cwd: home, encoding: "utf8" });
	assert.equal(set.status, 0, set.stderr);
	const file = path.join(home, ".config", "herdr-app", "board", "tb42.json");
	assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).goal, "Ship login");

	const show = spawnSync(process.execPath, [SCRIPT, "show"], { env, cwd: home, encoding: "utf8" });
	assert.equal(show.status, 0, show.stderr);
	assert.match(show.stdout, /Ship login/);
});

test("outside a Herdr tab the command exits 1 and writes nothing", () => {
	const home = tempDir();
	const env = { ...process.env, HOME: home };
	delete env.HC_TERMINAL_ID;
	const result = spawnSync(process.execPath, [SCRIPT, "set", "--goal", "Ship login"], { env, cwd: home, encoding: "utf8" });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Not in a Herdr tab/);
	assert.equal(fs.existsSync(path.join(home, ".config")), false);
});

test("run through a symlink, the command still runs", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "board-link-"));
	const link = path.join(dir, "board.mjs");
	fs.symlinkSync(SCRIPT, link);
	const result = spawnSync(process.execPath, [link, "nonsense"], { env: { ...process.env, HC_TERMINAL_ID: "" }, encoding: "utf8" });
	fs.rmSync(dir, { recursive: true });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /board:/);
});

test("moving to a new step logs the old one as finished", () => {
	let board = emptyBoard({ tab: "t", root: "/r", project: "r" });
	board = applySet(board, { now: "write tests" }, { at: "T1", by: "x" });
	board = applySet(board, { now: "wire the page" }, { at: "T2", by: "x" });
	board = applySet(board, { now: "wire the page" }, { at: "T3", by: "x" });
	assert.deepEqual(board.log, [{ at: "T2", kind: "step", text: "write tests" }]);
});

test("a finished task's done line is not logged again as a step", () => {
	let board = { ...emptyBoard({ tab: "t", root: "/r", project: "r" }), now: "done: shipped" };
	board = applySet(board, { now: "next task" }, { at: "T", by: "x" });
	assert.deepEqual(board.log, []);
});

test("each prompt joins the trail once", () => {
	let board = emptyBoard({ tab: "t", root: "/r", project: "r" });
	board = applyStamp(board, { prompt: "fix login", at: "T1", by: "x" });
	board = applyStamp(board, { prompt: "fix login", at: "T2", by: "x" });
	board = applyStamp(board, { prompt: "add tests", at: "T3", by: "x" });
	assert.deepEqual(board.log.map((e) => [e.kind, e.text]), [["prompt", "fix login"], ["prompt", "add tests"]]);
	assert.equal(board.goal, "");
});
