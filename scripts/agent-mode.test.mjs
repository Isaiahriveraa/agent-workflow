import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

const script = path.join(import.meta.dirname, "agent-mode");
const roots = [];

function fixture({ agents = "before\n<!-- ACTIVE WORKFLOW PROFILE:START -->\n<!-- mode: ship-fast -->\nold\n<!-- ACTIVE WORKFLOW PROFILE:END -->\nafter\n", active = "ship-fast" } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-mode-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "profiles"));
  fs.copyFileSync(path.join(import.meta.dirname, "..", "profiles", "ship-fast.md"), path.join(root, "profiles", "ship-fast.md"));
  fs.copyFileSync(path.join(import.meta.dirname, "..", "profiles", "tutor.md"), path.join(root, "profiles", "tutor.md"));
  const profile = fs.readFileSync(path.join(root, "profiles", active + ".md"), "utf8").trim();
  fs.writeFileSync(path.join(root, "AGENTS.md"), agents.replace("<!-- mode: ship-fast -->", `<!-- mode: ${active} -->`).replace("old", profile));
  return root;
}

function run(root, ...args) {
  return execFileSync(script, args, { cwd: os.tmpdir(), env: { ...process.env, AGENT_MODE_ROOT: root }, encoding: "utf8" });
}

describe("agent-mode", () => {
  it("reports the active profile", () => {
    const root = fixture();
    assert.match(run(root, "status"), /ship-fast/);
  });

  it("switches profiles while preserving surrounding AGENTS.md content", () => {
    const root = fixture();
    const before = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
    run(root, "tutor");
    const after = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
    const start = "<!-- ACTIVE WORKFLOW PROFILE:START -->";
    const end = "<!-- ACTIVE WORKFLOW PROFILE:END -->";
    assert.match(after, new RegExp(`${start}\\n<!-- mode: tutor -->\\n# Tutor`));
    assert.match(run(root, "status"), /tutor/);
    assert.equal(after.slice(0, after.indexOf(start)), before.slice(0, before.indexOf(start)));
    assert.equal(after.slice(after.indexOf(end) + end.length), before.slice(before.indexOf(end) + end.length));
  });

  it("switches to either supported profile with the exact active-block format", () => {
    for (const [active, target, heading] of [
      ["ship-fast", "tutor", "# Tutor"],
      ["tutor", "ship-fast", "# Ship Fast"],
    ]) {
      const root = fixture({ active });
      run(root, target);
      const content = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
      assert.match(content, new RegExp(
        `<!-- ACTIVE WORKFLOW PROFILE:START -->\\n<!-- mode: ${target} -->\\n${heading}`,
      ));
      assert.match(content, /<!-- ACTIVE WORKFLOW PROFILE:END -->/);
    }
  });

  it("is a no-op when the requested profile is already active", () => {
    const root = fixture();
    const file = path.join(root, "AGENTS.md");
    const before = fs.statSync(file);
    const content = fs.readFileSync(file, "utf8");
    run(root, "ship-fast");
    assert.equal(fs.readFileSync(file, "utf8"), content);
    assert.equal(fs.statSync(file).mode, before.mode);
  });

  it("rejects unknown modes without changing the file", () => {
    const root = fixture();
    const file = path.join(root, "AGENTS.md");
    const content = fs.readFileSync(file, "utf8");
    assert.throws(() => run(root, "nope"), /unknown mode|profile/i);
    assert.equal(fs.readFileSync(file, "utf8"), content);
  });

  it("rejects missing, duplicated, and reversed marker pairs", () => {
    for (const agents of [
      "no markers\n",
      "<!-- ACTIVE WORKFLOW PROFILE:START -->\na\n<!-- ACTIVE WORKFLOW PROFILE:END -->\n<!-- ACTIVE WORKFLOW PROFILE:START -->\nb\n<!-- ACTIVE WORKFLOW PROFILE:END -->\n",
      "<!-- ACTIVE WORKFLOW PROFILE:END -->\na\n<!-- ACTIVE WORKFLOW PROFILE:START -->\n",
    ]) {
      const root = fixture({ agents });
      assert.throws(() => run(root, "status"), /marker/i);
      assert.throws(() => run(root, "tutor"), /marker/i);
    }
  });
});

process.on("exit", () => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});
