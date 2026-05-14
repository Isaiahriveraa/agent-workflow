#!/usr/bin/env node

/**
 * mempalace-context.cjs — MemPalace session injection hook.
 *
 * Calls mempalace (Python) to retrieve wake-up context (identity, preferences,
 * project overview) and optionally search for query-specific memories.
 *
 * Hook output format (stdout JSON):
 *   { hookSpecificOutput: { hookEventName, additionalContext } }
 *
 * Compatible with claude-code, codex, and opencode session-start lifecycle.
 * If mempalace isn't installed or AGENTS_MEMPALACE_ENABLED is falsy, exits silently.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MEMPALACE_PYTHON = process.env.AGENTS_MEMPALACE_PYTHON || '/opt/homebrew/bin/python3.13';
const EVENT_NAME = process.argv[2] || 'SessionStart';
const MAX_WAKEUP_LINES = 80;
const MAX_SEARCH_RESULTS = 3;

// ── Helpers ──────────────────────────────────────────────

const readJsonFromStdin = () => {
  try {
    return JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
  } catch {
    return {};
  }
};

const extractText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join(' ');
  if (typeof value === 'object') {
    return [value.text, value.prompt, value.message, value.user_prompt, value.userMessage, value.query, value.content]
      .map(extractText)
      .filter(Boolean)
      .join(' ');
  }
  return '';
};

const inferPromptText = (payload) => {
  const candidates = [
    payload.prompt,
    payload.user_prompt,
    payload.userMessage,
    payload.message,
    payload.text,
    payload.last_user_message,
    payload.input,
    payload.arguments
  ];
  return candidates.map(extractText).find(Boolean) || '';
};

const runPython = (args, input) => {
  return spawnSync(MEMPALACE_PYTHON, args, {
    input,
    encoding: 'utf8',
    env: process.env,
    timeout: 15000,
  });
};

const stripAnsi = (text) => text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

// ── Main ──────────────────────────────────────────────────

// Skip if explicitly disabled
if (process.env.AGENTS_MEMPALACE_ENABLED && !['1', 'true', 'yes', 'on'].includes(process.env.AGENTS_MEMPALACE_ENABLED.toLowerCase())) {
  process.exit(0);
}

// Check mempalace is installed
const check = runPython(['-c', 'import importlib.util,sys; sys.exit(0 if importlib.util.find_spec("mempalace") else 1)']);
if (check.status !== 0) {
  process.exit(0);
}

const payload = readJsonFromStdin();
const contexts = [];
const cwd = payload.cwd || payload.workspace?.current_dir || payload.workspace?.cwd || process.cwd();

// 1. Always get wake-up context (identity, preferences, project overview)
const wakeUp = runPython(['-m', 'mempalace', 'wake-up']);
if (wakeUp.status === 0 && wakeUp.stdout) {
  const clean = stripAnsi(wakeUp.stdout);
  const lines = clean.split('\n').filter(Boolean);
  const wakeContext = lines.slice(0, MAX_WAKEUP_LINES).join('\n');
  if (wakeContext.length > 80) {
    contexts.push(`<context source="mempalace-wakeup">\n${wakeContext}\n</context>`);
  }
}

// 2. If there's a prompt, search mempalace for relevant memories
const promptText = inferPromptText(payload);
if (promptText && promptText.length > 10) {
  const search = runPython(['-m', 'mempalace', 'search', promptText]);
  if (search.status === 0 && search.stdout) {
    const clean = stripAnsi(search.stdout);
    // Extract the result blocks (each starts with [N])
    const blocks = clean.split(/\n\s*────────────────────────────────────────\n/);
    if (blocks.length > 0) {
      // Skip the header, take up to MAX_SEARCH_RESULTS blocks
      const resultBlocks = blocks.slice(0, MAX_SEARCH_RESULTS + 1).filter(b => b.includes('Source:'));
      if (resultBlocks.length > 0) {
        const searchContext = resultBlocks.slice(0, MAX_SEARCH_RESULTS).join('\n---\n');
        contexts.push(`<context source="mempalace-search" query="${promptText.slice(0, 120)}">\n${searchContext}\n</context>`);
      }
    }
  }
}

// 3. Combine and output
const additionalContext = contexts.join('\n\n');

if (!additionalContext.trim()) {
  process.exit(0);
}

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: EVENT_NAME,
    additionalContext,
    sources: contexts.map(c => c.match(/source="([^"]+)"/)?.[1] || 'unknown').join(', '),
  }
}));
