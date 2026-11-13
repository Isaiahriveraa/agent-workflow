import assert from "node:assert/strict";
import { test } from "node:test";
import { ageLabel, cardsFor, isStale, parseBoard } from "../board.js";

const NOW = Date.parse("2026-11-05T12:00:00.000Z");
const minutesAgo = (minutes) => new Date(NOW - minutes * 60_000).toISOString();
const tab = (id, status, space = "app") => ({ id, name: `tab ${id}`, status, space: { id: `sp-${id}`, name: space } });
const board = (tabId, extra = {}) => ({ version: 1, tab: tabId, project: "app", goal: `Goal ${tabId}`, now: "", next: [], blockers: [], updated: minutesAgo(5), ...extra });

test("open tabs with a board come first, most urgent first", () => {
	const tabs = [tab("idle1", "idle"), tab("blocked1", "blocked"), tab("working1", "working"), tab("done1", "done")];
	const boards = { idle1: board("idle1"), blocked1: board("blocked1"), working1: board("working1"), done1: board("done1") };
	assert.deepEqual(cardsFor(tabs, boards).map((card) => card.tabId), ["blocked1", "done1", "working1", "idle1"]);
});

test("tabs with the same status sort by the most recent update", () => {
	const tabs = [tab("older", "idle"), tab("newer", "idle")];
	const boards = { older: board("older", { updated: minutesAgo(60) }), newer: board("newer", { updated: minutesAgo(2) }) };
	assert.deepEqual(cardsFor(tabs, boards).map((card) => card.tabId), ["newer", "older"]);
});

test("open tabs without a board follow, and boards of closed tabs come last", () => {
	const tabs = [tab("bare", "working"), tab("ready", "idle")];
	const boards = { ready: board("ready"), gone: board("gone", { project: "old-app" }) };
	const cards = cardsFor(tabs, boards);
	assert.deepEqual(cards.map((card) => [card.tabId, card.placement]), [["ready", "open"], ["bare", "unstarted"], ["gone", "closed"]]);
});

test("a card names its tab and space, and keeps the tab's live status", () => {
	const [card] = cardsFor([tab("ready", "blocked", "payments")], { ready: board("ready") });
	assert.equal(card.title, "tab ready");
	assert.equal(card.space, "payments");
	assert.equal(card.status, "blocked");
	assert.equal(card.project, "app");
});

test("ages read in minutes, hours and days, and nothing for a board never updated", () => {
	assert.equal(ageLabel(minutesAgo(0), NOW), "just now");
	assert.equal(ageLabel(minutesAgo(12), NOW), "12m ago");
	assert.equal(ageLabel(minutesAgo(180), NOW), "3h ago");
	assert.equal(ageLabel(minutesAgo(60 * 48), NOW), "2d ago");
	assert.equal(ageLabel(null, NOW), "");
});

test("a board untouched for more than a day is stale", () => {
	assert.equal(isStale(minutesAgo(60 * 25), NOW), true);
	assert.equal(isStale(minutesAgo(60 * 23), NOW), false);
	assert.equal(isStale(null, NOW), false);
});

test("the card of the focused tab is marked active", () => {
	const cards = cardsFor([{ ...tab("here", "idle"), active: true }, tab("there", "idle")], {});
	assert.deepEqual(cards.map((card) => [card.tabId, card.active]), [["here", true], ["there", false]]);
});

test("a board file that isn't valid JSON is flagged, not silently dropped", () => {
	assert.equal(parseBoard(null), null);
	assert.deepEqual(parseBoard("{not json"), { unreadable: true });
	assert.equal(parseBoard(JSON.stringify(board("x"))).goal, "Goal x");
});
