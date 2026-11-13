#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const modes = ['sprint', 'school-learn', 'school-fast', 'research', 'ideation', 'coding', 'tutor'];
const invokedName = path.basename(process.argv[1], '.mjs');
const args = process.argv.slice(2);
const mode = modes.includes(invokedName) ? invokedName : args.shift();
let harness = process.env.AGENT_HARNESS || 'pi';
if (args[0] === '--harness') {
  args.shift();
  harness = args.shift();
}
if (!modes.includes(mode) || !['pi', 'claude', 'codex'].includes(harness)) {
  console.error(`Usage: workflow-session ${modes.join('|')} [--harness pi|claude|codex] [harness arguments...]`);
  process.exit(2);
}

const profile = mode === 'coding' ? 'ship-fast' : mode;
let prompt;
try {
  prompt = `Workflow hub: ${root}\nActive session profile: ${mode}\n` +
    'Use this explicit session selection instead of inferring a mode. Resolve hub-relative references against the workflow hub above. AGENTS.md is already loaded by the harness.\n\n' +
    fs.readFileSync(path.join(root, 'profiles', `${profile}.md`), 'utf8');
} catch (error) {
  console.error(`workflow-session: ${error.message}`);
  process.exit(1);
}
const options = harness === 'codex'
  ? ['-c', `developer_instructions=${JSON.stringify(prompt)}`]
  : ['--append-system-prompt', prompt];
const child = spawn(harness, [...options, ...args], { stdio: 'inherit' });
child.on('error', error => {
  console.error(`workflow-session: cannot start ${harness}: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code;
});
