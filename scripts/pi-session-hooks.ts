import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { join } from "node:path";

const AGENTS = process.env.AGENTS_ROOT ?? join(process.env.HOME!, ".agents");
const BRIDGE = `${AGENTS}/scripts/memory-sync-bridge.mjs`;

const callBridge = async (op: string, extra: string[] = []): Promise<string | null> => {
  const { execSync } = await import("node:child_process");
  try {
    return execSync(`node "${BRIDGE}" ${op} ${extra.join(" ")}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15000,
      env: { ...process.env, AGENTS_ROOT: AGENTS },
    }).trim();
  } catch { return null; }
};

const injectMemories = async (pi: ExtensionAPI) => {
  const raw = await callBridge("recall", ["--workflow-stage", "plan"]);
  if (!raw) return;

  try {
    const { memories, lessons, problems, diagnostics } = JSON.parse(raw);
    const items = [...(memories ?? []), ...(lessons ?? []), ...(problems ?? [])];
    if (items.length === 0) return;

    const summary = items
      .slice(0, 10)
      .map((m: any) => `- ${m.content ?? m.summary ?? m.title ?? JSON.stringify(m).slice(0, 200)}`)
      .join("\n");

    const payload = `[memory injection — ${diagnostics?.workflow_stage ?? "plan"}]\nRelevant context from prior sessions:\n${summary}`;
    pi.appendEntry?.("system", payload);
    console.log(`[hooks] injected ${items.length} memory items`);
  } catch { /* non-critical — don't block session start */ }
};

export default async function (pi: ExtensionAPI) {
  const log = (msg: string) => console.log(`[hooks] ${msg}`);

  pi.on("session_start", async () => {
    log("session started");
    await injectMemories(pi);
  });

  pi.on("agent_end", async () => {
    await callBridge("flush");
  });

  pi.on("session_shutdown", async () => {
    await callBridge("flush");
  });

  pi.on("agent_start", async () => {
    log("agent start");
  });

  pi.on("turn_end", async () => {
    log("turn end");
  });

  log("session + lifecycle hooks active");
}
