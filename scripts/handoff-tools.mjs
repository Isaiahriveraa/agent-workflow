import fs from 'node:fs';
import path from 'node:path';
import { ensureProjectContext } from './project-context.mjs';

const project = ensureProjectContext();
const handoffsRoot = project.thoughtPaths.handoffs;

const listMarkdownFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort();
};

export const resolveHandoff = (input) => {
  if (!input) {
    throw new Error('resolve requires a handoff path or ticket');
  }

  if (path.isAbsolute(input)) {
    if (!fs.existsSync(input)) {
      throw new Error(`Handoff path does not exist: ${input}`);
    }
    return {
      mode: 'path',
      path: input,
      candidates: [input]
    };
  }

  const ticketDir = path.join(handoffsRoot, input);
  const candidates = listMarkdownFiles(ticketDir).map((name) => path.join(ticketDir, name));

  if (candidates.length === 0) {
    return {
      mode: 'ticket',
      ticket: input,
      path: null,
      candidates: []
    };
  }

  return {
    mode: 'ticket',
    ticket: input,
    path: candidates[candidates.length - 1],
    candidates
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  try {
    if (command === 'resolve') {
      const input = process.argv[3];
      console.log(JSON.stringify(resolveHandoff(input), null, 2));
    } else {
      console.error('Usage: node scripts/handoff-tools.mjs resolve <path|ticket>');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
