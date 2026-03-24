#!/usr/bin/env node
/**
 * gsd-subagent-tracker.cjs — PostToolUse hook
 *
 * Tracks when the main agent spawns a subagent (e.g. by calling 'agent', 'call_subagent',
 * or via an MCP proxy that mentions subagents). Increments 'subagents_spawned' 
 * in the session metrics and appends a record to state.md under ## Subagent Activity.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(__dirname, '..');
const SESSION_TOOLS = path.join(AGENTS_ROOT, 'scripts', 'session-tools.mjs');

const fireMetricIncrement = (sessionId, field) => {
  try {
    const child = spawn(process.execPath, [SESSION_TOOLS, 'metrics', 'increment', sessionId, field], {
      detached: false,
      stdio: 'ignore',
      env: process.env
    });
    child.unref();
  } catch (_) {}
};

const updateStateMd = (subagentDescription) => {
  try {
    const candidates = [
      path.join(process.cwd(), '.agents', 'contexts', 'state.md'),
      path.join(AGENTS_ROOT, '.agents', 'contexts', 'state.md'),
      path.join(os.homedir(), '.agents', '.agents', 'contexts', 'state.md')
    ];
    let statePath = null;
    let content = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) { 
        statePath = p;
        content = fs.readFileSync(p, 'utf8'); 
        break; 
      }
    }
    if (!statePath || !content) return;

    const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const logLine = `\n- [${stamp}] Subagent spawned: ${subagentDescription}`;
    
    if (content.includes('## Subagent Activity')) {
      const updated = content.replace('## Subagent Activity', '## Subagent Activity' + logLine);
      fs.writeFileSync(statePath, updated);
    } else {
      fs.appendFileSync(statePath, '\n## Subagent Activity\n' + logLine + '\n');
    }
  } catch (_) {}
};

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;

    if (!sessionId) {
      process.exit(0);
    }

    const toolName = data.tool_name ?? data.name ?? data.toolUse?.name ?? '';
    const desc = data.tool_input ?? data.input ?? data.toolUse?.input ?? {};
    const inputStr = typeof desc === 'string' ? desc : JSON.stringify(desc);

    const isSubagent = 
      toolName.includes('subagent') || 
      toolName === 'agent' ||
      (toolName.includes('mcp') && inputStr.includes('subagent'));

    if (isSubagent) {
      fireMetricIncrement(sessionId, 'subagents_spawned');

      let brief = toolName;
      if (desc.command) brief += ` (${desc.command})`;
      else if (desc.task) brief += ` (task: ${String(desc.task).slice(0, 40)}...)`;
      else brief += ' (unknown payload)';

      updateStateMd(brief);
    }

    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
