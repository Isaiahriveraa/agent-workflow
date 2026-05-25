import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { join } from "node:path";

const AGENTS = process.env.AGENTS_ROOT ?? join(process.env.HOME!, ".agents");
const BRIDGE = `${AGENTS}/scripts/memory-sync-bridge.mjs`;
const DECISIONS_HOOK = `${AGENTS}/scripts/check-unsaved-decisions.mjs`;

const inferPromptText = (payload: Record<string, unknown>): string => {
  const fields = [
    "prompt", "user_prompt", "userMessage", "message",
    "text", "last_user_message", "input", "arguments",
  ];
  for (const f of fields) {
    const v = payload[f];
    if (!v) continue;
    if (typeof v === "string") return v;
    if (Array.isArray(v)) {
      const extracted = v.map(inferPromptText).find(Boolean);
      if (extracted) return extracted;
    }
  }
  return "";
};

const callBridge = async (
  op: string,
  extra: string[] = [],
  cwd?: string
): Promise<string> => {
  const { execSync } = await import("node:child_process");
  try {
    const args = ["node", BRIDGE, op, ...extra];
    const result = execSync(args.join(" "), {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15000,
      env: { ...process.env, AGENTS_ROOT: AGENTS, cwd: cwd || process.cwd()! },
    });
    return String(result).trim();
  } catch (e: unknown) {
    const err = e as { stderr?: string; stdout?: string };
    return err.stderr?.trim() || err.stdout?.trim() || "";
  }
};

export default async function (pi: ExtensionAPI) {
  let sessionInjectDone = false;

  pi.on("session_start", async (event) => {
    const cwd = (event as Record<string, unknown>).cwd as string | undefined
      ?? process.cwd();

    const contextSummary = `cwd=${cwd}`;
    const result = await callBridge("inject", [
      "--context-summary", contextSummary,
    ], cwd);

    if (result) {
      try {
        const parsed = JSON.parse(result);
        if (parsed.additional_context?.trim()) {
          pi.appendEntry?.("user", `\n[memory] ${parsed.additional_context}\n`);
          sessionInjectDone = true;
        }
      } catch { /* not JSON or empty */ }
    }
  });

  pi.on("agent_end", async () => {
    try {
      await callBridge("flush");
    } catch { /* non-blocking */ }

    try {
      const { execSync } = await import("node:child_process");
      const result = execSync(`node "${DECISIONS_HOOK}"`, {
        encoding: "utf-8",
        timeout: 15000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (result) {
        const parsed = JSON.parse(result);
        if (parsed.hookSpecificOutput?.additionalContext) {
          pi.appendEntry?.("system", parsed.hookSpecificOutput.additionalContext);
        }
      }
    } catch { /* non-blocking */ }
  });

  pi.on("session_shutdown", async () => {
    try {
      await callBridge("flush");
    } catch { /* non-blocking */ }
  });
}
