#!/usr/bin/env node
// Context Monitor - PostToolUse/AfterTool hook (Gemini uses AfterTool)
// Reads context metrics from the statusline bridge file and injects
// warnings when context usage is high. This makes the AGENT aware of
// context limits (the statusline only shows the user).
//
// How it works:
// 1. The statusline hook writes metrics to /tmp/claude-ctx-{session_id}.json
// 2. This hook reads those metrics after each tool use
// 3. When remaining context drops below thresholds, it injects a warning
//    as additionalContext, which the agent sees in its conversation
//
// Thresholds:
//   WARNING  (remaining <= 35%): Agent should wrap up current task
//   CRITICAL (remaining <= 25%): Agent should stop immediately and save state
//
// Debounce: 5 tool uses between warnings to avoid spam
// Severity escalation bypasses debounce (WARNING -> CRITICAL fires immediately)

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const WARNING_THRESHOLD = 35;  // remaining_percentage <= 35%
const CRITICAL_THRESHOLD = 25; // remaining_percentage <= 25%
const STALE_SECONDS = 60;      // ignore metrics older than 60s
const DEBOUNCE_CALLS = 5;      // min tool uses between warnings
const AUTOMATION_MODE = process.env.AGENTS_CONTINUITY_AUTOMATION ?? 'handoff';
const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(__dirname, '..');
const CONTINUITY_HELPER = process.env.AGENTS_CONTINUITY_HELPER
  ? path.resolve(process.env.AGENTS_CONTINUITY_HELPER)
  : path.join(AGENTS_ROOT, 'scripts', 'continuity-tools.mjs');
const SESSION_TOOLS = path.join(AGENTS_ROOT, 'scripts', 'session-tools.mjs');

// Fire-and-forget metric increment — never blocks tool execution
const fireMetricIncrement = (sessionId, field) => {
  try {
    const child = spawn(process.execPath, [SESSION_TOOLS, 'metrics', 'increment', sessionId, field], {
      detached: false,
      stdio: 'ignore',
      env: process.env
    });
    child.unref();
  } catch (_) {
    // Silent fail — metrics are advisory only
  }
};

// ---------------------------------------------------------------------------
// Anti-Drift: File scope validation
// Reads the active plan from state.md and checks if currently modified files
// (via git status) are within the plan's declared scope boundaries.
// ---------------------------------------------------------------------------

const getActivePlanPath = () => {
  try {
    const candidates = [
      path.join(process.cwd(), '.agents', 'contexts', 'state.md'),
      path.join(AGENTS_ROOT, '.agents', 'contexts', 'state.md'),
      path.join(os.homedir(), '.agents', '.agents', 'contexts', 'state.md')
    ];
    let state = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) { state = fs.readFileSync(p, 'utf8'); break; }
    }
    if (!state) return null;
    const match = state.match(/## Related Plan\n-\s+(.*)/);
    const plan = match ? match[1].trim() : null;
    return (plan && plan !== 'none') ? path.resolve(plan) : null;
  } catch (_) { return null; }
};

const getModifiedFiles = () => {
  try {
    // Check locally modified or staged files
    const result = require('child_process').spawnSync('git', ['status', '--porcelain'], { cwd: process.cwd(), encoding: 'utf8' });
    if (result.status !== 0) return [];
    return (result.stdout || '').split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.substring(3).trim()) // Remove XY status string
      .map(file => path.resolve(process.cwd(), file));
  } catch (_) { return []; }
};

const detectDrift = (sessionId) => {
  const planPath = getActivePlanPath();
  if (!planPath || !fs.existsSync(planPath)) return null;

  // Retrieve metrics to only check drift every N tool uses to save CPU
  try {
    const metricsPath = path.join(os.tmpdir(), `claude-ctx-${sessionId}.json`);
    const metrics = fs.existsSync(metricsPath) ? JSON.parse(fs.readFileSync(metricsPath, 'utf8')) : {};
    const calls = metrics.tool_use_count ?? 0;
    // Debounce: check drift every 5 calls
    if (calls % 5 !== 0) return null;
  } catch (_) { return null; }

  const modified = getModifiedFiles();
  if (modified.length === 0) return null;

  try {
    const planContent = fs.readFileSync(planPath, 'utf8');
    // Extract file targets formatted as markdown links or code blocks
    const targetPattern = /\[.*?\]\((file:\/\/\/.*?)\)|`(.*?)`/g;
    const targets = new Set();
    let match;
    while ((match = targetPattern.exec(planContent)) !== null) {
      const p = match[1] ? match[1].replace('file://', '') : match[2];
      if (p && !p.includes(' ')) targets.add(path.resolve(process.cwd(), p));
    }

    // Identify drift: modified files not mentioned in the plan
    const drifted = modified.filter(f => !targets.has(f) && !f.includes('/.agents/') && !f.includes('/.planning/'));
    
    if (drifted.length > 0) {
      return `ANTI-DRIFT WARNING: You are modifying files that are out of scope for the current plan.\n` +
             `Plan: ${path.basename(planPath)}\n` +
             `Drifted files:\n${drifted.map(f => `  - ${path.basename(f)}`).join('\n')}\n\n` +
             `Correction needed: If these changes are necessary, update the plan first. Otherwise, revert them to maintain strict scope.`;
    }
  } catch (_) { return null; }

  return null;
};



let input = '';
// Timeout guard: if stdin doesn't close within 3s (e.g. pipe issues on
// Windows/Git Bash), exit silently instead of hanging until Claude Code
// kills the process and reports "hook error". See #775.
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

    // Always increment tool_use_count, regardless of context level
    fireMetricIncrement(sessionId, 'tool_use_count');
    // Increment error_count when the tool response indicates failure
    const toolResponse = data.tool_response ?? data.response ?? null;
    if (toolResponse && typeof toolResponse === 'object' && toolResponse.is_error) {
      fireMetricIncrement(sessionId, 'error_count');
    }

    const tmpDir = os.tmpdir();
    const metricsPath = path.join(tmpDir, `claude-ctx-${sessionId}.json`);

    // If no metrics file, this is a subagent or fresh session -- exit silently
    if (!fs.existsSync(metricsPath)) {
      process.exit(0);
    }

    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    const now = Math.floor(Date.now() / 1000);

    // Ignore stale metrics
    if (metrics.timestamp && (now - metrics.timestamp) > STALE_SECONDS) {
      process.exit(0);
    }

    const remaining = metrics.remaining_percentage;
    const usedPct = metrics.used_pct ?? (typeof remaining === 'number' ? 100 - remaining : 0);

    // No warning needed
    if (remaining > WARNING_THRESHOLD) {
      process.exit(0);
    }

    // Debounce: check if we warned recently
    const warnPath = path.join(tmpDir, `claude-ctx-${sessionId}-warned.json`);
    let warnData = { callsSinceWarn: 0, lastLevel: null };
    let firstWarn = true;

    if (fs.existsSync(warnPath)) {
      try {
        warnData = JSON.parse(fs.readFileSync(warnPath, 'utf8'));
        firstWarn = false;
      } catch (e) {
        // Corrupted file, reset
      }
    }

    warnData.callsSinceWarn = (warnData.callsSinceWarn || 0) + 1;

    const isCritical = remaining <= CRITICAL_THRESHOLD;
    const currentLevel = isCritical ? 'critical' : 'warning';

    // Emit immediately on first warning, then debounce subsequent ones
    // Severity escalation (WARNING -> CRITICAL) bypasses debounce
    const severityEscalated = currentLevel === 'critical' && warnData.lastLevel === 'warning';
    if (!firstWarn && warnData.callsSinceWarn < DEBOUNCE_CALLS && !severityEscalated) {
      // Update counter and exit without warning
      fs.writeFileSync(warnPath, JSON.stringify(warnData));
      process.exit(0);
    }

    // Reset debounce counter
    warnData.callsSinceWarn = 0;
    warnData.lastLevel = currentLevel;
    fs.writeFileSync(warnPath, JSON.stringify(warnData));

    if (AUTOMATION_MODE !== 'off') {
      const action = isCritical && AUTOMATION_MODE === 'handoff' ? 'handoff' : 'checkpoint';
      const args = [
        CONTINUITY_HELPER,
        action,
        '--source', 'gsd-context-monitor',
        '--topic', isCritical ? 'Critical Context Threshold' : 'Warning Context Threshold',
        '--next-step',
        isCritical
          ? 'Resume from the latest continuity artifact before starting new work.'
          : 'Wrap up the current task and resume from the latest checkpoint if needed.'
      ];

      try {
        const child = spawn(process.execPath, args, {
          detached: false,
          stdio: 'ignore',
          env: process.env
        });
        child.unref();
      } catch (e) {
        // Silent fail -- hook automation must not block tool execution
      }
    }

    // Build advisory warning message
    let message = '';
    
    // Check for scope drift
    const driftWarning = detectDrift(sessionId);
    if (driftWarning) {
      message += driftWarning + '\n\n';
    }

    if (isCritical) {
      message += `CONTEXT MONITOR CRITICAL: Usage at ${usedPct}%. Remaining: ${remaining}%. ` +
        'STOP new work immediately. Save state NOW and inform the user that context is nearly exhausted. ' +
        'If using GSD, run /gsd:pause-work at the next natural stopping point.';
    } else if (remaining <= WARNING_THRESHOLD) {
      message += `CONTEXT MONITOR WARNING: Usage at ${usedPct}%. Remaining: ${remaining}%. ` +
        'Begin wrapping up current task. Do not start new complex work. ' +
        'If using GSD, consider /gsd:pause-work to save state.';
    }

    if (!message) {
      process.exit(0);
    }

    const output = {
      hookSpecificOutput: {
        hookEventName: process.env.GEMINI_API_KEY ? "AfterTool" : "PostToolUse",
        additionalContext: message
      }
    };

    process.stdout.write(JSON.stringify(output));
  } catch (e) {
    // Silent fail -- never block tool execution
    process.exit(0);
  }
});
