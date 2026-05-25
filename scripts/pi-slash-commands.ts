import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync, readdirSync, existsSync } from "node:fs";
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

// Commands with custom JS handlers (not driven by a .md file).
// Each command here must handle its own graceful degradation if backing files are missing.
const CUSTOM_COMMANDS = new Set(["doctor", "memory", "review"]);

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

  const scriptPath = (name: string) => join(AGENTS, "scripts", name);

  pi.registerCommand("doctor", {
    description: "Run project diagnostics — repo health, memory, execution state",
    handler: async () => {
      const script = scriptPath("doctor.mjs");
      if (!existsSync(script)) {
        pi.ui.notify(`doctor: script not found at ${script}. The command has been removed.`, "warn");
        return;
      }
      const out = await shell(`node "${script}" 2>&1`, pi);
      pi.ui.notify(`Doctor: ${out.slice(0, 400)}`, "info");
    },
  });

  pi.registerCommand("memory", {
    description: "Check memory bridge status or recall relevant memories",
    handler: async (raw) => {
      const script = scriptPath("memory-sync-bridge.mjs");
      if (!existsSync(script)) {
        pi.ui.notify(`memory: script not found at ${script}. The command has been removed.`, "warn");
        return;
      }
      const args = parseArgs(raw);
      const op = args.split(/\s+/)[0] || "status";
      const rest = args.slice(op.length).trim();
      const out = await shell(`node "${script}" ${op} ${rest} 2>&1`, pi);
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
