import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const CHECKPOINT_MS = 45 * 60 * 1000;
const REFLECTION_MS = 90 * 60 * 1000;
const WARNING_MS = 5 * 60 * 1000;

export default function (pi: ExtensionAPI) {
  let checkpointTimer: ReturnType<typeof setTimeout> | null = null;
  let checkpointWarningTimer: ReturnType<typeof setTimeout> | null = null;
  let reflectionTimer: ReturnType<typeof setTimeout> | null = null;
  let reflectionWarningTimer: ReturnType<typeof setTimeout> | null = null;
  let sessionStartedAt = Date.now();
  let notify: ((message: string, type?: "info" | "warning" | "error") => void) | null = null;
  let setCheckpointStatus: ((text: string | undefined) => void) | null = null;
  let setReflectionStatus: ((text: string | undefined) => void) | null = null;

  const clearTimers = () => {
    if (checkpointTimer) clearTimeout(checkpointTimer);
    if (checkpointWarningTimer) clearTimeout(checkpointWarningTimer);
    if (reflectionTimer) clearTimeout(reflectionTimer);
    if (reflectionWarningTimer) clearTimeout(reflectionWarningTimer);
    checkpointTimer = null;
    checkpointWarningTimer = null;
    reflectionTimer = null;
    reflectionWarningTimer = null;
  };

  const injectCheckpoint = () => {
    setCheckpointStatus?.("checkpoint due");
    notify?.(
      "Learning checkpoint: 45 minutes elapsed. Run /checkpoint: step away, simplest version, scope drift.",
      "info"
    );
  };

  const injectReflection = () => {
    setReflectionStatus?.("reflect due");
    notify?.(
      "Reflection timer elapsed. Run /reflect now: files touched, structure, rationale, big picture, zero-context explanation.",
      "warning"
    );
  };

  const resetTimer = (reason: string) => {
    clearTimers();
    sessionStartedAt = Date.now();
    setCheckpointStatus?.("45m");
    setReflectionStatus?.("90m");

    checkpointWarningTimer = setTimeout(() => {
      setCheckpointStatus?.("checkpoint in 5m");
      notify?.("Learning checkpoint in 5 minutes", "info");
    }, CHECKPOINT_MS - WARNING_MS);
    checkpointTimer = setTimeout(injectCheckpoint, CHECKPOINT_MS);

    reflectionWarningTimer = setTimeout(() => {
      setReflectionStatus?.("reflect in 5m");
      notify?.("Reflection due in 5 minutes", "info");
    }, REFLECTION_MS - WARNING_MS);
    reflectionTimer = setTimeout(injectReflection, REFLECTION_MS);

    console.log(`[learning-timer] timers reset: ${reason}`);
  };

  pi.on("session_start", async (_event, ctx) => {
    notify = ctx.hasUI ? ctx.ui.notify.bind(ctx.ui) : null;
    setCheckpointStatus = null;
    setReflectionStatus = null;
    ctx.ui.setStatus("learning-checkpoint", undefined);
    ctx.ui.setStatus("learning-reflection", undefined);
    resetTimer("session_start");
  });

  pi.on("input", async (event) => {
    if (event.text.includes("/reflect")) {
      resetTimer("reflect completed");
    }
    return { action: "continue" };
  });

  pi.registerCommand("reflection-timer", {
    description: "Control the Learning Mode reflection timer: status, reset, stop",
    handler: async (raw, ctx) => {
      const action = raw.trim() || "status";
      notify = ctx.hasUI ? ctx.ui.notify.bind(ctx.ui) : notify;
      setCheckpointStatus = null;
      setReflectionStatus = null;

      if (action === "reset" || action === "start") {
        resetTimer(`reflection-timer ${action}`);
        ctx.ui.notify("Reflection timer reset: 90 minutes", "info");
        return;
      }

      if (action === "stop") {
        clearTimers();
        setCheckpointStatus?.(undefined);
        setReflectionStatus?.(undefined);
        ctx.ui.notify("Learning timers stopped", "info");
        return;
      }

      const elapsedMinutes = Math.floor((Date.now() - sessionStartedAt) / 60000);
      const reflectRemaining = Math.max(0, Math.ceil((REFLECTION_MS - (Date.now() - sessionStartedAt)) / 60000));
      ctx.ui.notify(`Learning timers: ${elapsedMinutes}m elapsed, reflection in ${reflectRemaining}m`, "info");
    },
  });

  pi.on("session_shutdown", async () => {
    clearTimers();
    setCheckpointStatus?.(undefined);
    setReflectionStatus?.(undefined);
  });

  console.log(`[learning-timer] loaded at ${new Date(sessionStartedAt).toISOString()}`);
}
