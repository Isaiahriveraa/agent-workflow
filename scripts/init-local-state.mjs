import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Single source of truth: scripts/plan-server-path prints the plan server root
const planServerRoot = execFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'plan-server-path'),
  { encoding: 'utf8' }
).trim();

const repoName = (process.env.AGENTS_PROJECT_SLUG || path.basename(process.cwd())).replace(/[^a-zA-Z0-9_-]/g, '');

const starterDirs = [
  path.join(planServerRoot, 'projects', repoName, 'plans'),
  path.join(planServerRoot, 'projects', repoName, 'research'),
  path.join(planServerRoot, 'projects', repoName, 'handoffs'),
];

for (const dir of starterDirs) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log(`Initialized plan server project '${repoName}' state directories.`);
