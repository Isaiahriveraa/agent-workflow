/**
 * RTK Pi Extension — Token-optimized shell command rewriting for pi.
 *
 * Intercepts bash tool calls, rewrites them via `rtk rewrite`, and passes
 * the compressed output back to pi. 60-90% token savings on dev commands.
 *
 * Installation:
 *   1. Ensure `rtk` is in PATH: `which rtk` → should print a path
 *   2. Add to ~/.pi/agent/settings.json:
 *        { "extensions": ["/Users/isaiahrivera/.agents/scripts/rtk-pi-extension.ts"] }
 *   3. Run `pi` — extension auto-loads. Use `/reload` to hot-reload without restart.
 *   4. Test: `!git status` → should transparently become `rtk git status`
 *
 * To bypass RTK for a single command, prefix with `rtk proxy`:
 *   `!!rtk proxy git log`
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default async function (pi: ExtensionAPI) {
  // Verify rtk binary is present at startup
  try {
    const { execSync } = await import("node:child_process");
    execSync("which rtk", { stdio: "pipe" });
  } catch {
    console.warn(
      "[rtk] rtk binary not found in PATH — RTK extension disabled. " +
        "Install: brew install rtk  (or curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh)"
    );
    return;
  }

  // tool_call fires BEFORE the tool runs — ideal for rewrite.
  // event.input.command is the bash command string.
  pi.on("tool_call", async (event, ctx) => {
    // Only intercept the bash tool
    if (event.toolName !== "bash") return;

    const input = event.input as { command?: string };
    const raw = input.command;
    if (!raw || typeof raw !== "string" || raw.trim() === "") return;

    // Pass-through for explicit rtk proxy/debug commands
    if (raw.trim().startsWith("rtk ") || raw.trim().startsWith("rtk proxy")) {
      return; // already RTK or debug — don't double-rewrite
    }

    try {
      const { execSync } = await import("node:child_process");
      const rewritten = execSync(`rtk rewrite ${raw}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 5000,
      })
        .trim()
        .split("\n")[0]; // rtk rewrite outputs rewritten command on first line

      if (rewritten && rewritten !== raw) {
        input.command = rewritten;
        console.log(`[rtk] ${raw}  →  ${rewritten}`);
      }
    } catch {
      // rtk rewrite failed (unknown command, timeout, etc.) — pass through unchanged
    }
  });

  console.log("[rtk] Extension loaded — token-optimized shell rewriting active");
}
