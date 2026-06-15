#!/usr/bin/env node

/**
 * herdr-multiplexer.mjs — herdr pane management for OMC team mode.
 *
 * Provides the same operations as tmux split/send/capture/kill but using
 * the herdr CLI over a local Unix socket. Designed as a drop-in backend
 * for OMC's tmux-session.ts alongside the existing cmux support.
 *
 * All functions throw on failure so callers can catch and fall back.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const HERDR_CMD = 'herdr';

// herdr pane IDs look like w<hex>-<number>, e.g. w653d8430378441-1
const HERDR_PANE_ID_RE = /^w[0-9a-f]+-\d+$/;

// ============================================================
// Context detection
// ============================================================

export function isHerdrContext(env = process.env) {
  return env.HERDR_ENV === '1';
}

export function isHerdrPaneId(value) {
  return typeof value === 'string' && HERDR_PANE_ID_RE.test(value.trim());
}

// ============================================================
// Low-level herdr CLI exec
// ============================================================

async function herdrExec(args, opts = {}) {
  const result = await execFileAsync(HERDR_CMD, args, {
    encoding: 'utf-8',
    ...opts,
  });
  return {
    stdout: typeof result.stdout === 'string' ? result.stdout : String(result.stdout ?? ''),
    stderr: typeof result.stderr === 'string' ? result.stderr : String(result.stderr ?? ''),
  };
}

async function herdrParseJson(args, opts = {}) {
  const result = await herdrExec(args, opts);
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    throw new Error(
      `herdr JSON parse error for \`herdr ${args.join(' ')}\`: ${e.message}\nstdout: ${result.stdout.slice(0, 500)}`,
    );
  }
}

// ============================================================
// Pane operations
// ============================================================

/**
 * Get the current (focused) pane ID from herdr.
 * Returns null if no focused pane found.
 */
export async function herdrGetCurrentPaneId() {
  const data = await herdrParseJson(['pane', 'list']);
  const panes = data?.result?.panes ?? [];
  const focused = panes.find(p => p.focused);
  return focused ? focused.pane_id : null;
}

/**
 * List all panes with their status.
 */
export async function herdrListPanes() {
  const data = await herdrParseJson(['pane', 'list']);
  return data?.result?.panes ?? [];
}

/**
 * Split a pane and return the new pane's ID.
 * @param {string} targetPaneId - existing pane to split
 * @param {'right'|'down'} direction
 * @returns {Promise<string>} new pane ID
 */
export async function herdrSplitPane(targetPaneId, direction, _cwd) {
  const data = await herdrParseJson([
    'pane', 'split', targetPaneId,
    '--direction', direction,
    '--no-focus',
  ]);
  const paneId = data?.result?.pane?.pane_id;
  if (!paneId) {
    throw new Error(`herdr split pane returned no pane_id for target=${targetPaneId} direction=${direction}`);
  }
  return paneId;
}

/**
 * Send text to a pane (no Enter).
 */
export async function herdrSendText(paneId, text) {
  await herdrExec(['pane', 'send-text', paneId, text]);
}

/**
 * Send key presses to a pane (e.g. 'Enter', 'C-c').
 */
export async function herdrSendKeys(paneId, key) {
  await herdrExec(['pane', 'send-keys', paneId, key]);
}

/**
 * Run a command in a pane (send text + Enter).
 */
export async function herdrRunCommand(paneId, command) {
  await herdrExec(['pane', 'run', paneId, command]);
}

/**
 * Read recent pane output.
 * @param {string} paneId
 * @param {number} [lines=80]
 * @param {'recent'|'visible'} [source='recent']
 * @returns {Promise<string>}
 */
export async function herdrReadPane(paneId, lines = 80, source = 'recent') {
  const result = await herdrExec([
    'pane', 'read', paneId,
    '--source', source,
    '--lines', String(lines),
  ]);
  return result.stdout;
}

/**
 * Close (kill) a pane.
 */
export async function herdrClosePane(paneId) {
  await herdrExec(['pane', 'close', paneId]);
}

// ============================================================
// Wait / status operations
// ============================================================

/**
 * Wait for an agent to reach a specific status.
 * Returns true if status reached, false on timeout.
 */
export async function herdrWaitAgentStatus(paneId, status, timeoutMs = 120_000) {
  try {
    await herdrExec([
      'wait', 'agent-status', paneId,
      '--status', status,
      '--timeout', String(timeoutMs),
    ]);
    return true;
  } catch (e) {
    // Timeout or error
    return false;
  }
}

/**
 * Wait for output to contain a match string.
 * Returns true if match found, false on timeout.
 */
export async function herdrWaitOutput(paneId, match, timeoutMs = 60_000, regex = false) {
  try {
    const args = [
      'wait', 'output', paneId,
      '--match', match,
      '--timeout', String(timeoutMs),
    ];
    if (regex) args.push('--regex');
    await herdrExec(args);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a pane's agent status from herdr.
 * Returns one of: 'idle', 'working', 'done', 'blocked', 'unknown'.
 */
export async function herdrGetAgentStatus(paneId) {
  try {
    const panes = await herdrListPanes();
    const pane = panes.find(p => p.pane_id === paneId);
    return pane?.agent_status ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Check if a pane is alive and has a running process.
 */
export async function herdrIsPaneAlive(paneId) {
  const status = await herdrGetAgentStatus(paneId);
  return status !== 'unknown';
}
