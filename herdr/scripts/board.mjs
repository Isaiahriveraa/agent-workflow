#!/usr/bin/env node
// Project board: each Herdr tab keeps its own record of goal, current step, next
// steps and blockers. The board mod reads ~/.config/herdr-app/board/<tab id>.json
// and draws one card per tab.
//
// Usage (run from an open Herdr tab; anywhere else it exits 1 and writes nothing):
//   board.mjs set [--goal T] [--now T] [--next T]... [--blocker T]... [--clear-blockers] [--link label=target]...
//                 [--log T]... [--decision T]...
//   board.mjs show
//
// A list flag given again replaces that whole list. --log and --decision add to the
// card's log instead (newest last, the oldest dropped past LIMITS.logItems).
// Text beyond its limit is cut.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getProjectContext } from "../../scripts/project-context.mjs";

export const LIMITS = { text: 200, item: 160, listItems: 5, logItems: 30, linkLabel: 40, linkTarget: 200 };

const clip = (text, max) => String(text).slice(0, max);
const clipList = (items, max) => items.slice(0, LIMITS.listItems).map((item) => clip(item, max));

/** @behavior Adds entries to a board's log, newest last, keeping the last LIMITS.logItems. */
function appendLog(log, entries) {
	return [...(log ?? []), ...entries].slice(-LIMITS.logItems);
}

export function emptyBoard({ tab, root, project }) {
	return { version: 1, tab, root, project, goal: "", now: "", next: [], blockers: [], links: [], log: [], updated: null, by: null };
}

/**
 * @behavior Returns the board with the fields `changes` names replaced and every
 *   other field kept. A list given as [] empties it.
 *   `changes.log` entries are added to the board's log, stamped with `at`. Changing
 *   `now` also logs the previous step as finished (unless it was "done: ..."), so the
 *   trail grows even when an agent only updates its current step.
 * @param changes {goal?, now?, next?, blockers?, links?, log?: [{text, kind: "step" | "decision"}]}
 * @param stamp {at, by}: when the write happened and which terminal wrote it
 */
export function applySet(board, changes, { at, by }) {
	const next = { ...board, updated: at, by };
	if (changes.goal !== undefined) next.goal = clip(changes.goal, LIMITS.text);
	const trail = [];
	if (changes.now !== undefined) {
		next.now = clip(changes.now, LIMITS.text);
		// Moving to a new step finishes the old one: it joins the trail on its own.
		const finished = (board.now ?? "").trim();
		if (finished && finished !== next.now && !/^done\b/.test(finished)) trail.push({ at, kind: "step", text: clip(finished, LIMITS.item) });
	}
	if (changes.next !== undefined) next.next = clipList(changes.next, LIMITS.item);
	if (changes.blockers !== undefined) next.blockers = clipList(changes.blockers, LIMITS.item);
	if (changes.links !== undefined) {
		next.links = changes.links.slice(0, LIMITS.listItems).map(({ label, target }) => ({
			label: clip(label, LIMITS.linkLabel),
			target: clip(target, LIMITS.linkTarget),
		}));
	}
	if (changes.log !== undefined) trail.push(...changes.log.map(({ text, kind }) => ({ at, kind, text: clip(text, LIMITS.item) })));
	if (trail.length) next.log = appendLog(board.log, trail);
	return next;
}

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

function transcriptEntries(jsonl) {
	return jsonl.split("\n").filter(Boolean).flatMap((text) => {
		try {
			return [JSON.parse(text)];
		} catch {
			return [];
		}
	});
}

// A real prompt from the person: plain text, not a tool result the agent got back.
function startsTurn(entry) {
	if (entry.type !== "user") return false;
	const content = entry.message?.content;
	return typeof content === "string" || (Array.isArray(content) && content.some((block) => block.type === "text"));
}

function plainText(markdown) {
	return markdown
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/`([^`]*)`/g, "$1")
		.replace(/\*\*|__|^#+\s*/gm, "")
		.replace(/\s+/g, " ")
		.trim();
}

function firstSentence(text) {
	const match = text.match(/^(.+?[.!?])(\s|$)/);
	return match ? match[1] : text;
}

/**
 * @behavior One plain-text line for the latest turn in a Claude transcript (JSONL text),
 *   or null when the turn used no tools (a chat-only answer is not logged). It names the
 *   files it edited, up to three, then the first sentence of the reply.
 */
export function turnLine(jsonl) {
	const entries = transcriptEntries(jsonl);
	const start = entries.findLastIndex(startsTurn);
	if (start < 0) return null;
	const blocks = entries
		.slice(start + 1)
		.filter((entry) => entry.type === "assistant" && Array.isArray(entry.message?.content))
		.flatMap((entry) => entry.message.content);
	const tools = blocks.filter((block) => block.type === "tool_use");
	if (tools.length === 0) return null;

	const files = [...new Set(tools.filter((tool) => EDIT_TOOLS.has(tool.name)).map((tool) => path.basename(tool.input?.file_path ?? tool.input?.notebook_path ?? "")).filter(Boolean))];
	const reply = plainText(blocks.filter((block) => block.type === "text").map((block) => block.text).at(-1) ?? "");
	const edited = files.length > 0 ? `Edited ${files.slice(0, 3).join(", ")}${files.length > 3 ? ` +${files.length - 3}` : ""}` : "";
	const fallback = tools.some((tool) => tool.name === "Bash") ? "Ran commands" : "Used tools";
	const summary = reply ? firstSentence(reply) : "";
	return clip([edited || fallback, summary].filter(Boolean).join(": "), LIMITS.item);
}

export function tabFromLabels(labels) {
	return labels?.["herdr.tab"] || null;
}

/**
 * @behavior The tab this shell runs in, read from the terminal's `herdr.tab` label.
 * @param readTerminal (terminalId) => the `hc get --json` result for that terminal
 * @exceptions Throws "Not in a Herdr tab" when the shell has no terminal or the terminal has no tab.
 */
export function resolveTab(env, readTerminal) {
	const terminalId = env.HC_TERMINAL_ID;
	const tab = terminalId ? tabFromLabels(readTerminal(terminalId)?.labels) : null;
	if (!tab) throw new Error("Not in a Herdr tab, so nothing was written.");
	return tab;
}

export function readTerminal(terminalId) {
	return JSON.parse(execFileSync("hc", ["get", terminalId, "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
}

/** @behavior The git project folder above `cwd`, and its name. Reuses the agents' project lookup. */
export function projectOf(cwd) {
	const { projectRoot } = getProjectContext({ cwd });
	return { root: projectRoot, project: path.basename(projectRoot) };
}

export function boardDir() {
	return path.join(os.homedir(), ".config", "herdr-app", "board");
}

/**
 * @behavior The board in `file`, or null when the tab has none yet.
 * @exceptions Throws, naming the file, when it isn't valid JSON, so a broken board is never overwritten.
 */
export function readBoard(file) {
	if (!fs.existsSync(file)) return null;
	try {
		return JSON.parse(fs.readFileSync(file, "utf8"));
	} catch (error) {
		throw new Error(`${file} is not valid JSON. Move it aside to start this tab's board again.`, { cause: error });
	}
}

/** @behavior Writes the board through a temp file, so a reader never sees half a board. */
export function writeBoardAtomic(file, board) {
	fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
	const temp = `${file}.${process.pid}.tmp`;
	fs.writeFileSync(temp, `${JSON.stringify(board, null, 2)}\n`, { mode: 0o600 });
	fs.renameSync(temp, file);
}

export function parseArgs(argv) {
	const [command, ...rest] = argv;
	const parsed = { command, changes: {} };
	for (let index = 0; index < rest.length; index++) {
		const flag = rest[index];
		const value = () => {
			index += 1;
			if (rest[index] === undefined) throw new Error(`${flag} needs a value`);
			return rest[index];
		};
		switch (flag) {
			case "--goal": parsed.changes.goal = value(); break;
			case "--now": parsed.changes.now = value(); break;
			case "--next": (parsed.changes.next ??= []).push(value()); break;
			case "--blocker": (parsed.changes.blockers ??= []).push(value()); break;
			case "--clear-blockers": parsed.changes.blockers = []; break;
			case "--link": {
				const pair = value();
				const equals = pair.indexOf("=");
				if (equals < 1) throw new Error("--link needs label=target");
				(parsed.changes.links ??= []).push({ label: pair.slice(0, equals), target: pair.slice(equals + 1) });
				break;
			}
			case "--log": (parsed.changes.log ??= []).push({ text: value(), kind: "step" }); break;
			case "--decision": (parsed.changes.log ??= []).push({ text: value(), kind: "decision" }); break;
			case "--transcript": parsed.transcript = value(); break;
			default: throw new Error(`unknown option ${flag}`);
		}
	}
	return parsed;
}

function run(argv) {
	const args = parseArgs(argv);
	const tab = resolveTab(process.env, readTerminal);
	const file = path.join(boardDir(), `${tab}.json`);
	const { root, project } = projectOf(process.cwd());
	const at = new Date().toISOString();
	const by = process.env.HC_TERMINAL_ID;
	const existing = readBoard(file) ?? emptyBoard({ tab, root, project });

	if (args.command === "show") {
		console.log(readBoard(file) ? JSON.stringify(existing, null, 2) : `No board yet for tab ${tab}.`);
		return;
	}
	if (args.command === "set") {
		if (Object.keys(args.changes).length === 0) throw new Error("set needs at least one field, such as --goal");
		writeBoardAtomic(file, { ...applySet(existing, args.changes, { at, by }), root, project });
		console.log(`Board updated for tab ${tab}.`);
		return;
	}
	if (args.command === "turn") {
		if (args.transcript === undefined) throw new Error("turn needs --transcript");
		const line = turnLine(fs.readFileSync(args.transcript, "utf8"));
		if (line === null) return;
		writeBoardAtomic(file, { ...applySet(existing, { log: [{ text: line, kind: "step" }] }, { at, by }), root, project });
		return;
	}
	throw new Error("usage: board.mjs set | show | turn --transcript FILE");
}

// Compare real paths: the command is usually run through a symlink (~/.config/herdr/scripts).
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
	try {
		run(process.argv.slice(2));
	} catch (error) {
		console.error(`board: ${error.message}`);
		process.exitCode = 1;
	}
}
