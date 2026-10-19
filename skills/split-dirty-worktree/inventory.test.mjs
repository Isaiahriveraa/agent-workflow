import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const inventory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "inventory.mjs",
);

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function makeRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-"));
  git(repo, ["init", "-q"]);
  git(repo, ["config", "user.email", "test@example.com"]);
  git(repo, ["config", "user.name", "test"]);
  git(repo, ["config", "commit.gpgsign", "false"]);
  return repo;
}

function inventoryJson(repo) {
  const output = execFileSync(
    process.execPath,
    [inventory, "--json", "--cwd", repo],
    { encoding: "utf8" },
  );
  return JSON.parse(output);
}

test("hunk rows carry the exact lines each hunk adds and removes", () => {
  const repo = makeRepo();
  try {
    const original = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
    fs.writeFileSync(path.join(repo, "a.txt"), `${original.join("\n")}\n`);
    fs.writeFileSync(path.join(repo, "b.txt"), "old\n");
    git(repo, ["add", "."]);
    git(repo, ["commit", "-qm", "base"]);

    // Line 2 becomes two lines (+2 -1); lines 15-17 are removed (+0 -3).
    const edited = original.flatMap((line, index) => {
      if (index === 1) return ["two a", "two b"];
      if (index >= 14 && index <= 16) return [];
      return [line];
    });
    fs.writeFileSync(path.join(repo, "a.txt"), `${edited.join("\n")}\n`);
    // A single-line hunk has an omitted count in its header, which means one line.
    fs.writeFileSync(path.join(repo, "b.txt"), "new\n");

    const data = inventoryJson(repo);
    const aHunks = data.hunks.filter((hunk) => hunk.path === "a.txt");
    const bHunks = data.hunks.filter((hunk) => hunk.path === "b.txt");

    assert.deepEqual(
      aHunks.map(({ additions, deletions }) => ({ additions, deletions })),
      [
        { additions: 2, deletions: 1 },
        { additions: 0, deletions: 3 },
      ],
    );
    assert.deepEqual(
      bHunks.map(({ additions, deletions }) => ({ additions, deletions })),
      [{ additions: 1, deletions: 1 }],
    );

    // Hunk counts must add up to git's per-file numstat, or preview totals drift from GitHub.
    const aFile = data.files.find((file) => file.path === "a.txt");
    assert.equal(
      aHunks.reduce((sum, hunk) => sum + hunk.additions, 0),
      aFile.additions,
    );
    assert.equal(
      aHunks.reduce((sum, hunk) => sum + hunk.deletions, 0),
      aFile.deletions,
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
