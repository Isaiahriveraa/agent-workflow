import fs from 'node:fs';
import { ensureProjectContext } from './project-context.mjs';

const project = ensureProjectContext();

const starterDirs = [
  project.contextPaths.plans,
  project.contextPaths.research,
  project.contextPaths.handoffs,
];

for (const dir of starterDirs) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log(`Initialized local context at '${project.contextDir}'.`);
