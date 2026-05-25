#!/usr/bin/env node
/**
 * pi-health — Audit Pi's registered capabilities against what actually exists in ~/.agents.
 *
 * Usage:
 *   node scripts/pi-health.mjs              # audit only
 *   node scripts/pi-health.mjs --fix        # audit + auto-fix stale references
 *
 * Exit codes:
 *   0 = clean (no drift)
 *   1 = drift detected
 *   2 = error
 */

import { readFileSync, readdirSync, existsSync, unlinkSync, renameSync } from "node:fs";
import { join } from "node:path";

const AGENTS = process.env.AGENTS_ROOT ?? join(process.env.HOME ?? "/tmp", ".agents");
const SCRIPTS = join(AGENTS, "scripts");
const CMDS = join(AGENTS, "commands");
const AGENTS_DIR = join(AGENTS, "agents");
const HOOKS = join(AGENTS, "hooks");

const fix = process.argv.includes("--fix");

let exitCode = 0;

const report = (kind, msg) => {
  const prefix = kind === "error" ? "❌" : kind === "warn" ? "⚠️" : kind === "fix" ? "🔧" : "✓";
  console.log(`${prefix} [${kind.toUpperCase()}] ${msg}`);
};

const drift = (msg) => {
  exitCode = 1;
  console.log(`  ⚠️  ${msg}`);
};

// ─── Helpers ────────────────────────────────────────────────────────

const lsDir = (dir, ext) => {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && (!ext || e.name.endsWith(ext)))
      .map((e) => e.name);
  } catch {
    return [];
  }
};

const exists = (p) => existsSync(p);

// ─── 1. Commands audit ──────────────────────────────────────────────

console.log("\n📋 Commands Audit");
console.log("─".repeat(40));

const cmdFiles = lsDir(CMDS, ".md").map((f) => f.replace(".md", ""));
const piSlashPath = join(SCRIPTS, "pi-slash-commands.ts");

let piSlashSrc = "";
try {
  piSlashSrc = readFileSync(piSlashPath, "utf-8");
} catch {
  drift(`pi-slash-commands.ts not found at ${piSlashPath}`);
}

// Extract CUSTOM_COMMANDS set from the TS source
const customMatch = piSlashSrc.match(/CUSTOM_COMMANDS\s*=\s*new\s*Set\(\[([^\]]*)\]\)/);
const customCommands = customMatch
  ? [...customMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : [];

// Extract all pi.registerCommand("...") calls
const registeredCommands = [
  ...piSlashSrc.matchAll(/pi\.registerCommand\(["']([^"']+)["']/g),
].map((m) => m[1]);

console.log(`  Commands available (.md files): ${cmdFiles.length}`);
console.log(`  Custom JS handlers: ${customCommands.join(", ") || "none"}`);
console.log(`  Total registered commands: ${registeredCommands.length}`);

// Check each registered custom command references an existing script
for (const cmd of customCommands) {
  if (cmd === "review") continue; // review has no script dependency
  const scriptMatch = piSlashSrc.match(
    new RegExp(`registerCommand\\("${cmd}"[\\s\\S]{1,300}?"([^"]+scripts/[^"]+)"`),
  );
  if (scriptMatch) {
    const scriptPath = scriptMatch[1].replace(/\$\{AGENTS\}/g, AGENTS);
    if (!exists(join(AGENTS, scriptPath.replace(/^.*scripts\//, "scripts/")))) {
      drift(`Custom command "${cmd}" references script that doesn't exist: ${scriptPath}`);
    }
  }
}

// Check for .md files that overlap with custom commands (would be shadowed)
for (const cmd of customCommands) {
  if (cmdFiles.includes(cmd)) {
    drift(
      `Command "${cmd}" has both a .md file and a custom handler. The .md file is shadowed.`,
    );
  }
}

// ─── 2. Agent file audit ────────────────────────────────────────────

console.log("\n📋 Agent Files Audit");
console.log("─".repeat(40));

const agentFiles = lsDir(AGENTS_DIR, ".md");
const gsdAgents = agentFiles.filter((f) => f.startsWith("gsd-"));
const knownAgentNames = agentFiles.map((f) => f.replace(".md", ""));

if (gsdAgents.length > 0) {
  console.log(`  Found ${gsdAgents.length} leftover gsd- prefixed agent files:`);
  for (const f of gsdAgents) {
    drift(`  ${f} — still has gsd- prefix`);
  }
} else {
  console.log("  ✓ No leftover gsd- prefixed agent files");
}

// Check agent files for stale GSD references in frontmatter
for (const agentFile of agentFiles) {
  try {
    const content = readFileSync(join(AGENTS_DIR, agentFile), "utf-8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatter && /gsd/i.test(frontmatter[1])) {
      drift(`Agent "${agentFile}" still has GSD references in frontmatter`);
    }
  } catch {
    // skip unreadable
  }
}

// ─── 3. Cross-reference audit ───────────────────────────────────────

console.log("\n📋 Cross-Reference Audit");
console.log("─".repeat(40));

// Check system.md references
const systemMdPath = join(AGENTS, "prompts", "system.md");
if (exists(systemMdPath)) {
  const sysContent = readFileSync(systemMdPath, "utf-8");
  // Find all commands/X.md references and check they exist
  const cmdRefs = [...sysContent.matchAll(/`commands\/([^`]+)`/g)].map((m) => m[1]);
  for (const ref of cmdRefs) {
    const refPath = join(CMDS, ref);
    if (!exists(refPath)) {
      drift(`prompts/system.md references commands/${ref} which doesn't exist`);
    }
  }
}

// Check AGENTS.md for stale references
const agentsMdPath = join(AGENTS, "AGENTS.md");
if (exists(agentsMdPath)) {
  const agentsContent = readFileSync(agentsMdPath, "utf-8");
  const agentRefs = [
    ...agentsContent.matchAll(/`commands\/([^`]+)`/g),
  ].map((m) => m[1]);
  for (const ref of agentRefs) {
    // Skip glob patterns (e.g., "commands/**/*.md")
    if (ref.includes("*")) continue;
    const fullPath = join(CMDS, ref);
    if (!exists(fullPath)) {
      drift(`AGENTS.md references commands/${ref} which doesn't exist`);
    }
  }
}

// ─── 4. Stale hook check ────────────────────────────────────────────

console.log("\n📋 Hook Scripts Audit");
console.log("─".repeat(40));

const hookFiles = lsDir(HOOKS);
const orphanHooks = hookFiles.filter((f) => {
  // Check if hook references a script or path that no longer exists
  try {
    const content = readFileSync(join(HOOKS, f), "utf-8");
    return (
      content.includes("get-shit-done") ||
      content.includes("gsd-local-patches") ||
      (content.includes("gsd-tools") && !exists(join(AGENTS, "get-shit-done")))
    );
  } catch {
    return false;
  }
});

if (orphanHooks.length > 0) {
  console.log(`  Found ${orphanHooks.length} hooks with stale get-shit-done references:`);
  for (const f of orphanHooks) {
    drift(`  ${f} — references deleted get-shit-done/ paths`);
  }
} else {
  console.log("  ✓ No stale hook references");
}

// ─── 5. Cleanup orphan directories ──────────────────────────────────

console.log("\n📋 Orphan Directory Check");
console.log("─".repeat(40));

const orphans = ["gsd-local-patches"];
for (const dir of orphans) {
  const p = join(AGENTS, dir);
  if (exists(p)) {
    drift(`Orphan directory still exists: ${dir}/`);
    if (fix) {
      try {
        renameSync(p, `${p}.bak`);
        report("fix", `Renamed ${dir}/ → ${dir}.bak`);
      } catch (e) {
        report("error", `Could not rename ${dir}/: ${e}`);
      }
    }
  }
}

// ─── Summary ────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(40));
if (exitCode === 0) {
  console.log("✅ Pi health: CLEAN — no drift detected.");
} else {
  console.log(`⚠️  Drift detected. Run with --fix to auto-remediate.`);
}
console.log("═".repeat(40));

process.exit(exitCode);
