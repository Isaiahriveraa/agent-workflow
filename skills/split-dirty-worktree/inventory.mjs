#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
let cwd = process.cwd();
const cwdIndex = args.indexOf("--cwd");
if (cwdIndex !== -1 && args[cwdIndex + 1])
  cwd = path.resolve(args[cwdIndex + 1]);

function git(argv, options = {}) {
  return execFileSync("git", argv, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function gitBuffer(argv) {
  return execFileSync("git", argv, {
    cwd,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function numstat(argv) {
  const output = gitBuffer(argv).toString("utf8");
  const result = new Map();
  let cursor = 0;
  while (cursor < output.length) {
    const tab = output.indexOf("\t", cursor);
    if (tab < 0) break;
    const tab2 = output.indexOf("\t", tab + 1);
    if (tab2 < 0) break;
    const end = output.indexOf("\0", tab2 + 1);
    if (end < 0) break;
    const addText = output.slice(cursor, tab);
    const delText = output.slice(tab + 1, tab2);
    const file = output.slice(tab2 + 1, end);
    result.set(file, {
      additions: addText === "-" ? null : Number(addText),
      deletions: delText === "-" ? null : Number(delText),
    });
    cursor = end + 1;
  }
  return result;
}

// Sum several numstat maps into one, so a repository with no commits yet can add
// its index and worktree changes instead of diffing against a HEAD that does not exist.
function mergeNumstat(maps) {
  const merged = new Map();
  for (const stats of maps) {
    for (const [file, stat] of stats) {
      const current = merged.get(file) ?? { additions: 0, deletions: 0 };
      current.additions += stat.additions ?? 0;
      current.deletions += stat.deletions ?? 0;
      merged.set(file, current);
    }
  }
  return merged;
}

function flagsFor(file, submodules) {
  const base = path.posix.basename(file);
  const flags = [];
  if (
    /(^|\/)(tests?|__tests__|spec)\//.test(file) ||
    /(_test|_spec|\.test|\.spec)\./.test(file)
  )
    flags.push("test");
  if (/\.(md|mdx|rst|txt)$/.test(file) || /(^|\/)docs?\//.test(file))
    flags.push("docs");
  if (
    /^\.github\/workflows\//.test(file) ||
    base === "Jenkinsfile" ||
    /\.gitlab-ci\.yml$/.test(file)
  )
    flags.push("ci");
  if (
    /^(package\.json|tsconfig\.json|Cargo\.toml|pyproject\.toml|go\.mod|Makefile|Dockerfile|\.eslintrc.*|vite\.config\..*|next\.config\..*)$/.test(
      base,
    )
  )
    flags.push("config");
  if (
    /^(package-lock\.json|yarn\.lock|bun\.lock|bun\.lockb|poetry\.lock|Cargo\.lock|go\.sum|uv\.lock|Gemfile\.lock)$/.test(
      base,
    )
  )
    flags.push("lockfile");
  if (
    /(^|\/)(dist|build|target|out|coverage|__pycache__|node_modules|\.next)\//.test(
      file,
    ) ||
    /\.(min\.js|map|pyc)$/.test(file)
  )
    flags.push("generated");
  if (
    /\.env/.test(base) ||
    /\.local$/.test(file) ||
    /\.log$/.test(file) ||
    /\.DS_Store$/.test(file) ||
    /(^|\/)\.idea\//.test(file) ||
    /(^|\/)\.vscode\//.test(file) ||
    /\.sqlite3?$/.test(file) ||
    /(^|\/)\.omp\//.test(file)
  )
    flags.push("local-state");
  if (submodules.has(file)) flags.push("submodule");
  return flags;
}

function realpath(target) {
  try {
    return fs.realpathSync.native(target);
  } catch {
    return path.resolve(target);
  }
}

function parseStatus(raw) {
  const records = raw.toString("utf8").split("\0");
  const files = [];
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (!record) continue;
    const kind = record[0];
    if (kind === "?") {
      files.push({ status: "??", path: record.slice(2) });
    } else if (kind === "1") {
      const fields = record.split(/\s+/);
      files.push({
        status: fields[1].replace(/\./g, " "),
        path: fields.slice(8).join(" "),
      });
    } else if (kind === "u") {
      const fields = record.split(/\s+/);
      files.push({
        status: fields[1].replace(/\./g, " "),
        path: fields.slice(10).join(" "),
      });
    } else if (kind === "2") {
      const tab = record.indexOf("\t");
      const beforePath = tab < 0 ? record : record.slice(0, tab);
      const fields = beforePath.split(/\s+/);
      files.push({
        status: fields[1].replace(/\./g, " "),
        path: tab < 0 ? fields.slice(9).join(" ") : record.slice(tab + 1),
      });
      i += 1;
    }
  }
  return files;
}

function countStatus(files, which) {
  const selected = files.filter((file) => {
    const indexStatus = file.status[0];
    const worktreeStatus = file.status[1];
    return which === "staged"
      ? indexStatus !== " " && indexStatus !== "." && file.status !== "??"
      : worktreeStatus !== " " &&
          worktreeStatus !== "." &&
          file.status !== "??";
  });
  return { files: selected.length, additions: 0, deletions: 0 };
}

function hunksFor(file, diffCommands) {
  const headers = [];
  for (const command of diffCommands) {
    try {
      const text = git([...command, "--", file]);
      headers.push(
        ...text
          .split("\n")
          .filter((line) => /^@@ /.test(line))
          .map((line) => line.slice(3).trim().slice(0, 100)),
      );
    } catch {
      // A file can be unreadable to one of the diff commands; the other still reports its hunks.
    }
  }
  return headers;
}

function main() {
  let root;
  try {
    root = git(["rev-parse", "--show-toplevel"]).trim();
  } catch {
    if (jsonMode)
      process.stdout.write(
        JSON.stringify({ error: "not a git repository" }) + "\n",
      );
    else process.stdout.write("error: not a git repository\n");
    return;
  }
  const repo = path.basename(root);
  let branch = "no-branch";
  try {
    branch =
      git(["symbolic-ref", "--quiet", "--short", "HEAD"]).trim() || "no-branch";
  } catch {
    try {
      branch = `detached@${git(["rev-parse", "--short", "HEAD"]).trim()}`;
    } catch {}
  }
  let head = "no-commit";
  try {
    head = `${git(["rev-parse", "--short", "HEAD"]).trim()} ${git(["log", "-1", "--format=%s"]).trim()}`;
  } catch {}

  const submodules = new Set();
  try {
    const lines = git([
      "config",
      "--file",
      ".gitmodules",
      "--get-regexp",
      "path",
    ])
      .trim()
      .split("\n");
    for (const line of lines)
      if (line) submodules.add(line.replace(/^submodule\.[^ ]+\.path\s+/, ""));
  } catch {}
  // --untracked-files=all lists every new file; the default collapses a new directory to one
  // entry whose "size" is the directory itself, hiding files the plan has to account for.
  const statuses = parseStatus(
    gitBuffer(["status", "--porcelain=v2", "-z", "--untracked-files=all"]),
  );
  const allFiles = statuses
    .filter((item) => item.status !== "??")
    .map((item) => item.path);
  let hasHead = true;
  try {
    git(["rev-parse", "--verify", "--quiet", "HEAD"]);
  } catch {
    hasHead = false;
  }
  const stagedStats = numstat(["diff", "--cached", "--numstat", "-z"]);
  const unstagedStats = numstat(["diff", "--numstat", "-z"]);
  // With an unborn HEAD there is no baseline commit: "change vs HEAD" is undefined, so the
  // index and worktree diffs are summed instead of throwing on `git diff HEAD`.
  const totalStats = hasHead
    ? numstat(["diff", "HEAD", "--numstat", "-z"])
    : mergeNumstat([stagedStats, unstagedStats]);
  const diffCommands = hasHead
    ? [["diff", "HEAD", "-U0"]]
    : [
        ["diff", "--cached", "-U0"],
        ["diff", "-U0"],
      ];
  const fileObjects = allFiles.map((file) => {
    const status = statuses.find((item) => item.path === file)?.status ?? "  ";
    const stat = totalStats.get(file) ?? { additions: 0, deletions: 0 };
    const hunks = hunksFor(file, diffCommands);
    return {
      status,
      path: file,
      additions: stat.additions ?? null,
      deletions: stat.deletions ?? null,
      hunks: hunks.length,
      flags: flagsFor(file, submodules),
      headers: hunks,
    };
  });
  const staged = countStatus(statuses, "staged");
  const unstaged = countStatus(statuses, "unstaged");
  for (const stat of stagedStats.values()) {
    staged.additions += stat.additions ?? 0;
    staged.deletions += stat.deletions ?? 0;
  }
  for (const stat of unstagedStats.values()) {
    unstaged.additions += stat.additions ?? 0;
    unstaged.deletions += stat.deletions ?? 0;
  }
  const untrackedFiles = statuses
    .filter((item) => item.status === "??")
    .map((item) => {
      let bytes = 0;
      try {
        bytes = fs.statSync(path.join(root, item.path)).size;
      } catch {}
      return { path: item.path, bytes, flags: flagsFor(item.path, submodules) };
    });
  const bases = [];
  for (const ref of [
    "origin/main",
    "origin/dev",
    "origin/master",
    "main",
    "dev",
    "master",
    "origin/HEAD",
  ]) {
    try {
      const sha = git(["rev-parse", "--verify", ref]).trim();
      const counts = git([
        "rev-list",
        "--left-right",
        "--count",
        `${ref}...HEAD`,
      ])
        .trim()
        .split(/\s+/)
        .map(Number);
      bases.push({
        ref,
        sha: sha.slice(0, 7),
        ahead: counts[1] || 0,
        behind: counts[0] || 0,
      });
    } catch {}
  }
  const worktrees = [];
  try {
    const lines = git(["worktree", "list", "--porcelain"]).split("\n");
    let item;
    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        if (item) worktrees.push(item);
        item = { path: line.slice(9), branch: "detached", current: false };
      } else if (item && line.startsWith("branch "))
        item.branch = line.slice(7).replace(/^refs\/heads\//, "");
      else if (item && line === "detached") item.branch = "detached";
      if (item && realpath(item.path) === realpath(cwd)) item.current = true;
    }
    if (item) worktrees.push(item);
  } catch {}
  const hunkRows = [];
  for (const file of fileObjects)
    for (const [index, header] of file.headers.entries())
      hunkRows.push({ path: file.path, index: index + 1, header });
  const totals = {
    files: fileObjects.length,
    additions: fileObjects.reduce((n, f) => n + (f.additions ?? 0), 0),
    deletions: fileObjects.reduce((n, f) => n + (f.deletions ?? 0), 0),
    hunks: hunkRows.length,
    untracked: untrackedFiles.length,
  };
  const data = {
    repo,
    root,
    branch,
    head,
    bases,
    worktrees,
    staged,
    unstaged,
    untracked: { files: untrackedFiles.length },
    files: fileObjects,
    hunks: hunkRows,
    totals,
    "untracked-files": untrackedFiles,
  };
  if (jsonMode) {
    process.stdout.write(JSON.stringify(data) + "\n");
    return;
  }
  console.log(`repo: ${repo}`);
  console.log(`root: ${root}`);
  console.log(`branch: ${branch}`);
  console.log(`head: ${head}`);
  console.log(
    `bases: ${bases.length ? bases.map((b) => `${b.ref}=${b.sha} ahead=${b.ahead} behind=${b.behind}`).join(" | ") : "none"}`,
  );
  for (const worktree of worktrees)
    console.log(
      `worktrees: ${worktree.path} [${worktree.branch}] ${worktree.current ? "current" : "other"}`,
    );
  console.log(
    `staged: files=${staged.files} +${staged.additions} -${staged.deletions}`,
  );
  console.log(
    `unstaged: files=${unstaged.files} +${unstaged.additions} -${unstaged.deletions}`,
  );
  console.log(`untracked: files=${untrackedFiles.length}`);
  console.log(`files: ${fileObjects.length}`);
  for (const file of fileObjects)
    console.log(
      `  ${file.status} ${file.path} +${file.additions ?? "-"} -${file.deletions ?? "-"} hunks=${file.hunks}${file.flags.length ? ` ${file.flags.join(",")}` : ""}`,
    );
  console.log(`hunks: ${hunkRows.length}`);
  for (const hunk of hunkRows)
    console.log(`  ${hunk.path}#${hunk.index} ${hunk.header}`);
  console.log(`untracked-files: ${untrackedFiles.length}`);
  for (const file of untrackedFiles)
    console.log(
      `  ${file.path} ${file.bytes} ${file.flags.join(",")}`.trimEnd(),
    );
  console.log(
    `totals: files=${totals.files} +${totals.additions} -${totals.deletions} hunks=${totals.hunks} untracked=${totals.untracked}`,
  );
}

try {
  main();
} catch (error) {
  // Only the rev-parse gate reports "not a git repository"; an unexpected internal failure
  // says so, so a broken inventory is never mistaken for an empty one.
  const reason = String(error?.message ?? error)
    .split("\n")[0]
    .slice(0, 120);
  if (jsonMode)
    process.stdout.write(
      JSON.stringify({ error: `inventory failed: ${reason}` }) + "\n",
    );
  else process.stdout.write(`error: inventory failed: ${reason}\n`);
}
