// Plan map core: the pure logic behind a plan map page. The render script inlines
// this file into the page (it becomes window.PlanMapCore); tests load it in Node.
// No DOM access here, so every rule the page relies on can be tested directly.
(function (root, factory) {
	const core = factory();
	if (typeof module === "object" && module.exports) module.exports = core;
	else root.PlanMapCore = core;
})(typeof self !== "undefined" ? self : globalThis, () => {
	const LANES = [
		{ id: "ui", label: "You / UI" },
		{ id: "server", label: "Server / logic" },
		{ id: "data", label: "Data" },
		{ id: "external", label: "Outside services" },
	];
	const STATUSES = ["new", "changed", "existing"];
	const LIMITS = { parts: 8, stepsMin: 3, stepsMax: 5, decisions: 3, risks: 3, terms: 3, optionsMin: 2, optionsMax: 4, sentenceWords: 25 };
	const CARD = { w: 184, h: 60 };
	const GAP = { lane: 96, row: 40, pad: 32, head: 34, detour: 26 };

	// ---- checks -----------------------------------------------------------

	/**
	 * @behavior Lists every way `plan` breaks the plan map's readability and
	 *   consistency rules (see design-principles.md). An empty list means the
	 *   map can be rendered.
	 * @returns string[] — one plain sentence per problem
	 */
	function checkPlan(plan) {
		const problems = [];
		const need = (value, message) => { if (!value) problems.push(message); };
		const parts = plan.parts || [];
		const steps = plan.steps || [];
		const decisions = plan.decisions || [];
		const partIds = new Set(parts.map((part) => part.id));

		need(plan.title, "Add a title.");
		need(plan.headline, "Add a one-sentence headline.");
		need(parts.length > 0, "Add at least one part.");
		need(parts.length <= LIMITS.parts, `Keep the map to ${LIMITS.parts} parts or fewer (has ${parts.length}).`);
		need(steps.length >= LIMITS.stepsMin && steps.length <= LIMITS.stepsMax, `Use ${LIMITS.stepsMin}–${LIMITS.stepsMax} build steps (has ${steps.length}).`);
		need(decisions.length <= LIMITS.decisions, `Surface at most ${LIMITS.decisions} decisions (has ${decisions.length}).`);
		need((plan.risks || []).length <= LIMITS.risks, `List at most ${LIMITS.risks} risks.`);
		need((plan.terms || []).length <= LIMITS.terms, `Define at most ${LIMITS.terms} terms.`);

		const seen = new Set();
		for (const part of parts) {
			need(part.id && !seen.has(part.id), `Part ids must be unique and present ("${part.id}").`);
			seen.add(part.id);
			need(LANES.some((lane) => lane.id === part.lane), `Part "${part.id}" has unknown lane "${part.lane}".`);
			need(STATUSES.includes(part.status), `Part "${part.id}" has unknown status "${part.status}".`);
			need(part.why, `Part "${part.id}" needs a "why".`);
		}

		const stepOf = {};
		steps.forEach((step, index) => {
			need(step.title && step.because, `Step ${index + 1} needs a title and a "because".`);
			for (const id of step.parts || []) {
				need(partIds.has(id), `Step ${index + 1} names unknown part "${id}".`);
				if (id in stepOf) problems.push(`Part "${id}" is built in two steps (${stepOf[id] + 1} and ${index + 1}).`);
				stepOf[id] = index;
			}
		});
		for (const part of parts) {
			if (part.status !== "existing") need(part.id in stepOf, `New or changed part "${part.id}" isn't built in any step.`);
		}

		(plan.links || []).forEach((link, index) => {
			need(partIds.has(link.from) && partIds.has(link.to), `Link ${index + 1} connects unknown parts ("${link.from}" → "${link.to}").`);
		});

		const decisionIds = new Set();
		for (const decision of decisions) {
			need(decision.id && !decisionIds.has(decision.id), `Decision ids must be unique and present ("${decision.id}").`);
			decisionIds.add(decision.id);
			const options = decision.options || [];
			need(options.length >= LIMITS.optionsMin && options.length <= LIMITS.optionsMax, `Decision "${decision.id}" needs ${LIMITS.optionsMin}–${LIMITS.optionsMax} options.`);
			need(options.filter((option) => option.recommended).length === 1, `Decision "${decision.id}" needs exactly one recommended option.`);
			if (decision.part) need(partIds.has(decision.part), `Decision "${decision.id}" points at unknown part "${decision.part}".`);
			if (decision.decided) need(options.some((option) => option.id === decision.decided.option), `Decision "${decision.id}" is decided on an unknown option.`);
		}
		for (const risk of plan.risks || []) {
			if (risk.part) need(partIds.has(risk.part), `A risk points at unknown part "${risk.part}".`);
		}

		for (const [where, text] of sentences(plan)) {
			const words = text.trim().split(/\s+/).length;
			need(words <= LIMITS.sentenceWords, `${where} is ${words} words; keep each sentence under ${LIMITS.sentenceWords}.`);
		}
		return problems;
	}

	function sentences(plan) {
		const out = [];
		const add = (where, text) => {
			if (typeof text !== "string") return;
			for (const sentence of text.split(/(?<=[.!?])\s+/)) if (sentence.trim()) out.push([where, sentence]);
		};
		add("The headline", plan.headline);
		add("The analogy", plan.analogy);
		(plan.parts || []).forEach((part) => { add(`"${part.id}" why`, part.why); add(`"${part.id}" without`, part.without); });
		(plan.steps || []).forEach((step, index) => { add(`Step ${index + 1} because`, step.because); add(`Step ${index + 1} gives`, step.gives); });
		(plan.links || []).forEach((link, index) => add(`Link ${index + 1} say`, link.say));
		return out;
	}

	// ---- system layout ------------------------------------------------------

	// Cards inside each lane are ordered next to the parts they connect to, so lines cross less.
	function orderRows(parts, lanes, links) {
		const rows = Object.fromEntries(lanes.map((lane) => [lane.id, parts.filter((part) => part.lane === lane.id)]));
		const laneOf = Object.fromEntries(parts.map((part) => [part.id, part.lane]));
		const neighbors = {};
		for (const link of links) {
			(neighbors[link.from] ||= []).push(link.to);
			(neighbors[link.to] ||= []).push(link.from);
		}
		for (let pass = 0; pass < 4; pass += 1) {
			const rowOf = {};
			Object.values(rows).forEach((list) => list.forEach((part, row) => { rowOf[part.id] = row; }));
			for (const lane of lanes) {
				const center = (part) => {
					const others = (neighbors[part.id] || []).filter((id) => id in rowOf && laneOf[id] !== lane.id);
					return others.length ? others.reduce((sum, id) => sum + rowOf[id], 0) / others.length : rowOf[part.id];
				};
				rows[lane.id] = [...rows[lane.id]].sort((a, b) => center(a) - center(b) || rowOf[a.id] - rowOf[b.id]);
			}
		}
		return rows;
	}

	/**
	 * @behavior Places the plan's parts in lane columns (or lane rows when
	 *   `vertical`) and routes every link so no line passes through a card it
	 *   doesn't connect: neighbors get a curve through the gap between them;
	 *   links that skip a lane or a card detour through the empty gutters and
	 *   a channel past all cards.
	 * @returns {lanes, cards: {id: {x, y, w, h, lane}}, edges: [{index, from,
	 *   to, d, label: {x, y, w}, points}], width, height} — `points` samples
	 *   the drawn line, for tests.
	 */
	function layoutSystem(plan, { vertical = false } = {}) {
		const parts = plan.parts || [];
		const links = plan.links || [];
		const lanes = LANES.filter((lane) => parts.some((part) => part.lane === lane.id));
		const rows = orderRows(parts, lanes, links);
		const cards = {};
		let cardsWidth = 0, cardsHeight = 0;
		lanes.forEach((lane, laneIndex) => {
			rows[lane.id].forEach((part, row) => {
				const x = vertical ? GAP.pad + row * (CARD.w + 24) : GAP.pad + laneIndex * (CARD.w + GAP.lane);
				const y = vertical ? GAP.head + GAP.pad + laneIndex * (CARD.h + GAP.head + GAP.row) : GAP.head + GAP.pad + row * (CARD.h + GAP.row);
				cards[part.id] = { x, y, w: CARD.w, h: CARD.h, lane: laneIndex, row };
				cardsWidth = Math.max(cardsWidth, x + CARD.w + GAP.pad);
				cardsHeight = Math.max(cardsHeight, y + CARD.h + GAP.pad);
			});
		});

		const needsDetour = (a, b) => Math.abs(a.lane - b.lane) > 1 || (a.lane === b.lane && Math.abs(a.row - b.row) > 1);
		const detourCount = links.filter((link) => cards[link.from] && cards[link.to] && needsDetour(cards[link.from], cards[link.to])).length;
		const width = cardsWidth + (vertical ? detourCount * GAP.detour : 0);
		const height = cardsHeight + (vertical ? 0 : detourCount * GAP.detour);

		const edges = [];
		const placedLabels = [];
		let detourIndex = 0;
		links.forEach((link, index) => {
			const a = cards[link.from], b = cards[link.to];
			if (!a || !b || link.from === link.to) return;
			let route;
			if (needsDetour(a, b)) {
				detourIndex += 1;
				const channel = (vertical ? cardsWidth : cardsHeight) - GAP.pad + 4 + detourIndex * GAP.detour;
				route = detourRoute(a, b, vertical, channel, (detourIndex - 1) * 8);
			} else {
				route = neighborRoute(a, b, vertical);
			}
			const w = (link.label || "").length * 6.8 + 14;
			let { x, y } = route.mid;
			const overlaps = () => placedLabels.some((tag) => Math.abs(tag.x - x) < (tag.w + w) / 2 + 4 && Math.abs(tag.y - y) < 24);
			for (let tries = 0; link.label && overlaps() && tries < 6; tries += 1) y += 24;
			if (link.label) placedLabels.push({ x, y, w });
			edges.push({ index, from: link.from, to: link.to, main: !!link.main, d: route.d, points: route.points, label: link.label ? { x, y, w, text: link.label } : null });
		});
		return { lanes, cards, edges, width, height, vertical };
	}

	function neighborRoute(a, b, vertical) {
		const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
		const across = vertical ? a.lane === b.lane : a.lane !== b.lane;
		if (across) {
			const dir = bc.x >= ac.x ? 1 : -1;
			const sx = ac.x + dir * a.w / 2, ex = bc.x - dir * b.w / 2;
			const bend = Math.max(36, Math.abs(ex - sx) / 2);
			const c1 = { x: sx + dir * bend, y: ac.y }, c2 = { x: ex - dir * bend, y: bc.y };
			return { d: `M${sx},${ac.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${ex},${bc.y}`, mid: { x: (sx + ex) / 2, y: (ac.y + bc.y) / 2 }, points: bezier({ x: sx, y: ac.y }, c1, c2, { x: ex, y: bc.y }) };
		}
		const dir = bc.y >= ac.y ? 1 : -1;
		const sy = ac.y + dir * a.h / 2, ey = bc.y - dir * b.h / 2;
		const bend = Math.max(24, Math.abs(ey - sy) / 2);
		const c1 = { x: ac.x, y: sy + dir * bend }, c2 = { x: bc.x, y: ey - dir * bend };
		return { d: `M${ac.x},${sy} C${c1.x},${c1.y} ${c2.x},${c2.y} ${bc.x},${ey}`, mid: { x: (ac.x + bc.x) / 2, y: (sy + ey) / 2 }, points: bezier({ x: ac.x, y: sy }, c1, c2, { x: bc.x, y: ey }) };
	}

	// Out into the gutter beside the source, along a channel past every card, back in
	// through the gutter beside the target. `offset` keeps detours off one another.
	function detourRoute(a, b, vertical, channel, offset) {
		const dir = b.lane > a.lane || (b.lane === a.lane && b.row > a.row) ? 1 : -1;
		let pts;
		if (vertical) {
			const side = a.lane === b.lane ? 1 : dir;
			const s = { x: a.x + a.w / 2, y: side > 0 ? a.y + a.h : a.y };
			const e = { x: b.x + b.w / 2, y: side > 0 ? b.y : b.y + b.h };
			const g1 = s.y + side * (12 + offset), g2 = e.y - side * (12 + offset);
			pts = [s, { x: s.x, y: g1 }, { x: channel, y: g1 }, { x: channel, y: g2 }, { x: e.x, y: g2 }, e];
		} else {
			const side = a.lane === b.lane ? 1 : dir;
			const s = { x: side > 0 ? a.x + a.w : a.x, y: a.y + a.h / 2 };
			const e = a.lane === b.lane ? { x: b.x + b.w, y: b.y + b.h / 2 } : { x: side > 0 ? b.x : b.x + b.w, y: b.y + b.h / 2 };
			const g1 = s.x + side * (GAP.lane / 2 - 10 + offset);
			const g2 = a.lane === b.lane ? g1 : e.x - side * (GAP.lane / 2 - 10 + offset);
			pts = [s, { x: g1, y: s.y }, { x: g1, y: channel }, { x: g2, y: channel }, { x: g2, y: e.y }, e];
		}
		const d = `M${pts[0].x},${pts[0].y} ` + pts.slice(1).map((p) => `L${p.x},${p.y}`).join(" ");
		const mid = vertical ? { x: channel, y: (pts[2].y + pts[3].y) / 2 } : { x: (pts[2].x + pts[3].x) / 2, y: channel };
		return { d, mid, points: polyline(pts) };
	}

	function bezier(p0, p1, p2, p3, n = 24) {
		const out = [];
		for (let i = 0; i <= n; i += 1) {
			const t = i / n, u = 1 - t;
			out.push({ x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x, y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y });
		}
		return out;
	}

	function polyline(pts, step = 6) {
		const out = [];
		for (let i = 0; i < pts.length - 1; i += 1) {
			const a = pts[i], b = pts[i + 1];
			const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
			for (let k = 0; k < n; k += 1) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
		}
		out.push(pts[pts.length - 1]);
		return out;
	}

	// ---- build-up walkthrough -------------------------------------------------

	/** Which step builds each part; existing parts belong to no step. */
	function stepOfParts(plan) {
		const out = {};
		(plan.steps || []).forEach((step, index) => (step.parts || []).forEach((id) => { if (!(id in out)) out[id] = index; }));
		return out;
	}

	/** Parts standing after step `index` (existing parts always stand). */
	function builtThrough(plan, index) {
		const stepOf = stepOfParts(plan);
		return new Set((plan.parts || []).filter((part) => !(part.id in stepOf) || stepOf[part.id] <= index).map((part) => part.id));
	}

	// ---- decisions and approval --------------------------------------------------

	/**
	 * @behavior Each decision's state, read from what Claude recorded in the
	 *   plan (`decided`) and what the viewer answered on the page (`answers`):
	 *   "decided" (Claude applied it) > "sent" (waiting for Claude) >
	 *   "answered" (picked, not sent) > "open".
	 * @returns {[id]: {state, option, note}}
	 */
	function decisionStates(plan, answers = {}) {
		const out = {};
		for (const decision of plan.decisions || []) {
			const answer = answers[decision.id] || {};
			if (decision.decided) out[decision.id] = { state: "decided", option: decision.decided.option, note: decision.decided.note || "" };
			else if (answer.option && answer.sentAt) out[decision.id] = { state: "sent", option: answer.option, note: answer.note || "" };
			else if (answer.option) out[decision.id] = { state: "answered", option: answer.option, note: answer.note || "" };
			else out[decision.id] = { state: "open", option: null, note: "" };
		}
		return out;
	}

	/**
	 * @behavior Whether a saved approval still stands: it must have been given
	 *   for this plan revision. Older records (a bare timestamp) don't count.
	 * @returns {boolean}
	 */
	function approvalHolds(plan, record) {
		return !!record && !!plan.revision && record.revision === plan.revision;
	}

	function optionLabel(decision, optionId) {
		const option = (decision.options || []).find((candidate) => candidate.id === optionId);
		if (!option) return optionId;
		return option.recommended ? `${option.label} (recommended)` : option.label;
	}

	/**
	 * @behavior The one message the page sends Claude for the decisions in
	 *   `ids`: plan, each choice with its note, and where the plan file lives.
	 */
	function decisionMessage(plan, answers, ids) {
		const lines = [`Plan decisions · ${plan.title}`];
		for (const decision of plan.decisions || []) {
			if (!ids.includes(decision.id)) continue;
			const answer = answers[decision.id];
			lines.push(`- ${decision.question} → ${optionLabel(decision, answer.option)}${answer.note ? `. Note: ${answer.note}` : ""}`);
		}
		if (plan.source) lines.push(`Plan file: ${plan.source}`);
		lines.push("Apply these to the plan and the map, then republish.");
		return lines.join("\n");
	}

	/** The approval message: the plan, every final choice, and the go-ahead. */
	function approvalMessage(plan, answers) {
		const states = decisionStates(plan, answers);
		const lines = [`APPROVED · ${plan.title}`];
		for (const decision of plan.decisions || []) {
			lines.push(`- ${decision.question} → ${optionLabel(decision, states[decision.id].option)}`);
		}
		if (plan.source) lines.push(`Plan file: ${plan.source}`);
		lines.push("Set the plan status to approved and start building.");
		return lines.join("\n");
	}

	/**
	 * @behavior What the primary button should offer next, in order: send
	 *   answered decisions, finish open ones, approve, or show approved.
	 * @returns {kind: "send"|"open"|"approve"|"approved", count}
	 */
	function nextAction(plan, answers, approved) {
		if (approved) return { kind: "approved", count: 0 };
		const states = Object.values(decisionStates(plan, answers));
		const answered = states.filter((s) => s.state === "answered").length;
		if (answered) return { kind: "send", count: answered };
		const open = states.filter((s) => s.state === "open").length;
		if (open) return { kind: "open", count: open };
		return { kind: "approve", count: 0 };
	}

	// ---- delivering a message to Claude -------------------------------------------

	/**
	 * @behavior Gets `text` to Claude without asking the viewer to paste anything.
	 *   Tries each channel in order: `comment` (posts a comment and wakes the
	 *   Claude Code session watching this page), then `session` (hands it to the
	 *   viewer's own Claude session). A channel that answers "can't reach Claude"
	 *   passes to the next; when none can, `save` keeps it for the next session
	 *   that opens the plan. Consent and rate limits stop the chain, because
	 *   another channel won't fix them.
	 * @param channels {comment?, session?, save} — async functions taking `text`;
	 *   a missing channel is skipped.
	 * @returns {via: "comment"|"session"|"saved"|null, reason?: "consent"|"rate_limited"|"failed"}
	 */
	async function deliverToClaude(text, channels) {
		const stoppers = { consent_required: "consent", forbidden: "consent", rate_limited: "rate_limited" };
		for (const via of ["comment", "session"]) {
			if (!channels[via]) continue;
			try {
				await channels[via](text);
				return { via };
			} catch (error) {
				if (stoppers[error?.code]) return { via: null, reason: stoppers[error.code] };
			}
		}
		try {
			await channels.save(text);
			return { via: "saved" };
		} catch {
			return { via: null, reason: "failed" };
		}
	}

	// ---- what changed since the viewer last looked ---------------------------

	/**
	 * @behavior Compares two versions of a plan. Parts are compared by id;
	 *   steps by position; decisions by id (a newly decided one counts).
	 * @returns {parts: id[], steps: index[], decisions: id[], summary: string[]}
	 */
	function diffPlans(before, after) {
		const result = { parts: [], steps: [], decisions: [], summary: [] };
		if (!before) return result;
		const byId = (list) => Object.fromEntries((list || []).map((item) => [item.id, item]));
		const oldParts = byId(before.parts), newParts = byId(after.parts);
		for (const [id, part] of Object.entries(newParts)) {
			if (!oldParts[id]) { result.parts.push(id); result.summary.push(`Added ${part.name}`); }
			else if (JSON.stringify(oldParts[id]) !== JSON.stringify(part)) { result.parts.push(id); result.summary.push(`Updated ${part.name}`); }
		}
		for (const [id, part] of Object.entries(oldParts)) if (!newParts[id]) result.summary.push(`Removed ${part.name}`);
		(after.steps || []).forEach((step, index) => {
			if (JSON.stringify((before.steps || [])[index]) !== JSON.stringify(step)) { result.steps.push(index); result.summary.push(`Step ${index + 1} changed`); }
		});
		const oldDecisions = byId(before.decisions);
		for (const decision of after.decisions || []) {
			const old = oldDecisions[decision.id];
			if (decision.decided && !old?.decided) { result.decisions.push(decision.id); result.summary.push(`Decided: ${decision.question}`); }
			else if (JSON.stringify(old) !== JSON.stringify(decision)) { result.decisions.push(decision.id); if (!old) result.summary.push(`New decision: ${decision.question}`); }
		}
		if (after.approved && !before.approved) result.summary.push("Plan approved");
		return result;
	}

	return { LANES, LIMITS, CARD, checkPlan, layoutSystem, stepOfParts, builtThrough, decisionStates, decisionMessage, approvalMessage, approvalHolds, nextAction, deliverToClaude, diffPlans };
});
