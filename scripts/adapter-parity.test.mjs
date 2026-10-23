import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, symlinkSync, lstatSync, readlinkSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(t) {
  const home = mkdtempSync(join(tmpdir(), 'adapter-parity-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const hub = join(home, '.agents');
  mkdirSync(join(hub, 'skills', 'active'), { recursive: true });
  writeFileSync(join(hub, 'skills', 'active', 'SKILL.md'), '# Active');
  copyFileSync(new URL('../sync.sh', import.meta.url), join(hub, 'sync.sh'));
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
  manifest.symlinks = manifest.symlinks.filter(item => item.tool === 'antigravity' && item.type === 'directory');
  manifest.generated = manifest.generated.filter(item => item.tool === 'cursor-cli');
  writeFileSync(join(hub, 'manifest.json'), JSON.stringify(manifest));
  const cursor = join(home, '.cursor', 'skills');
  mkdirSync(cursor, { recursive: true });
  const run = command => {
    const result = spawnSync('bash', [join(hub, 'sync.sh'), command], {
      env: { ...process.env, HOME: home, HUB: hub, MANIFEST: join(hub, 'manifest.json') }, encoding: 'utf8',
    });
    assert.ifError(result.error);
    return { status: result.status, output: result.stdout + result.stderr };
  };
  return { home, hub, cursor, run };
}

test('migration and repair never recreate the deprecated Gemini skills mirror', t => {
  const { home, hub, run } = fixture(t);
  mkdirSync(join(home, '.gemini'), { recursive: true });
  symlinkSync(join(hub, 'skills'), join(home, '.gemini', 'skills'));
  for (const command of ['migrate', 'repair', 'migrate']) {
    const result = run(command);
    assert.equal(result.status, 0, result.output);
    assert.equal(existsSync(join(home, '.gemini', 'skills')), false, command);
    assert.equal(readlinkSync(join(home, '.gemini', 'antigravity-cli', 'plugins', 'hub', 'skills')), join(hub, 'skills'));
  }
});
