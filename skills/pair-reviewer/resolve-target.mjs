import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import path from "node:path";

const git = (args, cwd, fallback = "") => {
  try {
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
};
// `git status --porcelain` is column-significant: its first column is a space for
// worktree-only changes, so trimming the output would shift every field on line one.
const gitRaw = (args, cwd) => {
  try {
    return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).replace(/\n+$/, "");
  } catch {
    return "";
  }
};
const fsSafe = (operation, fallback) => {
  try { return operation(); } catch { return fallback; }
};
const existsDir = (value) => fsSafe(() => fs.statSync(value).isDirectory(), false);

export function issueNumber(branch) {
  if (!branch) return "none";
  const explicit = branch.match(/(?:#|issue[-/]|gh[-/])(\d+)(?:\D|$)/i);
  if (explicit) return explicit[1];
  const first = branch.split("/");
  if (first.length > 1 && /^(?:feat|feature|fix|bugfix|chore|docs|refactor|test|tests|build|ci|perf|hotfix|release)$/i.test(first[0])) {
    const numbered = first[1].match(/^(\d+)(?:-|$)/);
    if (numbered) return numbered[1];
  }
  return "none";
}

const rootFor = (dir) => git(["rev-parse", "--show-toplevel"], dir);
const absolute = (value) => path.resolve(value || process.cwd());

function resolveTarget(target, cwd) {
  const searched = [];
  if (!target) return { root: rootFor(cwd), searched };
  const candidate = absolute(target);
  searched.push(candidate);
  if (existsDir(candidate)) {
    const root = rootFor(candidate);
    if (root) return { root, searched };
  }
  const porcelain = git(["worktree", "list", "--porcelain"], cwd);
  let worktree;
  let branch;
  for (const line of porcelain.split("\n")) {
    if (line.startsWith("worktree ")) worktree = line.slice(9);
    if (line === `branch refs/heads/${target}` && worktree) {
      branch = worktree;
      searched.push(path.resolve(worktree));
      break;
    }
  }
  if (branch && existsDir(branch)) {
    const root = rootFor(branch);
    if (root) return { root, searched };
  }
  const cwdRoot = rootFor(cwd);
  if (cwdRoot) {
    const hubCandidate = path.resolve(path.dirname(cwdRoot), target.replace(/[\/_]/g, "-"));
    searched.push(hubCandidate);
    if (existsDir(hubCandidate)) {
      const root = rootFor(hubCandidate);
      if (root) return { root, searched };
    }
  }
  return { root: "", searched };
}

const lines = [];
const section = (name, entries) => {
  if (entries.length) lines.push(`${name}:`, ...entries.map((entry) => `  ${entry}`));
};
const filesRecursively = (dir) => {
  const result = [];
  const visit = (current) => {
    for (const item of fsSafe(() => fs.readdirSync(current, { withFileTypes: true }), [])) {
      const full = path.join(current, item.name);
      if (item.isDirectory()) visit(full);
      else if (item.isFile()) result.push(full);
    }
  };
  visit(dir);
  return result;
};

function report(root, searched) {
  if (!root) {
    lines.push("status: not-found", "searched:", ...searched.map((item) => `  ${item}`));
    return;
  }
  const branch = git(["branch", "--show-current"], root, "") || "no-branch";
  const head = git(["rev-parse", "--short", "HEAD"], root, "") || "none";
  let base = "none";
  const symbolic = git(["symbolic-ref", "refs/remotes/origin/HEAD"], root, "");
  const candidates = symbolic ? [symbolic.replace(/^refs\/remotes\//, "")] : [];
  candidates.push("origin/main", "origin/master", "main", "master");
  for (const candidate of candidates) {
    if (git(["rev-parse", "--verify", `${candidate}^{commit}`], root)) { base = candidate; break; }
  }
  const mergeBase = base === "none" ? "" : git(["merge-base", base, "HEAD"], root, "");
  const shortBase = mergeBase ? mergeBase.slice(0, 8) : "";
  const rangeRef = mergeBase ? `${mergeBase}..HEAD` : "";
  const range = mergeBase ? `${shortBase}..HEAD` : "none";
  const commitLines = rangeRef ? git(["log", "--format=%h %s", rangeRef], root).split("\n").filter(Boolean) : [];
  const numstat = rangeRef ? git(["diff", "--numstat", rangeRef], root).split("\n").filter(Boolean) : [];
  const changed = numstat.map((line) => {
    const parts = line.split("\t");
    return { add: parts[0], del: parts[1], file: parts.slice(2).join("\t") };
  });
  const dirtyLines = gitRaw(["status", "--porcelain"], root).split("\n").filter(Boolean);
  lines.push(`status: ok`, `root: ${root}`, `branch: ${branch}`, `head: ${head}`, `base: ${base}`, `merge_base: ${shortBase || "none"}`, `range: ${range}`, `commits: ${commitLines.length}`, `files: ${changed.length}`, `dirty: ${dirtyLines.length ? "yes" : "no"}`, `issue: ${issueNumber(branch)}`);
  const contextRoot = path.join(root, "context");
  const kinds = ["plans", "designs", "issues", "handoffs", "reviews", "research", "adr"];
  const folders = [];
  const artifacts = [];
  for (const kind of kinds) {
    const dir = path.join(contextRoot, kind);
    if (!existsDir(dir)) continue;
    const all = filesRecursively(dir);
    const newest = all.map((file) => ({ file, time: fsSafe(() => fs.statSync(file).mtimeMs, 0) })).sort((a, b) => b.time - a.time)[0];
    folders.push(`${kind}: ${all.length} file${all.length === 1 ? "" : "s"}${newest ? ` (newest: ${path.relative(root, newest.file)})` : ""}`);
    const newestFiles = all.map((file) => ({ file, time: fsSafe(() => fs.statSync(file).mtimeMs, 0) })).sort((a, b) => b.time - a.time).slice(0, 3);
    for (const { file } of newestFiles) artifacts.push(path.relative(root, file));
  }
  lines.push(`context: ${folders.length ? "present" : "absent"}`);
  section("artifact_folders", folders);
  section("commit_log", commitLines.slice(0, 40).concat(commitLines.length > 40 ? [`... ${commitLines.length - 40} more`] : []));
  section("changed_paths", changed.slice(0, 60).map(({ add, del, file }) => `+${add} -${del} ${file}`).concat(changed.length > 60 ? [`... ${changed.length - 60} more`] : []));
  section("uncommitted", dirtyLines.slice(0, 20).map((line) => `${line.slice(0, 2)} ${line.slice(3)}`).concat(dirtyLines.length > 20 ? [`... ${dirtyLines.length - 20} more`] : []));
  section("artifact_files", artifacts);
}

const target = process.argv[2] || "";
const resolved = resolveTarget(target, process.cwd());
report(resolved.root, resolved.searched);
process.stdout.write(`${lines.join("\n")}\n`);
