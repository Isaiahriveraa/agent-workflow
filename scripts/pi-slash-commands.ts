import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync, readdirSync } from "node:fs";
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

const shell = async (cmd: string, pi: ExtensionAPI): Promise<string> => {
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

const parseDescription = (name: string): string => {
  const cmd = readCmd(name);
  if (!cmd) return name;
  const secondLine = cmd.split("\n")[1] || "";
  const match = secondLine.match(/^description:\s*(.+)/);
  return match?.[1]?.trim() || name;
};

const discoverCommands = (): string[] => {
  try {
    return readdirSync(CMDS, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name.replace(".md", ""));
  } catch {
    return [];
  }
};

const CUSTOM_COMMANDS = new Set(["gsd", "doctor", "memory", "review"]);

export default function (pi: ExtensionAPI) {
  const commands = discoverCommands();
  for (const name of commands) {
    if (CUSTOM_COMMANDS.has(name)) continue;
    const description = parseDescription(name);
    pi.registerCommand(name, {
      description,
      handler: async (raw) => {
        const args = parseArgs(raw);
        const cmd = readCmd(name);
        if (cmd) {
          pi.appendEntry?.("user", cmd + (args ? `\n\n${args}` : ""));
          return;
        }
        pi.ui.notify(`${name}: command file not found at ~/.agents/commands/${name}.md`, "warn");
      },
    });
  }

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
