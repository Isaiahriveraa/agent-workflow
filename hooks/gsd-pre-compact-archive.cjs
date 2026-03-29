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
const AUTONOMY_TOOLS = path.join(AGENTS_ROOT, 'scripts', 'autonomy-tools.mjs');
const DOCTOR_TOOLS = path.join(AGENTS_ROOT, 'scripts', 'doctor.mjs');
const readExecutionState = () => {
  try {
    const candidates = [
      path.join(process.cwd(), '.agents', 'runtime', 'execution', 'active.json'),
      path.join(AGENTS_ROOT, '.agents', 'runtime', 'execution', 'active.json'),
      path.join(os.homedir(), '.agents', '.agents', 'runtime', 'execution', 'active.json')
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return {
          path: candidate,
          state: JSON.parse(fs.readFileSync(candidate, 'utf8'))
        };
      }
    }
    return null;
  } catch (_) {
    return null;
  }
};

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

const readAutonomyDecision = () => {
  try {
    const result = spawnSync(process.execPath, [AUTONOMY_TOOLS, 'evaluate'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 1500,
      env: process.env
    });
    if (result.status !== 0 || !result.stdout) return null;
    return JSON.parse(result.stdout);
  } catch (_) {
    return null;
  }
};

const readDoctorReport = () => {
  try {
    const result = spawnSync(process.execPath, [DOCTOR_TOOLS, 'report'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 1500,
      env: process.env
    });
    if (result.status !== 0 || !result.stdout) return null;
    return JSON.parse(result.stdout);
  } catch (_) {
    return null;
  }
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
    const execution = readExecutionState();
    const currentTask = execution?.state?.current_task_key ?? 'none';
    const executionPlan = execution?.state?.active_plan ?? null;
    const checkpointPlan = executionPlan || relatedPlan;
    const autonomyDecision = readAutonomyDecision();
    const doctorReport = readDoctorReport();
    const doctorWarnings = Array.isArray(doctorReport?.warnings) ? doctorReport.warnings : [];
    const doctorNextCommand = doctorReport?.recommended_next_command ?? null;
    const autonomyRecommendation = autonomyDecision?.recommended_action ?? null;
    const autonomyReason = autonomyDecision?.reason ?? null;
    const noteParts = [
      `Auto-archived before context compaction.`,
      `Next step: ${nextStep}.`,
      `Current task: ${currentTask}.`
    ];
    if (executionPlan && executionPlan !== relatedPlan) {
      noteParts.push(`Execution plan overrides related plan: ${executionPlan}.`);
    }
    if (autonomyRecommendation) {
      noteParts.push(`Autonomy recommends ${autonomyRecommendation}.`);
    }
    if (doctorNextCommand) {
      noteParts.push(`Doctor next command: ${doctorNextCommand}.`);
    }

    // Write a phase-checkpoint JSON before compaction fires
    const result = spawnSync(process.execPath, [
      CONTINUITY_HELPER,
      'phase-checkpoint',
      '--phase', `pre-compact: ${phase}`,
      '--workflow', workflow,
      '--plan', checkpointPlan,
      '--session-id', sessionId,
      '--notes', noteParts.join(' ')
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
      executionPlan ? `  Execution Plan:${executionPlan === relatedPlan ? ' ' : ''} ${executionPlan}` : '',
      `  Next Step:    ${nextStep}`,
      execution ? `  Execution:    ${execution.path}` : '',
      execution ? `  Task:         ${currentTask}` : '',
      autonomyRecommendation ? `  Autonomy:     ${autonomyRecommendation}` : '',
      autonomyReason ? `  Why:          ${autonomyReason}` : '',
      doctorWarnings[0] ? `  Doctor Warn:  ${doctorWarnings[0]}` : '',
      doctorNextCommand ? `  Next Command: ${doctorNextCommand}` : '',
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
