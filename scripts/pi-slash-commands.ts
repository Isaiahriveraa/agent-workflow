import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const AGENTS = process.env.AGENTS_ROOT ?? join(process.env.HOME!, ".agents");
const CMDS = join(AGENTS, "commands");

const readCmd = (name: string) => {
  try {
    return readFileSync(join(CMDS, `${name}.md`), "utf-8");
  } catch {
    return null;
  }
};

const shell = async (cmd: string, ctx: ExtensionAPI): Promise<string> => {
  const { execSync } = await import("node:child_process");
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], timeout: 30000 })
      .trim();
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    return err.stderr?.trim() || err.stdout?.trim() || String(e);
  }
};

const parseArgs = (raw: string) => raw.trim();

export default function (pi: ExtensionAPI) {
  pi.registerCommand("prime", {
    description: "Lightweight repo priming before planning or implementation",
    handler: async (raw) => {
      const cmd = readCmd("prime");
      if (cmd) {
        pi.appendEntry?.("user", cmd);
        return;
      }
      const out = await shell(`node "${AGENTS}/scripts/init-local-state.mjs"`, pi);
      pi.ui.notify(`Prime: ${out.slice(0, 120)}`, "info");
    },
  });

  pi.registerCommand("rpi", {
    description: "Full research → plan → implement → validate workflow",
    handler: async (raw) => {
      const args = parseArgs(raw);
      const cmd = readCmd("rpi");
      if (cmd) {
        pi.appendEntry?.("user", cmd + (args ? `\n\nUser request: ${args}` : ""));
        return;
      }
      const out = await shell(
        `node "${AGENTS}/scripts/workflow-router-tools.mjs" activate --query "${args || 'general task'}"`,
        pi
      );
      pi.ui.notify(`RPI: ${out.slice(0, 200)}`, "info");
    },
  });

  pi.registerCommand("gsd", {
    description: "GSD workflow: do, plan-phase, new-project, and 30+ subcommands",
    handler: async (raw) => {
      const args = parseArgs(raw);
      if (!args) {
        pi.appendEntry?.("user", readCmd("gsd") || "/gsd help — see ~/.agents/commands/gsd/ for subcommands");
        return;
      }
      const subcmd = args.split(/\s+/)[0];
      const sub = readCmd(`gsd/${subcmd}`);
      if (sub) {
        pi.appendEntry?.("user", sub);
        return;
      }
      const out = await shell(
        `node "${AGENTS}/scripts/workflow-router-tools.mjs" activate --query "gsd ${args}"`,
        pi
      );
      pi.ui.notify(`GSD ${subcmd}: ${out.slice(0, 200)}`, "info");
    },
  });

  pi.registerCommand("tutor", {
    description: "Socratic web development tutoring mode",
    handler: async (raw) => {
      const cmd = readCmd("tutor");
      if (cmd) {
        pi.appendEntry?.("user", cmd);
        return;
      }
      pi.ui.notify("Tutor: command file not found at ~/.agents/commands/tutor.md", "warn");
    },
  });

  pi.registerCommand("pr", {
    description: "Generate a professional GitHub PR description from branch diff",
    handler: async (raw) => {
      const args = parseArgs(raw);
      const cmd = readCmd("pr");
      if (cmd) {
        pi.appendEntry?.("user", cmd + (args ? `\n\nContext: ${args}` : ""));
        return;
      }
      const out = await shell(`gh pr create ${args} --dry-run 2>&1 || gh pr create ${args} 2>&1`, pi);
      pi.ui.notify(`PR: ${out.slice(0, 300)}`, "info");
    },
  });

  pi.registerCommand("review-pr-comments", {
    description: "Fetch and summarize GitHub PR review comments with accept/reject recommendations",
    handler: async (raw) => {
      const pr = parseArgs(raw);
      const cmd = readCmd("review-pr-comments");
      if (cmd) {
        pi.appendEntry?.("user", cmd + (pr ? `\n\nPR: ${pr}` : ""));
        return;
      }
      const prArg = pr ? `--pr ${pr}` : "";
      const out = await shell(
        `node "${AGENTS}/scripts/review-pr-comments.mjs" ${prArg} 2>&1 || echo "Script not found"`,
        pi
      );
      pi.ui.notify(`review-pr-comments: ${out.slice(0, 300)}`, "info");
    },
  });

  pi.registerCommand("doctor", {
    description: "Run project diagnostics — repo health, memory, execution state",
    handler: async () => {
      const out = await shell(`node "${AGENTS}/scripts/doctor.mjs" 2>&1`, pi);
      pi.ui.notify(`Doctor: ${out.slice(0, 400)}`, "info");
    },
  });

  pi.registerCommand("memory", {
    description: "Check memory bridge status or recall relevant memories",
    handler: async (raw) => {
      const args = parseArgs(raw);
      const op = args.split(/\s+/)[0] || "status";
      const rest = args.slice(op.length).trim();
      const out = await shell(
        `node "${AGENTS}/scripts/memory-sync-bridge.mjs" ${op} ${rest} 2>&1`,
        pi
      );
      pi.ui.notify(`memory ${op}: ${out.slice(0, 400)}`, "info");
    },
  });

  pi.registerCommand("review", {
    description: "Code review — runs /code-review skill if available",
    handler: async (raw) => {
      pi.appendEntry?.("user", `Run the code-review workflow. ${raw ? `Focus areas: ${raw}` : ""}`);
    },
  });
}
