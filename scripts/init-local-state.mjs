import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const starterDirs = [
  path.join(repoRoot, 'thoughts', 'plans'),
  path.join(repoRoot, 'thoughts', 'research'),
  path.join(repoRoot, 'thoughts', 'shared', 'handoffs'),
  path.join(repoRoot, 'projects')
];

for (const dir of starterDirs) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log('Initialized local runtime state directories.');
