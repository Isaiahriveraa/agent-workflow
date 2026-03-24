#!/usr/bin/env node
/**
 * gsd-pre-compact-archive.cjs — PreCompact hook
 *
 * Fires before context compaction. Serializes the current working set
 * (GSD phase, active plan, working files, recent decisions) to a
 * phase-checkpoint JSON via continuity-tools.mjs. This allows
 * post-compact restoration of working context.
 *
 * Hook event: PreCompact
 * Registration: add to ~/.claude/settings.json under "PreCompact"
 *   { "hooks": [{ "type": "command", "command": "node \"/Users/isaiahrivera/.agents/hooks/gsd-pre-compact-archive.cjs\"" }] }
 *
 * Output format: additionalContext injected into post-compact context
 * (see Claude Code hook spec for PreCompact return shape)
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(__dirname, '..');

const CONTINUITY_HELPER = path.join(AGENTS_ROOT, 'scripts', 'continuity-tools.mjs');

// ---------------------------------------------------------------------------
// Read state.md helpers
// ---------------------------------------------------------------------------

const readStateMd = () => {
  try {
    // Walk up from AGENTS_ROOT to find the project-local state.md
    const candidates = [
      path.join(process.cwd(), '.agents', 'contexts', 'state.md'),
      path.join(AGENTS_ROOT, '.agents', 'contexts', 'state.md'),
      path.join(os.homedir(), '.agents', '.agents', 'contexts', 'state.md')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    }
    return null;
  } catch (_) {
    return null;
  }
};

const readFirstBullet = (content, heading) => {
  if (!content) return 'unknown';
  const match = content.match(new RegExp(`${heading}\\n-\\s+(.*)`));
  return match ? match[1].trim() : 'unknown';
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let input = '';
// Timeout guard: exit silently if stdin stalls
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;

    if (!sessionId) {
      process.exit(0);
    }

    const state = readStateMd();
    const phase = readFirstBullet(state, '## Current Phase');
    const workflow = readFirstBullet(state, '## Current Workflow');
    const nextStep = readFirstBullet(state, '## Next Step');
    const relatedPlan = readFirstBullet(state, '## Related Plan');

    // Write a phase-checkpoint JSON before compaction fires
    const result = spawnSync(process.execPath, [
      CONTINUITY_HELPER,
      'phase-checkpoint',
      '--phase', `pre-compact: ${phase}`,
      '--workflow', workflow,
      '--plan', relatedPlan,
      '--session-id', sessionId,
      '--notes', `Auto-archived before context compaction. Next step: ${nextStep}`
    ], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    let checkpointPath = null;
    try {
      const out = JSON.parse(result.stdout ?? '{}');
      checkpointPath = out.checkpoint_path ?? null;
    } catch (_) { /* silent */ }

    // Inject restoration guide into post-compact additionalContext
    const restorationGuide = [
      `CONTEXT COMPACTION OCCURRED. Working state was archived before compaction.`,
      ``,
      `Archived state:`,
      `  Phase:        ${phase}`,
      `  Workflow:     ${workflow}`,
      `  Related Plan: ${relatedPlan}`,
      `  Next Step:    ${nextStep}`,
      checkpointPath ? `  Checkpoint:   ${checkpointPath}` : '',
      ``,
      `To restore context: read the checkpoint file above and resume from Next Step.`,
      `If using GSD: run /gsd:resume-work to pick up where you left off.`
    ].filter((l) => l !== undefined).join('\n');

    const output = {
      hookSpecificOutput: {
        hookEventName: 'PreCompact',
        additionalContext: restorationGuide
      }
    };

    process.stdout.write(JSON.stringify(output));
  } catch (_) {
    // Silent fail — never block compaction
    process.exit(0);
  }
});
