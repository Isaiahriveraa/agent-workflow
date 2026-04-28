import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { join } from "node:path";

const AGENTS = process.env.AGENTS_ROOT ?? join(process.env.HOME!, ".agents");
const BRIDGE = `${AGENTS}/scripts/memory-sync-bridge.mjs`;

const callBridge = async (op: string, extra: string[] = []): Promise<void> => {
  const { execSync } = await import("node:child_process");
  try {
    execSync(`node "${BRIDGE}" ${op} ${extra.join(" ")}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15000,
      env: { ...process.env, AGENTS_ROOT: AGENTS },
    });
  } catch { /* non-blocking */ }
};

export default async function (pi: ExtensionAPI) {
  const log = (msg: string) => console.log(`[hooks] ${msg}`);

  pi.on("session_start", async () => {
    log("session started");
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
