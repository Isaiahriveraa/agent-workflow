// OMP review runner: dispatches a code review to an OMP agent in a Herdr tab
// and reads back a REVIEW-REPORT v1 block. Deterministic steps live here so no
// model context is spent on preflight or dispatch.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPORT_HEADER = 'REVIEW-REPORT v1';
const STATUSES = ['complete', 'blocked', 'failed'];
const VERDICTS = ['CHANGES_REQUESTED', 'APPROVED'];
const COUNT_KEYS = ['critical', 'important', 'suggestion'];

// Parses the fixed REVIEW-REPORT v1 block. Returns { ok, report } or { ok: false, error }.
// A verdict must agree with the counts: CHANGES_REQUESTED iff critical or important > 0.
export const parseReviewReport = (text) => {
  const lines = String(text ?? '').split(/\r?\n/).map((line) => line.trim());
  const start = lines.indexOf(REPORT_HEADER);
  if (start === -1) return { ok: false, error: `missing "${REPORT_HEADER}" header` };

  const fields = {};
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^(run|status|findings|counts|verdict):\s*(.*)$/);
    if (match && !(match[1] in fields)) fields[match[1]] = match[2];
  }
  for (const key of ['run', 'status', 'findings', 'counts', 'verdict']) {
    if (!fields[key]) return { ok: false, error: `missing field: ${key}` };
  }
  if (!STATUSES.includes(fields.status)) return { ok: false, error: `bad status: ${fields.status}` };
  if (!VERDICTS.includes(fields.verdict)) return { ok: false, error: `bad verdict: ${fields.verdict}` };

  const counts = {};
  for (const key of COUNT_KEYS) {
    const match = fields.counts.match(new RegExp(`\\b${key}=(\\d+)\\b`));
    if (!match) return { ok: false, error: `counts missing ${key}` };
    counts[key] = Number(match[1]);
  }
  const blocking = counts.critical + counts.important > 0;
  if (blocking !== (fields.verdict === 'CHANGES_REQUESTED')) {
    return { ok: false, error: `verdict ${fields.verdict} contradicts counts` };
  }

  return {
    ok: true,
    report: { run: fields.run, status: fields.status, findings: fields.findings, counts, verdict: fields.verdict }
  };
};

// Returns the modelRoles block of the OMP config verbatim, so the preflight can
// show exactly which models will run.
const readModelRoles = (configPath) => {
  const lines = fs.readFileSync(configPath, 'utf8').split('\n');
  const start = lines.findIndex((line) => /^modelRoles:/.test(line));
  if (start === -1) return [];
  const block = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() !== '' && !/^\s/.test(line)) break;
    if (line.trim()) block.push(line.trim());
  }
  return block;
};

const commandExists = (name, env) =>
  (env.PATH ?? '').split(path.delimiter).some((dir) => {
    try {
      fs.accessSync(path.join(dir, name), fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });

const herdr = (args, { env = process.env, timeout = 60_000 } = {}) =>
  execFileSync('herdr', args, { env, encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });

const collectNames = (value, names = []) => {
  if (value && typeof value === 'object') {
    if (typeof value.name === 'string') names.push(value.name);
    for (const child of Object.values(value)) collectNames(child, names);
  }
  return names;
};

const findAgentStatus = (value) => {
  if (value && typeof value === 'object') {
    if (typeof value.agent_status === 'string') return value.agent_status;
    for (const child of Object.values(value)) {
      const found = findAgentStatus(child);
      if (found) return found;
    }
  }
  return null;
};

const findRootPane = (value) => {
  if (value && typeof value === 'object') {
    if (value.root_pane?.pane_id) return value.root_pane.pane_id;
    for (const child of Object.values(value)) {
      const found = findRootPane(child);
      if (found) return found;
    }
  }
  return null;
};

// Preflight: every check is reported, so a not-ready result says exactly why.
export const preflight = ({
  cwd,
  agentName,
  env = process.env,
  configPath = path.join(os.homedir(), '.omp', 'agent', 'config.yml')
} = {}) => {
  const checks = [];
  const check = (name, ok, detail) => checks.push({ name, ok, detail });

  check('herdr-env', env.HERDR_ENV === '1', 'HERDR_ENV must be 1 (run inside a Herdr pane)');
  check('herdr-binary', commandExists('herdr', env), 'herdr on PATH');
  check('omp-binary', commandExists('omp', env), 'omp on PATH');

  try {
    const help = herdr(['agent', 'start', '--help'], { env });
    const values = help.match(/possible values:\s*([^\]]+)\]/);
    const kinds = values ? values[1].split(',').map((v) => v.trim()) : [];
    check('herdr-agent-kinds', kinds.includes('omp'), 'herdr agent start accepts --kind omp');
  } catch (error) {
    check('herdr-agent-kinds', false, `herdr agent start --help failed: ${error.message}`);
  }

  let roles = [];
  try {
    roles = readModelRoles(configPath);
    check('omp-config', roles.length > 0, `${configPath} has a modelRoles block`);
  } catch (error) {
    check('omp-config', false, `cannot read ${configPath}: ${error.message}`);
  }

  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    check('git-repo', true, cwd);
  } catch {
    check('git-repo', false, `${cwd} is not a git work tree`);
  }

  if (agentName) {
    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(agentName)) {
      check('agent-name', false, `invalid agent name: ${agentName}`);
    } else {
      try {
        const taken = collectNames(JSON.parse(herdr(['agent', 'list'], { env }))).includes(agentName);
        check('agent-name', !taken, taken ? `${agentName} is already in use` : `${agentName} is free`);
      } catch (error) {
        check('agent-name', false, `herdr agent list failed: ${error.message}`);
      }
    }
  }

  return { ready: checks.every((c) => c.ok), checks, models: roles };
};

// Fingerprint of the working tree without touching the index: tracked diff plus
// the bytes of every untracked file. Ignored files and .git are excluded by Git.
export const workingTreeFingerprint = (cwd) => {
  const hash = createHash('sha256');
  hash.update(execFileSync('git', ['diff', 'HEAD'], { cwd, maxBuffer: 256 * 1024 * 1024 }));
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd })
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .sort();
  for (const file of untracked) {
    const full = path.join(cwd, file);
    const stat = fs.lstatSync(full);
    hash.update(`\0${file}\0`);
    if (stat.isSymbolicLink()) hash.update(`link:${fs.readlinkSync(full)}`);
    else if (stat.isFile()) hash.update(fs.readFileSync(full));
    else hash.update('other');
  }
  return hash.digest('hex');
};

// The prompt is a file so the OMP agent reads the full contract and the Herdr
// message stays one short line.
export const buildPrompt = ({ branch, base, reportPath, findingsPath }) => `# OMP code review

branch: ${branch}
base: ${base}
report: ${reportPath}
findings: ${findingsPath}

Run the code review on the working tree in review-only mode:

  /skill:code-review modified --review-only --report ${reportPath}

If the skill cannot load, read ~/.agents/skills/code-review/SKILL.md and follow
only Steps 1, 2, and 4-7. Do not run the hardener, complexity revision, fixer,
or QA steps. Do not edit, create, or delete any file in the repository.

When finished, write the findings to ${findingsPath}, then write this exact
block to ${reportPath}, and reply with the same block:

REVIEW-REPORT v1
run: ${branch}
status: complete | blocked | failed
findings: ${findingsPath}
counts: critical=<n> important=<n> suggestion=<n>
verdict: CHANGES_REQUESTED | APPROVED
`;

const gitDirOf = (cwd) => {
  const out = execFileSync('git', ['rev-parse', '--git-dir'], { cwd, encoding: 'utf8' }).trim();
  return path.resolve(cwd, out);
};

const currentBranch = (cwd) =>
  execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8' }).trim();

// Runs one review end to end. Every failure returns a result with status
// "failed" or "blocked"; nothing counts as a finding unless the report parses.
export const runOmpReview = ({
  cwd,
  base = 'HEAD',
  waitTimeoutMs = 1_800_000,
  startTimeoutMs = 30_000,
  workingTimeoutMs = 15_000,
  env = process.env,
  configPath
} = {}) => {
  const runId = Date.now().toString(36);
  const agentName = `review-${runId}`;
  const pre = preflight({ cwd, agentName, env, configPath });
  if (!pre.ready) {
    return { status: 'failed', reason: 'preflight', checks: pre.checks };
  }

  const runDir = path.join(gitDirOf(cwd), 'omp-review', runId);
  fs.mkdirSync(runDir, { recursive: true });
  const reportPath = path.join(runDir, 'report.md');
  const findingsPath = path.join(runDir, 'findings.md');
  const promptPath = path.join(runDir, 'prompt.md');
  fs.writeFileSync(promptPath, buildPrompt({ branch: currentBranch(cwd), base, reportPath, findingsPath }));

  const before = workingTreeFingerprint(cwd);

  let pane;
  try {
    const tab = JSON.parse(herdr(['tab', 'create', '--cwd', cwd, '--label', agentName, '--no-focus'], { env }));
    pane = findRootPane(tab);
    if (!pane) return { status: 'failed', reason: 'tab-create', detail: 'no root pane in response' };
    herdr(['agent', 'start', agentName, '--kind', 'omp', '--pane', pane, '--timeout', String(startTimeoutMs)], {
      env,
      timeout: startTimeoutMs + 30_000
    });
    herdr(['agent', 'prompt', agentName, `Read ${promptPath} and follow it exactly.`], { env });
    herdr(['agent', 'wait', agentName, '--until', 'working', '--timeout', String(workingTimeoutMs)], {
      env,
      timeout: workingTimeoutMs + 30_000
    });
    herdr(
      ['agent', 'wait', agentName, '--until', 'idle', '--until', 'done', '--until', 'blocked', '--timeout', String(waitTimeoutMs)],
      { env, timeout: waitTimeoutMs + 60_000 }
    );
  } catch (error) {
    return { status: 'failed', reason: 'herdr', detail: String(error.stderr || error.message).trim(), pane, agent: agentName, runDir };
  }

  let finalState;
  try {
    finalState = findAgentStatus(JSON.parse(herdr(['agent', 'get', agentName], { env })));
  } catch (error) {
    return { status: 'failed', reason: 'herdr', detail: `agent get failed: ${error.message}`, pane, agent: agentName, runDir };
  }
  if (workingTreeFingerprint(cwd) !== before) {
    return { status: 'failed', reason: 'tree-modified', detail: 'working tree changed during an observe-only review', agent: agentName, runDir };
  }
  if (finalState === 'blocked') {
    return { status: 'blocked', reason: 'agent-blocked', detail: 'OMP is waiting on a dialog; read the pane and answer it yourself', pane, agent: agentName, runDir };
  }
  if (!fs.existsSync(reportPath)) {
    return { status: 'failed', reason: 'no-report', detail: `${reportPath} was not written`, agent: agentName, runDir };
  }

  const parsed = parseReviewReport(fs.readFileSync(reportPath, 'utf8'));
  if (!parsed.ok) {
    return { status: 'failed', reason: 'bad-report', detail: parsed.error, findings: findingsPath, agent: agentName, runDir };
  }
  const { report } = parsed;
  if (report.status !== 'complete') {
    return { status: report.status, reason: 'agent-reported', report, agent: agentName, runDir };
  }
  return { status: 'complete', report, pane, agent: agentName, runDir };
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const [command, ...rest] = process.argv.slice(2);
  const flag = (name, fallback) => {
    const index = rest.indexOf(`--${name}`);
    return index === -1 ? fallback : rest[index + 1];
  };
  const cwd = process.cwd();
  try {
    if (command === 'preflight') {
      const result = preflight({ cwd });
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.ready ? 0 : 1;
    } else if (command === 'run') {
      const result = runOmpReview({ cwd, base: flag('base', 'HEAD') });
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.status === 'complete' ? 0 : 1;
    } else {
      console.error('Usage: node scripts/omp-review.mjs <preflight|run> [--base <ref>]');
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
