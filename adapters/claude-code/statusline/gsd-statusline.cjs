#!/usr/bin/env node
// Claude Code Statusline - GSD Edition
// Shows: model | phase | current task | agents | memory | directory | context usage | duration

const fs = require('fs');
const path = require('path');
const os = require('os');

// Read JSON from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const modelId = data.model?.id || '';
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || '';
    const remaining = data.context_window?.remaining_percentage;
    const currentUsage = data.context_window?.current_usage || null;
    const contextWindowSize = data.context_window?.context_window_size || 0;
    const isCodexModel = /^gpt-/i.test(modelId) || /codex/i.test(modelId) || /gpt-|codex/i.test(model);

    function formatTokens(value) {
      if (!Number.isFinite(value)) return '0';
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
      if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
      return String(Math.round(value));
    }

    // Context window display (shows USED percentage scaled to 80% limit)
    // Claude Code enforces an 80% context limit, so we scale to show 100% at that point
    let ctx = '';
    if (isCodexModel && currentUsage && contextWindowSize > 0) {
      const usedTokens =
        (currentUsage.input_tokens || 0) +
        (currentUsage.cache_creation_input_tokens || 0) +
        (currentUsage.cache_read_input_tokens || 0);
      const rawUsed = Math.max(
        0,
        Math.min(100, Math.round((usedTokens / contextWindowSize) * 100))
      );
      // Keep Codex visually aligned with the Claude GSD statusline:
      // treat 80% real context usage as "full" because compaction pressure
      // begins before the absolute window limit.
      const used = Math.min(100, Math.round((rawUsed / 80) * 100));
      const filled = Math.floor(used / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

      if (used < 63) {        // ~50% real
        ctx = ` \x1b[32m${bar} ${used}%\x1b[0m`;
      } else if (used < 81) { // ~65% real
        ctx = ` \x1b[33m${bar} ${used}%\x1b[0m`;
      } else if (used < 95) { // ~76% real
        ctx = ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
      } else {
        ctx = ` \x1b[5;31m💀 ${bar} ${used}%\x1b[0m`;
      }
    } else if (remaining != null) {
      const rem = Math.round(remaining);
      const rawUsed = Math.max(0, Math.min(100, 100 - rem));
      // Scale: 80% real usage = 100% displayed
      const used = Math.min(100, Math.round((rawUsed / 80) * 100));

      // Build progress bar (10 segments)
      const filled = Math.floor(used / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

      // Color based on scaled usage (thresholds adjusted for new scale)
      if (used < 63) {        // ~50% real
        ctx = ` \x1b[32m${bar} ${used}%\x1b[0m`;
      } else if (used < 81) { // ~65% real
        ctx = ` \x1b[33m${bar} ${used}%\x1b[0m`;
      } else if (used < 95) { // ~76% real
        ctx = ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
      } else {
        ctx = ` \x1b[5;31m💀 ${bar} ${used}%\x1b[0m`;
      }
    }

    // Current task from todos
    let task = '';
    const homeDir = os.homedir();
    const todosDir = path.join(homeDir, '.claude', 'todos');
    if (session && fs.existsSync(todosDir)) {
      try {
        const files = fs.readdirSync(todosDir)
          .filter(f => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'))
          .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          try {
            const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
            const inProgress = todos.find(t => t.status === 'in_progress');
            if (inProgress) task = inProgress.activeForm || '';
          } catch (e) {}
        }
      } catch (e) {
        // Silently fail on file system errors - don't break statusline
      }
    }

    // GSD phase from state.md — pull the workflow name, not the verbose status
    let phase = '';
    const agentsRoot = process.env.AGENTS_ROOT || path.join(homeDir, '.agents');
    const stateFiles = [
      path.join(dir, '.agents', 'contexts', 'state.md'),
      path.join(dir, '.planning', 'STATE.md')
    ];
    for (const sf of stateFiles) {
      if (fs.existsSync(sf)) {
        try {
          const stateContent = fs.readFileSync(sf, 'utf8');
          // Prefer "Current Workflow" (the task name) over "Current Phase" (verbose status)
          const workflowMatch = stateContent.match(/##\s*Current Workflow\s*\n-\s*(.+)/i);
          if (workflowMatch) {
            phase = workflowMatch[1].trim();
            // Strip parenthetical details for brevity
            phase = phase.replace(/\s*\(.*\)/, '').slice(0, 24);
            break;
          }
        } catch (e) {}
      }
    }

    // Mem0 sync indicator — lights up when mem0 was recently triggered
    // Memory consolidation hook touches memory.db when LanceDB maintenance runs
    let memIndicator = '';
    const memDbPath = path.join(agentsRoot, 'memory.db');
    if (fs.existsSync(memDbPath)) {
      try {
        const stat = fs.statSync(memDbPath);
        const ageSec = (Date.now() - stat.mtimeMs) / 1000;
        // Show active indicator only when mem0 was triggered recently (last 30s)
        if (ageSec < 30) {
          memIndicator = '\x1b[32mmem0 ●\x1b[0m';
        }
      } catch (e) {}
    }

    // Session duration
    let duration = '';
    const tmpDir = os.tmpdir();
    if (session) {
      const sessionStartFile = path.join(tmpDir, `claude-session-start-${session}`);
      if (fs.existsSync(sessionStartFile)) {
        try {
          const startTime = parseInt(fs.readFileSync(sessionStartFile, 'utf8').trim(), 10);
          const elapsed = Math.floor((Date.now() / 1000) - startTime);
          const mins = Math.floor(elapsed / 60);
          const hrs = Math.floor(mins / 60);
          duration = hrs > 0 ? `${hrs}h${mins % 60}m` : `${mins}m`;
        } catch (e) {}
      } else {
        // First time — write start timestamp
        try {
          fs.writeFileSync(sessionStartFile, String(Math.floor(Date.now() / 1000)));
          duration = '0m';
        } catch (e) {}
      }
    }

    // Active subagent count from todos
    let agentCount = 0;
    if (session && fs.existsSync(todosDir)) {
      try {
        const allFiles = fs.readdirSync(todosDir)
          .filter(f => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'));
        for (const f of allFiles) {
          try {
            const todos = JSON.parse(fs.readFileSync(path.join(todosDir, f), 'utf8'));
            agentCount += todos.filter(t => t.status === 'in_progress').length;
          } catch (e) {}
        }
      } catch (e) {}
    }

    // GSD update available?
    let gsdUpdate = '';
    const cacheFile = path.join(homeDir, '.claude', 'cache', 'gsd-update-check.json');
    if (fs.existsSync(cacheFile)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (cache.update_available) {
          gsdUpdate = '\x1b[33m⬆ update\x1b[0m';
        }
      } catch (e) {}
    }

    // Git branch
    let branch = '';
    try {
      const { execSync } = require('child_process');
      branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: dir, timeout: 1000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
    } catch (e) {}

    // Truncate long branch names: "feat/some-long-name" → "feat/some-lo…"
    const MAX_BRANCH = 20;
    let branchDisplay = branch;
    if (branch.length > MAX_BRANCH) {
      branchDisplay = branch.slice(0, MAX_BRANCH - 1) + '…';
    }

    // Build output segments
    const segments = [];
    if (gsdUpdate) segments.push(gsdUpdate);
    segments.push(`\x1b[2m${model}\x1b[0m`);
    if (branchDisplay) segments.push(`\x1b[33m${branchDisplay}\x1b[0m`);
    if (phase) segments.push(`\x1b[36m${phase}\x1b[0m`);
    if (task) segments.push(`\x1b[1m${task}\x1b[0m`);
    if (agentCount > 0) segments.push(`\x1b[35m${agentCount} agents\x1b[0m`);
    if (memIndicator) segments.push(memIndicator);

    const dirname = path.basename(dir);
    segments.push(`\x1b[2m${dirname}\x1b[0m`);
    if (duration) segments.push(`\x1b[2m${duration}\x1b[0m`);

    process.stdout.write(segments.join(' │ ') + ctx);
  } catch (e) {
    // Silent fail - don't break statusline on parse errors
  }
});
