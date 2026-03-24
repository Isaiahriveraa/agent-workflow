import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureProjectContext } from './project-context.mjs';

const project = ensureProjectContext();
const sessionsDir = project.thoughtPaths.sessions;
const indexPath = project.contextPaths.sessionIndex;

// ---------------------------------------------------------------------------
// Session metrics helpers
// ---------------------------------------------------------------------------

const metricsPath = (sessionId) => path.join(sessionsDir, `${sessionId}.metrics.json`);

const DEFAULT_METRICS = () => ({
  schema: 'session-metrics.v1',
  session_id: null,
  started_at: new Date().toISOString(),
  last_updated: new Date().toISOString(),
  edit_count: 0,
  command_count: 0,
  error_count: 0,
  tool_use_count: 0,
  subagents_spawned: 0,
  duration_seconds: 0,
});

export const initMetrics = (sessionId) => {
  const p = metricsPath(sessionId);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  ensureDir(sessionsDir);
  const m = { ...DEFAULT_METRICS(), session_id: sessionId };
  fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
  return m;
};

export const incrementMetric = (sessionId, field, delta = 1) => {
  const p = metricsPath(sessionId);
  const m = fs.existsSync(p)
    ? JSON.parse(fs.readFileSync(p, 'utf8'))
    : initMetrics(sessionId);
  m[field] = (m[field] ?? 0) + delta;
  m.last_updated = new Date().toISOString();
  // Compute duration from started_at
  m.duration_seconds = Math.round((Date.now() - new Date(m.started_at).getTime()) / 1000);
  fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
  return m;
};

export const readMetrics = (sessionId) => {
  const p = metricsPath(sessionId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
};


export const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

export const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'session';

const pad = (value) => String(value).padStart(2, '0');

export const timestampParts = (date = new Date()) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}-${minute}-${second}`,
    iso: date.toISOString()
  };
};

export const latestSessionFiles = () => {
  ensureDir(sessionsDir);
  return fs
    .readdirSync(sessionsDir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .reverse()
    .map((file) => path.join(sessionsDir, file));
};

export const createPath = (topic) => {
  const parts = timestampParts();
  return path.join(sessionsDir, `${parts.date}_${parts.time}_${slugify(topic)}.md`);
};

export const status = () => {
  if (!fs.existsSync(indexPath)) {
    return null;
  }

  const index = fs.readFileSync(indexPath, 'utf8');
  const latest = latestSessionFiles()[0] ?? null;
  return {
    index,
    latest
  };
};

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  const command = process.argv[2];

  if (command === 'create-path') {
    const topic = process.argv.slice(3).join(' ') || 'session';
    console.log(createPath(topic));
  } else if (command === 'status') {
    console.log(JSON.stringify(status(), null, 2));
  } else if (command === 'metrics') {
    const sub = process.argv[3]; // get | init | increment
    const sessionId = process.argv[4];
    if (!sessionId) {
      console.error('Usage: node scripts/session-tools.mjs metrics <get|init|increment> <session-id> [field] [delta]');
      process.exitCode = 1;
    } else if (sub === 'init') {
      console.log(JSON.stringify(initMetrics(sessionId), null, 2));
    } else if (sub === 'get') {
      const m = readMetrics(sessionId);
      console.log(JSON.stringify(m ?? { error: 'not found', session_id: sessionId }, null, 2));
    } else if (sub === 'increment') {
      const field = process.argv[5] ?? 'tool_use_count';
      const delta = Number(process.argv[6] ?? 1);
      console.log(JSON.stringify(incrementMetric(sessionId, field, delta), null, 2));
    } else {
      console.error(`Unknown metrics subcommand: ${sub}`);
      process.exitCode = 1;
    }
  } else {
    console.error('Usage: node scripts/session-tools.mjs <create-path|status|metrics> [args]');
    process.exitCode = 1;
  }
}
