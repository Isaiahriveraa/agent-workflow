import fs from 'node:fs';
import path from 'node:path';
import { ensureProjectContext } from './project-context.mjs';

const project = ensureProjectContext();
const sessionsDir = project.thoughtPaths.sessions;
const indexPath = project.contextPaths.sessionIndex;

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'session';

const pad = (value) => String(value).padStart(2, '0');

const timestampParts = (date = new Date()) => {
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

const latestSessionFiles = () => {
  ensureDir(sessionsDir);
  return fs
    .readdirSync(sessionsDir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .reverse()
    .map((file) => path.join(sessionsDir, file));
};

const createPath = (topic) => {
  const parts = timestampParts();
  return path.join(sessionsDir, `${parts.date}_${parts.time}_${slugify(topic)}.md`);
};

const status = () => {
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

const command = process.argv[2];

if (command === 'create-path') {
  const topic = process.argv.slice(3).join(' ') || 'session';
  console.log(createPath(topic));
} else if (command === 'status') {
  console.log(JSON.stringify(status(), null, 2));
} else {
  console.error('Usage: node scripts/session-tools.mjs <create-path|status> [topic]');
  process.exitCode = 1;
}
