import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { planRevision, renderPage } from "./plan-map.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "plan-map.mjs");
const core = createRequire(import.meta.url)(path.join(os.homedir(), ".agents/skills/plan-map/references/plan-map-core.cjs"));
const roots = [];
after(() => roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })));

function plan(overrides = {}) {
	return {
		title: "Magic-link login",
		headline: "People sign in from an emailed link.",
		parts: [
			{ id: "form", name: "Login form", lane: "ui", status: "changed", why: "Where people ask for a link." },
			{ id: "api", name: "Request API", lane: "server", status: "new", why: "Makes the token." },
			{ id: "verify", name: "Verify API", lane: "server", status: "new", why: "Checks the token." },
			{ id: "tokens", name: "Token table", lane: "data", status: "new", why: "Stores tokens." },
			{ id: "mailer", name: "Email provider", lane: "external", status: "existing", why: "Sends the link." },
		],
		links: [
			{ from: "form", to: "api", label: "email", main: true },
			{ from: "api", to: "tokens", label: "save", main: true },
			{ from: "api", to: "mailer", label: "send", main: true },
			{ from: "form", to: "tokens", label: "skip" },
		],
		steps: [
			{ title: "Token table", parts: ["tokens"], because: "Both APIs use it." },
			{ title: "APIs", parts: ["api", "verify"], because: "The form needs them." },
			{ title: "Form", parts: ["form"], because: "UI goes last." },
		],
		decisions: [
			{ id: "expiry", question: "How long do links last?", part: "tokens", options: [
				{ id: "15m", label: "15 minutes", tradeoff: "Slow inboxes miss it.", recommended: true },
				{ id: "24h", label: "24 hours", tradeoff: "Leaked links work longer." },
			] },
		],
		source: "~/.claude/plans/example.md",
		...overrides,
	};
}

test("check accepts a plan that follows every rule", () => {
	assert.deepEqual(core.checkPlan(plan()), []);
});

test("check flags a new part that no step builds", () => {
	const p = plan();
	p.steps[1].parts = ["api"];
	assert.match(core.checkPlan(p).join("\n"), /"verify" isn't built in any step/);
});

test("check flags a part built in two steps and unknown references", () => {
	const p = plan();
	p.steps[2].parts = ["form", "tokens"];
	p.links.push({ from: "form", to: "ghost" });
	const problems = core.checkPlan(p).join("\n");
	assert.match(problems, /"tokens" is built in two steps/);
	assert.match(problems, /unknown parts \("form" → "ghost"\)/);
});

test("check enforces the readability limits", () => {
	const p = plan();
	p.parts = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, name: `Part ${i}`, lane: "server", status: "existing", why: "Context." }));
	p.links = [];
	p.steps = [{ title: "Only", parts: [], because: "x" }];
	p.decisions = [];
	p.headline = Array(30).fill("word").join(" ");
	const problems = core.checkPlan(p).join("\n");
	assert.match(problems, /8 parts or fewer/);
	assert.match(problems, /3–5 build steps/);
	assert.match(problems, /headline is 30 words/);
});

test("check requires real choices with exactly one recommendation", () => {
	const p = plan();
	p.decisions[0].options = [{ id: "a", label: "Only option" }];
	const problems = core.checkPlan(p).join("\n");
	assert.match(problems, /needs 2–4 options/);
	assert.match(problems, /exactly one recommended/);
});

function insideCard(point, card) {
	return point.x > card.x + 1 && point.x < card.x + card.w - 1 && point.y > card.y + 1 && point.y < card.y + card.h - 1;
}

for (const vertical of [false, true]) {
	test(`layout never draws a line through a card it doesn't connect (${vertical ? "phone" : "wide"})`, () => {
		const p = plan();
		p.parts.push({ id: "users", name: "Users", lane: "data", status: "existing", why: "Who." });
		p.parts.push({ id: "session", name: "Session", lane: "server", status: "existing", why: "Cookie." });
		p.links.push({ from: "form", to: "mailer", label: "far" }, { from: "api", to: "session", label: "same lane" });
		const layout = core.layoutSystem(p, { vertical });
		for (const edge of layout.edges) {
			for (const [id, card] of Object.entries(layout.cards)) {
				if (id === edge.from || id === edge.to) continue;
				assert.ok(!edge.points.some((point) => insideCard(point, card)), `${edge.from}→${edge.to} crosses ${id}`);
			}
		}
	});
}

test("walkthrough stands existing parts first, then each step's parts", () => {
	const p = plan();
	assert.deepEqual([...core.builtThrough(p, 0)].sort(), ["mailer", "tokens"]);
	assert.deepEqual([...core.builtThrough(p, 2)].sort(), ["api", "form", "mailer", "tokens", "verify"]);
});

test("decision state moves open → answered → sent → decided", () => {
	const p = plan();
	assert.equal(core.decisionStates(p, {}).expiry.state, "open");
	assert.equal(core.decisionStates(p, { expiry: { option: "24h" } }).expiry.state, "answered");
	assert.equal(core.decisionStates(p, { expiry: { option: "24h", sentAt: 1 } }).expiry.state, "sent");
	p.decisions[0].decided = { option: "15m" };
	assert.deepEqual(core.decisionStates(p, { expiry: { option: "24h", sentAt: 1 } }).expiry, { state: "decided", option: "15m", note: "" });
});

test("an approval holds only for the plan revision it was given for", () => {
	const current = { ...plan(), revision: "rev-2" };
	assert.equal(core.approvalHolds(current, { at: 1, revision: "rev-2" }), true);
	assert.equal(core.approvalHolds(current, { at: 1, revision: "rev-1" }), false);
	assert.equal(core.approvalHolds(current, 1700000000000), false, "a bare timestamp from an older page is not an approval");
	assert.equal(core.approvalHolds(current, null), false);
});

test("a plan changed after approval asks for approval again", () => {
	const answers = { expiry: { option: "15m", sentAt: 1 } };
	const record = { at: 1, revision: "rev-2" };
	const approvedPlan = { ...plan(), revision: "rev-2" };
	const changedPlan = { ...plan(), revision: "rev-3" };
	assert.equal(core.nextAction(approvedPlan, answers, core.approvalHolds(approvedPlan, record)).kind, "approved");
	assert.equal(core.nextAction(changedPlan, answers, core.approvalHolds(changedPlan, record)).kind, "approve");
});

test("the revision changes with the plan's content, not with its approval", () => {
	const revision = planRevision(plan());
	assert.notEqual(planRevision(plan({ headline: "Changed." })), revision);
	assert.equal(planRevision({ ...plan(), approved: true }), revision);
	assert.equal(planRevision({ ...plan(), revision: "anything" }), revision);
});

test("recording a choice doesn't change the revision an approval was given for", () => {
	const undecided = plan();
	const decided = { ...plan(), decisions: undecided.decisions.map((decision) => ({ ...decision, decided: { option: "15m", note: "" } })) };
	assert.equal(planRevision(decided), planRevision(undecided));
});

test("render stamps the plan's revision into the page data", () => {
	const html = renderPage(plan(), {
		template: "<title>__PLAN_TITLE__</title><script>/*__PLAN_CORE__*/</script><script type=\"application/json\">/*__PLAN_DATA__*/</script>",
		core: "",
	});
	assert.ok(html.includes(`"revision": "${planRevision(plan())}"`));
});

test("the decision message names the plan, each choice and note, and the plan file", () => {
	const text = core.decisionMessage(plan(), { expiry: { option: "15m", note: "match bank apps" } }, ["expiry"]);
	assert.equal(text, [
		"Plan decisions · Magic-link login",
		"- How long do links last? → 15 minutes (recommended). Note: match bank apps",
		"Plan file: ~/.claude/plans/example.md",
		"Apply these to the plan and the map, then republish.",
	].join("\n"));
});

test("the primary action asks to send, then to finish, then to approve", () => {
	const p = plan();
	assert.deepEqual(core.nextAction(p, {}, false), { kind: "open", count: 1 });
	assert.deepEqual(core.nextAction(p, { expiry: { option: "15m" } }, false), { kind: "send", count: 1 });
	assert.deepEqual(core.nextAction(p, { expiry: { option: "15m", sentAt: 1 } }, false), { kind: "approve", count: 0 });
	assert.deepEqual(core.nextAction(p, {}, true), { kind: "approved", count: 0 });
	assert.match(core.approvalMessage(p, { expiry: { option: "24h", sentAt: 1 } }), /^APPROVED · Magic-link login\n- How long do links last\? → 24 hours\n/);
});

test("diff reports added and updated parts, changed steps and new decisions", () => {
	const before = plan();
	const next = plan();
	next.parts[1] = { ...next.parts[1], why: "Makes and saves the token." };
	next.parts.push({ id: "users", name: "Users", lane: "data", status: "existing", why: "Who." });
	next.steps[2] = { ...next.steps[2], because: "Changed." };
	next.decisions[0].decided = { option: "15m" };
	const diff = core.diffPlans(before, next);
	assert.deepEqual(diff.parts.sort(), ["api", "users"]);
	assert.deepEqual(diff.steps, [2]);
	assert.deepEqual(diff.decisions, ["expiry"]);
	assert.ok(diff.summary.includes("Decided: How long do links last?"));
	assert.deepEqual(core.diffPlans(null, next).summary, []);
});

test("render inlines the data and core and can't be broken out of by plan text", () => {
	const html = renderPage(plan({ headline: "Ends </script><b>early</b>." }), {
		template: "<title>__PLAN_TITLE__</title><script>/*__PLAN_CORE__*/</script><script type=\"application/json\">/*__PLAN_DATA__*/</script>",
		core: "window.core = 1;",
	});
	assert.match(html, /<title>Magic-link login Map<\/title>/);
	assert.match(html, /window\.core = 1;/);
	assert.equal(html.match(/<\/script>/g).length, 2);
});

test("the CLI refuses a plan that breaks a rule and renders one that doesn't", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "plan-map-"));
	roots.push(root);
	const bad = plan();
	bad.steps = [];
	fs.writeFileSync(path.join(root, "bad.json"), JSON.stringify(bad));
	fs.writeFileSync(path.join(root, "good.json"), JSON.stringify(plan()));
	const refused = spawnSync("node", [SCRIPT, "render", "bad.json", "out.html"], { cwd: root, encoding: "utf8" });
	assert.equal(refused.status, 1);
	assert.match(refused.stdout, /build steps/);
	assert.ok(!fs.existsSync(path.join(root, "out.html")));
	const rendered = spawnSync("node", [SCRIPT, "render", "good.json", "out.html"], { cwd: root, encoding: "utf8" });
	assert.equal(rendered.status, 0, rendered.stdout + rendered.stderr);
	assert.match(fs.readFileSync(path.join(root, "out.html"), "utf8"), /Magic-link login Map/);
});

test("delivery tries the comment, then the viewer's session, then saves — never asks to paste", async () => {
	const unavailable = () => Promise.reject({ code: "claude_unavailable" });
	const sent = [];
	const ok = (name) => (text) => { sent.push([name, text]); return Promise.resolve(); };
	assert.deepEqual(await core.deliverToClaude("hi", { comment: ok("comment"), session: ok("session"), save: ok("save") }), { via: "comment" });
	assert.deepEqual(await core.deliverToClaude("hi", { comment: unavailable, session: ok("session"), save: ok("save") }), { via: "session" });
	assert.deepEqual(await core.deliverToClaude("hi", { comment: unavailable, session: unavailable, save: ok("save") }), { via: "saved" });
	assert.deepEqual(await core.deliverToClaude("hi", { save: ok("save") }), { via: "saved" });
	assert.deepEqual(sent.map(([name]) => name), ["comment", "session", "save", "save"]);
});

test("delivery stops on consent or rate limits instead of trying another channel", async () => {
	let sessionTried = false;
	const session = () => { sessionTried = true; return Promise.resolve(); };
	assert.deepEqual(await core.deliverToClaude("hi", { comment: () => Promise.reject({ code: "consent_required" }), session, save: () => Promise.resolve() }), { via: null, reason: "consent" });
	assert.deepEqual(await core.deliverToClaude("hi", { comment: () => Promise.reject({ code: "rate_limited" }), session, save: () => Promise.resolve() }), { via: null, reason: "rate_limited" });
	assert.equal(sessionTried, false);
	assert.deepEqual(await core.deliverToClaude("hi", { save: () => Promise.reject(new Error("offline")) }), { via: null, reason: "failed" });
});

test("a session that starts later picks up comment threads still awaiting a reply", () => {
	const skill = fs.readFileSync(path.join(os.homedir(), ".agents/skills/plan-map/SKILL.md"), "utf8");
	const handling = skill.slice(skill.indexOf("## Handling what the page sends"), skill.indexOf("Messages arrive as artifact-comment turns"));
	assert.match(handling, /awaiting reply/);
});
