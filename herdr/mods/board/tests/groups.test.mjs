import assert from "node:assert/strict";
import { test } from "node:test";
import { contextText, peekLine, repoGroups, statusGroups, unseenCount } from "../board.js";

const card = (tabId, status, project = "", board = { project }) => ({ tabId, status, project, board, placement: "open", title: tabId });
const order = ["a", "b", "c", "d"];

test("status groups put blocked and done first and keep tab order inside a group", () => {
	const groups = statusGroups([card("d", "working"), card("c", "done"), card("b", "working"), card("a", "blocked")], order);
	assert.deepEqual(groups.map((g) => [g.label, g.cards.map((c) => c.tabId)]), [
		["Needs you", ["a", "c"]],
		["In progress", ["b", "d"]],
	]);
});

test("closed tabs are not in the live groups", () => {
	const closed = { ...card("x", null), placement: "closed" };
	assert.deepEqual(statusGroups([closed], order), []);
});

test("repo groups lead with the most urgent repo and end with no repo", () => {
	const groups = repoGroups([card("a", "working", "web"), card("b", "idle"), card("c", "blocked", "api"), card("d", "working", "web")], order);
	assert.deepEqual(groups.map((g) => [g.label, g.cards.map((c) => c.tabId)]), [["api", ["c"]], ["web", ["a", "d"]], ["no repo", ["b"]]]);
});

test("unseen counts only log lines after the last look", () => {
	const board = { log: [{ at: "2026-01-01T00:00:00Z" }, { at: "2026-01-02T00:00:00Z" }] };
	assert.equal(unseenCount(board, "2026-01-01T12:00:00Z"), 1);
	assert.equal(unseenCount(board, null), 0);
});

test("the folded line prefers a blocker, then the current step", () => {
	assert.equal(peekLine(card("a", "blocked", "", { blockers: ["need key"], now: "x" })), "blocked: need key");
	assert.equal(peekLine(card("a", "working", "", { now: "writing tests" })), "writing tests");
	assert.equal(peekLine({ board: null }), "no board yet");
});

test("copied context names the task, folder, decisions and next steps", () => {
	const text = contextText(card("a", "working", "", { goal: "G", root: "/r", now: "N", log: [{ kind: "decision", text: "A over B" }], next: ["S"] }));
	assert.equal(text, "Task: G\nFolder: /r\nNow: N\nLog:\n- Decided: A over B\nNext:\n- S");
});

import { isDone, toggleOpen } from "../board.js";

test("opening a fourth card closes the one opened longest ago", () => {
	assert.deepEqual(toggleOpen(["a", "b", "c"], "d", 3), ["b", "c", "d"]);
	assert.deepEqual(toggleOpen(["a", "b"], "a", 3), ["b"]);
});

test("a task is done when the tab says so or its step starts with done", () => {
	assert.equal(isDone({ status: "idle", board: { now: "done: shipped" } }), true);
	assert.equal(isDone({ status: "done", board: null }), true);
	assert.equal(isDone({ status: "working", board: { now: "doneness check" } }), false);
});

test("a tab with only a stamped prompt shows what was asked", () => {
	assert.equal(peekLine({ board: { last_prompt: "fix login" } }), "asked: fix login");
});

import { cardsFor, tabFolder } from "../board.js";

test("a tab's folder is its agent's live folder, else its first terminal's", () => {
	const panes = [
		{ tab: "a", terminal: "t1", cwd: "/home/me", app: null },
		{ tab: "a", terminal: "t2", cwd: "/code/web", app: "opencode" },
		{ tab: "a", terminal: null, cwd: null, app: null },
		{ tab: "b", terminal: "t3", cwd: "/tmp", app: null },
	];
	assert.equal(tabFolder(panes, "a"), "/code/web");
	assert.equal(tabFolder(panes, "b"), "/tmp");
	assert.equal(tabFolder(panes, "c"), null);
});

test("a tab with no board still gets its repo and folder from its terminal", () => {
	const tab = { id: "a", name: "2", status: "working", space: { id: "s", name: "S" }, folder: "/code/web/src", repo: "web" };
	const [card] = cardsFor([tab], {});
	assert.equal(card.project, "web");
	assert.equal(card.root, "/code/web/src");
});

test("a board's own project and root win over the terminal's", () => {
	const tab = { id: "a", name: "2", status: "working", space: { id: "s", name: "S" }, folder: "/x", repo: "x" };
	const [card] = cardsFor([tab], { a: { project: "api", root: "/code/api" } });
	assert.equal(card.project, "api");
	assert.equal(card.root, "/code/api");
});

test("the user's own prompts never count as new", () => {
	const board = { log: [{ at: "2026-01-02T00:00:00Z", kind: "prompt" }, { at: "2026-01-02T00:00:00Z", kind: "step" }] };
	assert.equal(unseenCount(board, "2026-01-01T00:00:00Z"), 1);
});
