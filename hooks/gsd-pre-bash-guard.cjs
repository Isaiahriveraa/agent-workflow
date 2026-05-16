#!/usr/bin/env node
// Pre-Bash Safety Guard - PreToolUse hook
// Screens bash commands against a blocklist of dangerous patterns before
// execution. Returns a block decision when a destructive or risky command
// is detected, preventing accidental damage during autonomous operation.
//
// How it works:
// 1. Receives PreToolUse event with tool_input.command on stdin
// 2. Checks the command against dangerous patterns
// 3. If matched, returns a Codex/Claude-compatible block decision.
// 4. If safe, exits silently (allows execution)
//
// Only activates for shell command tool invocations.

const dangerousPatterns = [
  {
    id: 'recursive_delete',
    pattern: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive|--force|-[a-zA-Z]*f[a-zA-Z]*r)\b/,
    reason: 'Recursive force-delete detected. Review the target path before running.'
  },
  {
    id: 'rm_root',
    pattern: /\brm\s+.*\s+\/\s*$/,
    reason: 'Attempting to delete root filesystem.'
  },
  {
    id: 'force_push',
    pattern: /\bgit\s+push\s+.*--force(?!-with-lease)\b/,
    reason: 'Force push without --force-with-lease. Use --force-with-lease or get explicit approval.'
  },
  {
    id: 'reset_hard',
    pattern: /\bgit\s+reset\s+--hard\b/,
    reason: 'Hard reset discards uncommitted changes. Confirm intent before proceeding.'
  },
  {
    id: 'clean_force',
    pattern: /\bgit\s+clean\s+.*-[a-zA-Z]*f/,
    reason: 'git clean -f deletes untracked files permanently. Confirm intent.'
  },
  {
    id: 'drop_database',
    pattern: /\bdrop\s+(database|table|schema)\b/i,
    reason: 'Database drop detected. This is destructive and irreversible.'
  },
  {
    id: 'env_cat',
    pattern: /\b(cat|less|more|head|tail|bat)\s+.*\.env\b/,
    reason: 'Reading .env file may expose secrets. Use specific variable lookups instead.'
  },
  {
    id: 'credential_read',
    pattern: /\b(cat|less|more|head|tail|bat)\s+.*(credentials|secrets?|tokens?|keys?)\.(json|yaml|yml|toml|ini|cfg)\b/i,
    reason: 'Reading credential file may expose secrets.'
  },
  {
    id: 'chmod_777',
    pattern: /\bchmod\s+777\b/,
    reason: 'chmod 777 sets world-writable permissions. Use more restrictive permissions.'
  },
  {
    id: 'curl_pipe_bash',
    pattern: /\bcurl\s+.*\|\s*(sudo\s+)?(ba)?sh\b/,
    reason: 'Piping curl to shell executes untrusted remote code. Download and inspect first.'
  },
  {
    id: 'kill_all',
    pattern: /\bkillall\b|\bkill\s+-9\s+(-1|0)\b|\bpkill\s+-9\b/,
    reason: 'Mass process kill detected. Target specific PIDs instead.'
  },
  {
    id: 'dd_disk',
    pattern: /\bdd\s+.*\bof=\/dev\//,
    reason: 'dd writing to a device can destroy disk contents. Verify target carefully.'
  }
];

const shellToolNames = new Set([
  'Bash',
  'shell',
  'unified_exec',
  'exec_command',
  'command_execution'
]);

const readCommand = (data) => {
  const candidates = [
    data.tool_input?.command,
    data.tool_input?.cmd,
    data.command,
    data.cmd
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim()) || '';
};

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);

    const toolName = data.tool_name || data.toolName || data.name || '';

    // Only inspect shell command invocations.
    if (!shellToolNames.has(toolName)) {
      process.exit(0);
    }

    const command = readCommand(data);
    if (!command) {
      process.exit(0);
    }

    // Check against all dangerous patterns
    for (const entry of dangerousPatterns) {
      if (entry.pattern.test(command)) {
        const reason = `[pre-bash-guard:${entry.id}] ${entry.reason}`;
        const output = {
          decision: 'block',
          reason,
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: reason
          }
        };
        process.stdout.write(JSON.stringify(output));
        return;
      }
    }

    // Command is safe -- exit silently to allow execution
    process.exit(0);
  } catch (e) {
    // Silent fail -- never block tool execution on hook errors
    process.exit(0);
  }
});
