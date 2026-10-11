import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildPrompt,
  parseReviewReport,
  preflight,
  runOmpReview,
  workingTreeFingerprint,
} from "./omp-review.mjs";

const VALID = `REVIEW-REPORT v1
run: feat-x-1
status: complete
findings: /tmp/findings.md
counts: critical=0 important=1 suggestion=2
verdict: CHANGES_REQUESTED
`;

// A stand-in for the herdr CLI. It records each call, answers the subcommands the
// runner uses, and, when a prompt is sent, writes the report named in the prompt
// file on the idle wait, as an OMP agent would. Behavior is set by env vars.
const HERDR_STUB = `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const env = process.env;
if (env.STUB_LOG) fs.appendFileSync(env.STUB_LOG, args.join(" ") + "\\n");
const out = (value) => process.stdout.write(JSON.stringify(value));
const fail = (message) => { process.stderr.write(message); process.exit(1); };
const [a, b] = args;
if (a === "agent" && b === "start" && args.includes("--help")) {
  const kinds = env.STUB_NO_OMP_KIND ? "pi, claude" : "pi, claude, omp";
  process.stdout.write("Usage: herdr agent start\\n  --kind <KIND>\\n  [possible values: " + kinds + "]\\n");
} else if (a === "tab" && b === "create") {
  out({ result: { tab: { tab_id: "w1:t9" }, root_pane: { pane_id: "w1:p9" } } });
} else if (a === "agent" && b === "start") {
  if (env.STUB_START_FAIL) fail("agent_not_ready");
  out({ result: {} });
} else if (a === "agent" && b === "prompt") {
  fs.writeFileSync(env.STUB_STATE, args[3]);
  out({ result: {} });
} else if (a === "agent" && b === "wait") {
  if (args.includes("working")) {
    if (env.STUB_NEVER_WORKING) fail("agent_timeout");
    out({ result: {} });
  } else {
    if (env.STUB_TOUCH) fs.writeFileSync(env.STUB_TOUCH, "changed\\n");
    if (env.STUB_REPORT) {
      const promptPath = fs.readFileSync(env.STUB_STATE, "utf8").match(/Read (\\S+) and/)[1];
      const reportPath = fs.readFileSync(promptPath, "utf8").match(/^report: (.+)$/m)[1];
      fs.writeFileSync(reportPath, env.STUB_REPORT);
    }
    out({ result: {} });
  }
} else if (a === "agent" && b === "get") {
  out({ result: { agent: { agent_status: env.STUB_FINAL || "idle" } } });
} else if (a === "agent" && b === "list") {
  out({ result: { agents: env.STUB_AGENTS ? JSON.parse(env.STUB_AGENTS) : [] } });
} else {
  fail("unexpected herdr call: " + args.join(" "));
}
`;

const setup = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "omp-review-"));
  const repo = path.join(root, "repo");
  mkdirSync(repo);
  const git = (args) => execFileSync("git", args, { cwd: repo, stdio: ["ignore", "pipe", "pipe"] });
  git(["init", "-q", "-b", "feat/x"]);
  git(["config", "user.email", "t@example.com"]);
  git(["config", "user.name", "t"]);
  writeFileSync(path.join(repo, "a.txt"), "one\n");
  git(["add", "a.txt"]);
  git(["commit", "-q", "-m", "feat: start"]);
  writeFileSync(path.join(repo, "a.txt"), "one\ntwo\n");

  const bin = path.join(root, "bin");
  const herdrOnly = path.join(root, "herdr-only");
  mkdirSync(bin);
  mkdirSync(herdrOnly);
  const herdrPath = path.join(bin, "herdr");
  writeFileSync(herdrPath, HERDR_STUB);
  chmodSync(herdrPath, 0o755);
  copyFileSync(herdrPath, path.join(herdrOnly, "herdr"));
  const ompPath = path.join(bin, "omp");
  writeFileSync(ompPath, "#!/bin/sh\nexit 0\n");
  chmodSync(ompPath, 0o755);

  const configPath = path.join(root, "config.yml");
  writeFileSync(
    configPath,
    "modelRoles:\n  default: openai-codex/gpt-6-luna:max\n  task: openai-codex/gpt-6-luna:max\nother: 1\n",
  );
  return {
    root,
    repo,
    configPath,
    bin,
    herdrOnly,
    statePath: path.join(root, "state"),
    logPath: path.join(root, "calls.log"),
    nodeDir: path.dirname(process.execPath),
  };
};

const envFor = (ctx, extra = {}) => ({
  ...process.env,
  HERDR_ENV: "1",
  PATH: `${ctx.bin}${path.delimiter}${ctx.nodeDir}`,
  STUB_STATE: ctx.statePath,
  STUB_LOG: ctx.logPath,
  ...extra,
});

test("a well-formed report parses into its fields and counts", () => {
  const result = parseReviewReport(VALID);
  assert.equal(result.ok, true);
  assert.deepEqual(result.report.counts, { critical: 0, important: 1, suggestion: 2 });
  assert.equal(result.report.verdict, "CHANGES_REQUESTED");
});

test("a report without the header is rejected", () => {
  assert.equal(parseReviewReport(VALID.replace("REVIEW-REPORT v1", "REVIEW")).ok, false);
});

test("each required field is enforced", () => {
  for (const field of ["run", "status", "findings", "counts", "verdict"]) {
    const text = VALID.split("\n").filter((line) => !line.startsWith(`${field}:`)).join("\n");
    const result = parseReviewReport(text);
    assert.equal(result.ok, false, `missing ${field} should fail`);
    assert.match(result.error, new RegExp(`missing field: ${field}`));
  }
});

test("status and verdict must be from their enums", () => {
  assert.equal(parseReviewReport(VALID.replace("status: complete", "status: done")).ok, false);
  assert.equal(parseReviewReport(VALID.replace("verdict: CHANGES_REQUESTED", "verdict: LGTM")).ok, false);
});

test("counts must name all three severities", () => {
  const result = parseReviewReport(VALID.replace("counts: critical=0 important=1 suggestion=2", "counts: critical=0 important=1"));
  assert.equal(result.ok, false);
  assert.match(result.error, /counts missing suggestion/);
});

test("the verdict must agree with the counts", () => {
  const approvedWithImportant = VALID.replace("verdict: CHANGES_REQUESTED", "verdict: APPROVED");
  assert.match(parseReviewReport(approvedWithImportant).error, /contradicts counts/);
  const changesWithNothing = VALID.replace("important=1", "important=0");
  assert.match(parseReviewReport(changesWithNothing).error, /contradicts counts/);
});

test("preflight is ready when every check passes", () => {
  const ctx = setup();
  const result = preflight({ cwd: ctx.repo, agentName: "review-abc", env: envFor(ctx), configPath: ctx.configPath });
  assert.equal(result.ready, true, JSON.stringify(result.checks));
  assert.ok(result.models.includes("default: openai-codex/gpt-6-luna:max"));
});

test("preflight reports each missing requirement by name", () => {
  const ctx = setup();
  const noHerdrEnv = preflight({ cwd: ctx.repo, env: envFor(ctx, { HERDR_ENV: "0" }), configPath: ctx.configPath });
  assert.equal(noHerdrEnv.checks.find((c) => c.name === "herdr-env").ok, false);

  const noOmp = preflight({ cwd: ctx.repo, env: { ...envFor(ctx), PATH: ctx.herdrOnly }, configPath: ctx.configPath });
  assert.equal(noOmp.checks.find((c) => c.name === "omp-binary").ok, false);
  assert.equal(noOmp.ready, false);

  const noKind = preflight({ cwd: ctx.repo, env: envFor(ctx, { STUB_NO_OMP_KIND: "1" }), configPath: ctx.configPath });
  assert.equal(noKind.checks.find((c) => c.name === "herdr-agent-kinds").ok, false);

  const noConfig = preflight({ cwd: ctx.repo, env: envFor(ctx), configPath: path.join(ctx.root, "missing.yml") });
  assert.equal(noConfig.checks.find((c) => c.name === "omp-config").ok, false);
});

test("preflight refuses an agent name that is already in use", () => {
  const ctx = setup();
  const env = envFor(ctx, { STUB_AGENTS: JSON.stringify([{ name: "review-abc" }]) });
  const result = preflight({ cwd: ctx.repo, agentName: "review-abc", env, configPath: ctx.configPath });
  assert.equal(result.checks.find((c) => c.name === "agent-name").ok, false);
});

test("the working-tree fingerprint changes when a tracked or untracked file changes", () => {
  const ctx = setup();
  const before = workingTreeFingerprint(ctx.repo);
  assert.equal(workingTreeFingerprint(ctx.repo), before);
  writeFileSync(path.join(ctx.repo, "new.txt"), "x\n");
  assert.notEqual(workingTreeFingerprint(ctx.repo), before);
});

test("the prompt carries the report path and the review-only contract", () => {
  const prompt = buildPrompt({ branch: "feat/x", base: "HEAD", reportPath: "/r/report.md", findingsPath: "/r/findings.md" });
  assert.match(prompt, /\/skill:code-review modified --review-only --report \/r\/report\.md/);
  assert.match(prompt, /^report: \/r\/report\.md$/m);
  assert.match(prompt, /Do not edit, create, or delete any file/);
});

test("a complete run returns the parsed report and leaves the tree untouched", () => {
  const ctx = setup();
  const result = runOmpReview({
    cwd: ctx.repo,
    env: envFor(ctx, { STUB_REPORT: VALID }),
    configPath: ctx.configPath,
    workingTimeoutMs: 1000,
  });
  assert.equal(result.status, "complete", JSON.stringify(result));
  assert.equal(result.report.counts.important, 1);
  const calls = readFileSync(ctx.logPath, "utf8");
  assert.match(calls, /tab create .*--no-focus/);
  assert.match(calls, /agent start review-\S+ --kind omp --pane w1:p9/);
});

test("the runner does not start the agent when preflight fails", () => {
  const ctx = setup();
  const result = runOmpReview({ cwd: ctx.repo, env: { ...envFor(ctx), HERDR_ENV: "0" }, configPath: ctx.configPath });
  assert.equal(result.status, "failed");
  assert.equal(result.reason, "preflight");
  assert.doesNotMatch(readFileSync(ctx.logPath, "utf8"), /tab create/);
});

test("a run where the agent never starts working fails loudly", () => {
  const ctx = setup();
  const result = runOmpReview({
    cwd: ctx.repo,
    env: envFor(ctx, { STUB_REPORT: VALID, STUB_NEVER_WORKING: "1" }),
    configPath: ctx.configPath,
    workingTimeoutMs: 1000,
  });
  assert.equal(result.status, "failed");
  assert.equal(result.reason, "herdr");
});

test("a run that modifies the working tree is a failure, even with a valid report", () => {
  const ctx = setup();
  const result = runOmpReview({
    cwd: ctx.repo,
    env: envFor(ctx, { STUB_REPORT: VALID, STUB_TOUCH: path.join(ctx.repo, "a.txt") }),
    configPath: ctx.configPath,
    workingTimeoutMs: 1000,
  });
  assert.equal(result.status, "failed");
  assert.equal(result.reason, "tree-modified");
});

test("a run whose agent went blocked is reported as blocked, not as a result", () => {
  const ctx = setup();
  const result = runOmpReview({
    cwd: ctx.repo,
    env: envFor(ctx, { STUB_REPORT: VALID, STUB_FINAL: "blocked" }),
    configPath: ctx.configPath,
    workingTimeoutMs: 1000,
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "agent-blocked");
});

test("a run that writes no report fails", () => {
  const ctx = setup();
  const result = runOmpReview({ cwd: ctx.repo, env: envFor(ctx), configPath: ctx.configPath, workingTimeoutMs: 1000 });
  assert.equal(result.status, "failed");
  assert.equal(result.reason, "no-report");
});

test("a malformed report is untrusted and fails the run", () => {
  const ctx = setup();
  const result = runOmpReview({
    cwd: ctx.repo,
    env: envFor(ctx, { STUB_REPORT: "looks good to me" }),
    configPath: ctx.configPath,
    workingTimeoutMs: 1000,
  });
  assert.equal(result.status, "failed");
  assert.equal(result.reason, "bad-report");
});

test("an agent-reported blocked run is returned as blocked with its report", () => {
  const ctx = setup();
  const blocked = VALID.replace("status: complete", "status: blocked")
    .replace("counts: critical=0 important=1 suggestion=2", "counts: critical=0 important=0 suggestion=0")
    .replace("verdict: CHANGES_REQUESTED", "verdict: APPROVED");
  const result = runOmpReview({
    cwd: ctx.repo,
    env: envFor(ctx, { STUB_REPORT: blocked }),
    configPath: ctx.configPath,
    workingTimeoutMs: 1000,
  });
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "agent-reported");
});
