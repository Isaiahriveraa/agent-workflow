// Pure logic for the board mod: which cards to show, in what order, and how old
// they are. No Herdr or gpui calls here, so it runs under plain node.

export const URGENCY = { blocked: 4, done: 3, working: 2, idle: 1 };
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * @behavior The board in a board file's text. Null when there is no file, and
 *   {unreadable: true} when the text is not valid JSON, so the card can say so.
 */
export function parseBoard(text) {
	if (text === null || text === undefined) return null;
	try {
		return JSON.parse(text);
	} catch {
		return { unreadable: true };
	}
}

/**
 * @behavior One card per open tab, then one per board whose tab is gone. Open tabs
 *   with a board come first (most urgent, then most recently updated); open tabs
 *   without one follow, dimmed; boards of closed tabs come last.
 * @param tabs [{id, name, status, space: {id, name}, folder?, repo?}]: the open tabs, in
 *   Herdr's order; folder and repo come from the tab's live terminal and are used when
 *   no agent has written a board (a board's own root and project win)
 * @param boards {[tabId]: board}: boards read from the board folder
 * @returns [{tabId, spaceId, title, space, project, status, board, placement, active}]
 *   where placement is "open", "unstarted" or "closed"
 */
export function cardsFor(tabs, boards) {
	const openTabIds = new Set(tabs.map((tab) => tab.id));
	const openCards = tabs.map((tab) => {
		const board = boards[tab.id] ?? null;
		return {
			tabId: tab.id,
			spaceId: tab.space.id,
			title: tab.name,
			space: tab.space.name,
			project: board?.project || tab.repo || "",
			root: board?.root || tab.folder || "",
			status: tab.status ?? null,
			board,
			placement: board ? "open" : "unstarted",
			active: tab.active === true,
		};
	});
	const started = openCards
		.filter((card) => card.placement === "open")
		.sort((a, b) => (URGENCY[b.status] ?? 0) - (URGENCY[a.status] ?? 0) || updatedOf(b).localeCompare(updatedOf(a)));
	const unstarted = openCards.filter((card) => card.placement === "unstarted");
	const closed = Object.entries(boards)
		.filter(([tabId]) => !openTabIds.has(tabId))
		.map(([tabId, board]) => ({
			tabId,
			spaceId: null,
			title: "Closed tab",
			space: "",
			project: board.project ?? "",
			root: board.root ?? "",
			status: null,
			board,
			placement: "closed",
		}));
	return [...started, ...unstarted, ...closed];
}

const updatedOf = (card) => card.board?.updated ?? "";

/** @behavior "just now", "12m ago", "3h ago" or "2d ago"; empty when never updated. */
export function ageLabel(updated, now) {
	if (!updated) return "";
	const minutes = Math.floor((now - Date.parse(updated)) / MINUTE_MS);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

/** @behavior True when a board has not been updated for more than a day. */
export function isStale(updated, now) {
	return !!updated && now - Date.parse(updated) > DAY_MS;
}

const NEEDS_YOU = new Set(["blocked", "done"]);

/**
 * @behavior The status view: "Needs you" (blocked or done), "In progress" (working)
 *   and "Idle" (everything else open). Cards keep Herdr's tab order inside a group,
 *   so a task only moves when its group changes. Empty groups are left out.
 * @returns [{label, cards}]
 */
export function statusGroups(cards, tabOrder) {
	const open = cards.filter((card) => card.placement !== "closed");
	const rank = new Map(tabOrder.map((id, index) => [id, index]));
	const ordered = (list) => list.sort((a, b) => (rank.get(a.tabId) ?? 0) - (rank.get(b.tabId) ?? 0));
	return [
		{ label: "Needs you", cards: ordered(open.filter((card) => NEEDS_YOU.has(card.status))) },
		{ label: "In progress", cards: ordered(open.filter((card) => card.status === "working")) },
		{ label: "Idle", cards: ordered(open.filter((card) => !NEEDS_YOU.has(card.status) && card.status !== "working")) },
	].filter((group) => group.cards.length > 0);
}

/**
 * @behavior The repo view: open cards grouped by their board's project. Repos with
 *   the most urgent task come first; tabs without a project go last as "no repo".
 * @returns [{label, cards}]
 */
export function repoGroups(cards, tabOrder) {
	const byRepo = new Map();
	for (const group of statusGroups(cards, tabOrder)) {
		for (const card of group.cards) {
			const repo = card.project || "no repo";
			if (!byRepo.has(repo)) byRepo.set(repo, []);
			byRepo.get(repo).push(card);
		}
	}
	const worst = (list) => Math.max(...list.map((card) => URGENCY[card.status] ?? 0));
	return [...byRepo.entries()]
		.sort(([a, x], [b, y]) => (a === "no repo") - (b === "no repo") || worst(y) - worst(x))
		.map(([label, list]) => ({ label, cards: list }));
}

/** @behavior How many agent-written log lines came after `seenAt` (an ISO time); the user's own prompts aren't news. */
export function unseenCount(board, seenAt) {
	if (!seenAt) return 0;
	return (board?.log ?? []).filter((entry) => entry.kind !== "prompt" && entry.at > seenAt).length;
}

/**
 * @behavior The one line shown under a folded card: the blocker, the done outcome,
 *   the current step, the goal, or (when the agent hasn't written one) the user's
 *   last prompt, which the prompt hook stamps; for a tab with no board, what it is.
 */
export function peekLine(card) {
	const board = card.board;
	if (!board || board.unreadable) return board?.unreadable ? "board file can't be read" : "no board yet";
	if (board.blockers?.length) return `blocked: ${board.blockers[0]}`;
	if (board.now) return board.now;
	if (board.goal) return board.goal;
	return board.last_prompt ? `asked: ${board.last_prompt}` : "";
}

/** @behavior Plain text a new agent can start from: goal, where it stands, decisions, next. */
export function contextText(card) {
	const board = card.board ?? {};
	const lines = [`Task: ${board.goal || card.title}`];
	if (board.root) lines.push(`Folder: ${board.root}`);
	if (board.now) lines.push(`Now: ${board.now}`);
	for (const blocker of board.blockers ?? []) lines.push(`Blocked: ${blocker}`);
	const log = board.log ?? [];
	if (log.length) lines.push("Log:", ...log.slice(-8).map((entry) => `- ${entry.kind === "decision" ? "Decided: " : entry.kind === "prompt" ? "Asked: " : ""}${entry.text}`));
	if (board.next?.length) lines.push("Next:", ...board.next.map((step) => `- ${step}`));
	return lines.join("\n");
}

/** @behavior True when the task is finished: the tab reports done, or the agent wrote "done: ..." as its step. */
export function isDone(card) {
	return card.status === "done" || /^done\b/.test(card.board?.now ?? "");
}

/**
 * @behavior The open cards after one is toggled: closing removes it; opening adds it
 *   last and closes the longest-open card beyond `max`, so at most `max` stay open.
 */
export function toggleOpen(openIds, tabId, max) {
	if (openIds.includes(tabId)) return openIds.filter((id) => id !== tabId);
	return [...openIds, tabId].slice(-max);
}

/**
 * @behavior The folder a tab is working in: its agent's terminal's live folder, else
 *   its first terminal's. Null when no terminal reports one (a mod-only tab).
 * @param panes Herdr's panes(): [{tab, terminal, cwd, app}]
 */
export function tabFolder(panes, tabId) {
	const terminals = panes.filter((pane) => pane.tab === tabId && pane.terminal && pane.cwd);
	return (terminals.find((pane) => pane.app) ?? terminals[0])?.cwd ?? null;
}
