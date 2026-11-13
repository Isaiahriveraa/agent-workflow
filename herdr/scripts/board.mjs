#!/usr/bin/env node
// Project board: each Herdr tab keeps its own record of goal, current step, next
// steps and blockers. The board mod reads ~/.config/herdr-app/board/<tab id>.json
// and draws one card per tab.
//
// Usage (run from an open Herdr tab; anywhere else it exits 1 and writes nothing):
//   board.mjs set [--goal T] [--now T] [--next T]... [--blocker T]... [--clear-blockers] [--link label=target]...
//                 [--log T]... [--decision T]...
//   board.mjs show
//   board.mjs stamp --prompt T
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

export const LIMITS = { text: 200, item: 160, listItems: 5, logItems: 30, linkLabel: 40, linkTarget: 200, prompt: 120 };

const clip = (text, max) => String(text).slice(0, max);
const clipList = (items, max) => items.slice(0, LIMITS.listItems).map((item) => clip(item, max));

/** @behavior Adds entries to a board's log, newest last, keeping the last LIMITS.logItems. */
function appendLog(log, entries) {
	return [...(log ?? []), ...entries].slice(-LIMITS.logItems);
}

export function emptyBoard({ tab, root, project }) {
	return { version: 1, tab, root, project, goal: "", now: "", next: [], blockers: [], links: [], log: [], last_prompt: "", updated: null, by: null };
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

/**
 * @behavior Records the latest prompt and time, and adds the prompt to the trail as a
 *   "prompt" entry (a repeat of the last prompt is not added twice). Goal, now and next
 *   are never touched.
 */
export function applyStamp(board, { prompt, at, by }) {
	const text = clip(prompt, LIMITS.prompt);
	const last = (board.log ?? []).at(-1);
	const repeat = last?.kind === "prompt" && last.text === text;
	return { ...board, last_prompt: text, updated: at, by, log: repeat ? board.log ?? [] : appendLog(board.log, [{ at, kind: "prompt", text }]) };
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
	const parsed = { command, changes: {}, prompt: undefined };
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
			case "--prompt": parsed.prompt = value(); break;
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
	if (args.command === "stamp") {
		if (args.prompt === undefined) throw new Error("stamp needs --prompt");
		writeBoardAtomic(file, { ...applyStamp(existing, { prompt: args.prompt, at, by }), root, project });
		return;
	}
	throw new Error("usage: board.mjs set | show | stamp --prompt T");
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
