#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(__dirname, '..');
const BRIDGE = path.join(AGENTS_ROOT, 'scripts', 'memory-sync-bridge.mjs');
const EVENT_NAME = process.argv[2] || 'SessionStart';

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

const payload = readJsonFromStdin();
const contextSummary = `cwd=${payload.cwd || payload.workspace?.current_dir || payload.workspace?.cwd || process.cwd()}`;
const args = ['inject', '--context-summary', contextSummary];
const promptText = inferPromptText(payload);

if (promptText) {
  args.push('--text', promptText);
}

const result = spawnSync('node', [BRIDGE, ...args], {
  encoding: 'utf8',
  env: process.env,
  timeout: 12000
});

if (result.status !== 0 || !result.stdout) {
  process.exit(0);
}

try {
  const parsed = JSON.parse(result.stdout);
  if (!parsed.additional_context || !parsed.additional_context.trim()) {
    process.exit(0);
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: EVENT_NAME,
      additionalContext: parsed.additional_context
    }
  }));
} catch {
  process.exit(0);
}
