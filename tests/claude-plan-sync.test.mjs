import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);

const runSyncTool = (args, env) =>
  execFileSync('node', ['scripts/claude-plan-sync.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env
    }
  });

const createFixture = () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-claude-plan-sync-'));
  const sourceDir = path.join(tmpRoot, 'claude-plans');
  const destDir = path.join(tmpRoot, 'thoughts', 'plans');
  const quarantineDir = path.join(tmpRoot, 'thoughts', 'imported', 'claude-plans');
  const manifestPath = path.join(tmpRoot, 'thoughts', 'imported', 'claude-plan-sync-manifest.json');

  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(destDir, { recursive: true });

  return {
    tmpRoot,
    env: {
      CLAUDE_PLAN_SYNC_SOURCE_DIR: sourceDir,
      CLAUDE_PLAN_SYNC_DEST_DIR: destDir,
      CLAUDE_PLAN_SYNC_QUARANTINE_DIR: quarantineDir,
      CLAUDE_PLAN_SYNC_MANIFEST_PATH: manifestPath
    },
    sourceDir,
    destDir,
    quarantineDir,
    manifestPath
  };
};

test('sync imports a new Claude-native plan into canonical thoughts storage and quarantines the source', () => {
  const fixture = createFixture();
  const sourcePath = path.join(fixture.sourceDir, 'native-plan.md');
  fs.writeFileSync(sourcePath, '# Native Plan\n');

  try {
    const output = JSON.parse(runSyncTool(['sync'], fixture.env));

    assert.equal(output.imported.length, 1);
    assert.equal(output.skipped.length, 0);

    const importedPath = output.imported[0].importedPath;
    const quarantinedPath = output.imported[0].quarantinedPath;

    assert.ok(fs.existsSync(importedPath));
    assert.equal(fs.readFileSync(importedPath, 'utf8'), '# Native Plan\n');
    assert.ok(fs.existsSync(quarantinedPath));
    assert.equal(fs.existsSync(sourcePath), false);

    const manifest = JSON.parse(fs.readFileSync(fixture.manifestPath, 'utf8'));
    assert.equal(manifest.entries.length, 1);
    assert.equal(manifest.entries[0].importedPath, importedPath);
  } finally {
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
});

test('sync is idempotent after a successful import', () => {
  const fixture = createFixture();
  fs.writeFileSync(path.join(fixture.sourceDir, 'native-plan.md'), '# Native Plan\n');

  try {
    JSON.parse(runSyncTool(['sync'], fixture.env));
    const second = JSON.parse(runSyncTool(['sync'], fixture.env));

    assert.equal(second.imported.length, 0);
    assert.equal(second.skipped.length, 0);
    assert.equal(fs.readdirSync(fixture.destDir).filter((entry) => entry.endsWith('.md')).length, 1);
  } finally {
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
});

test('sync resolves filename collisions deterministically with a hash suffix', () => {
  const fixture = createFixture();
  const existingPath = path.join(fixture.destDir, 'collision.md');
  const sourcePath = path.join(fixture.sourceDir, 'collision.md');
  fs.writeFileSync(existingPath, '# Existing Plan\n');
  fs.writeFileSync(sourcePath, '# Imported Plan\n');

  try {
    const output = JSON.parse(runSyncTool(['sync'], fixture.env));
    const importedPath = output.imported[0].importedPath;

    assert.notEqual(importedPath, existingPath);
    assert.match(path.basename(importedPath), /^collision-[0-9a-f]{8}\.md$/);
    assert.equal(fs.readFileSync(importedPath, 'utf8'), '# Imported Plan\n');
  } finally {
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
});
