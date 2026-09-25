import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const gitConfig = ["-c", "init.defaultBranch=main", "-c", "commit.gpgsign=false", "-c", "user.email=t@example.com", "-c", "user.name=t"];
const runGit = (cwd, args) => {
  const result = spawnSync("git", ["-C", cwd, ...gitConfig, ...args], { encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" } });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
const makeRepo = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-target-"));
  runGit(root, ["init"]);
  fs.writeFileSync(path.join(root, "base.txt"), "base\n");
  runGit(root, ["add", "."]); runGit(root, ["commit", "-m", "base"]);
  return root;
};
const scriptPath = fileURLToPath(new URL("./resolve-target.mjs", import.meta.url));
const invoke = (cwd, target) => spawnSync(process.execPath, [scriptPath, ...(target === undefined ? [] : [target])], { cwd, encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" } });

 test("explicit directory target resolves root, branch, and head", () => {
  const root = makeRepo(); runGit(root, ["switch", "-c", "feat/123-x"]);
  const result = invoke(os.tmpdir(), root);
  assert.equal(result.status, 0); assert.match(result.stdout, new RegExp(`status: ok\\nroot: ${fs.realpathSync(root)}`));
  assert.match(result.stdout, /branch: feat\/123-x/); assert.match(result.stdout, /head: [0-9a-f]+/);
});

test("branch target resolves through linked worktree", () => {
  const root = makeRepo();
  const linked = `${root}-linked`;
  runGit(root, ["worktree", "add", "-b", "issue-7-fix", linked]);
  const result = invoke(root, "issue-7-fix");
  assert.equal(result.status, 0); assert.match(result.stdout, new RegExp(`root: ${fs.realpathSync(linked)}`)); assert.match(result.stdout, /branch: issue-7-fix/);
});

test("base fallback uses main and reports a two-commit range", () => {
  const root = makeRepo(); runGit(root, ["switch", "-c", "feat/123-x"]);
  fs.writeFileSync(path.join(root, "one.txt"), "one\n"); runGit(root, ["add", "."]); runGit(root, ["commit", "-m", "one"]);
  fs.writeFileSync(path.join(root, "two.txt"), "two\n"); runGit(root, ["add", "."]); runGit(root, ["commit", "-m", "two"]);
  const result = invoke(root); assert.equal(result.status, 0);
  assert.match(result.stdout, /base: main/); assert.match(result.stdout, /range: [0-9a-f]{7,}\.\.HEAD/); assert.match(result.stdout, /commits: 2/); assert.match(result.stdout, /files: 2/); assert.match(result.stdout, /issue: 123/);
  assert.match(result.stdout, /^ {2}[0-9a-f]{7,} one$/m); assert.match(result.stdout, /^ {2}[0-9a-f]{7,} two$/m);
  assert.match(result.stdout, /^ {2}\+1 -0 one\.txt$/m); assert.match(result.stdout, /^ {2}\+1 -0 two\.txt$/m);
});

test("conservative issue numbers are exercised through the CLI", () => {
  for (const [branch, expected] of [["feat/123-x", "123"], ["issue-7-fix", "7"], ["prototype-default-port-3456", "none"], ["master", "none"]]) {
    const root = makeRepo(); runGit(root, ["switch", "-c", branch]);
    const result = invoke(root); assert.equal(result.status, 0); assert.match(result.stdout, new RegExp(`issue: ${expected}\\n`));
  }
});

test("context inventory counts files and names newest plan", () => {
  const root = makeRepo();
  const plans = path.join(root, "context", "plans"); fs.mkdirSync(plans, { recursive: true });
  fs.writeFileSync(path.join(plans, "old.md"), "old"); fs.writeFileSync(path.join(plans, "new.md"), "new");
  const now = Date.now() / 1000; fs.utimesSync(path.join(plans, "old.md"), now - 10, now - 10); fs.utimesSync(path.join(plans, "new.md"), now, now);
  const result = invoke(root); assert.equal(result.status, 0); assert.match(result.stdout, /context: present/); assert.match(result.stdout, /plans: 2 files \(newest: context\/plans\/new\.md\)/); assert.match(result.stdout, /artifact_files:\n  context\/plans\/new\.md/);
});

test("unresolvable target is a successful not-found block", () => {
  const root = makeRepo(); const result = invoke(root, "does-not-exist");
  assert.equal(result.status, 0); assert.match(result.stdout, /status: not-found/); assert.match(result.stdout, /searched:/);
});

test("uncommitted paths keep the porcelain status columns", () => {
  const root = makeRepo();
  fs.writeFileSync(path.join(root, "base.txt"), "changed\n");
  fs.writeFileSync(path.join(root, "new.txt"), "new\n");
  const result = invoke(root);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /dirty: yes/);
  assert.match(result.stdout, /uncommitted:\n {3}M base\.txt\n {2}\?\? new\.txt/);
});
