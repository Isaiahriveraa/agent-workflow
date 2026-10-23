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

test('Cursor verification reports obsolete owned bridges and generation prunes only those bridges', t => {
  const { home, hub, cursor, run } = fixture(t);
  assert.equal(run('migrate').status, 0);
  symlinkSync(join(hub, 'skills', 'active'), join(cursor, 'my-alias'));
  symlinkSync('../../.agents/skills/active', join(cursor, 'relative-alias'));
  const aliasesVerification = run('verify');
  assert.equal(aliasesVerification.status, 0, aliasesVerification.output);
  mkdirSync(join(hub, 'skills', 'retired'), { recursive: true });
  symlinkSync(join(hub, 'skills', 'deleted'), join(cursor, 'deleted'));
  symlinkSync('../../.agents/skills/retired', join(cursor, 'retired'));
  symlinkSync(join(hub, 'skills', 'nested', 'custom'), join(cursor, 'nested'));
  symlinkSync(join(home, 'custom-skill'), join(cursor, 'external'));
  writeFileSync(join(cursor, 'local-file'), 'keep');
  mkdirSync(join(cursor, 'local-directory'));
  const verification = run('verify');
  assert.equal(verification.status, 1, verification.output);
  assert.match(verification.output, /stale skill bridges: deleted, retired/);
  const generation = run('gen-cursor-skills');
  assert.equal(generation.status, 0, generation.output);
  for (const name of ['deleted', 'retired']) {
    assert.throws(() => lstatSync(join(cursor, name)), { code: 'ENOENT' });
  }
  assert.equal(readlinkSync(join(cursor, 'nested')), join(hub, 'skills', 'nested', 'custom'));
  assert.equal(readlinkSync(join(cursor, 'external')), join(home, 'custom-skill'));
  assert.equal(readlinkSync(join(cursor, 'my-alias')), join(hub, 'skills', 'active'));
  assert.equal(readlinkSync(join(cursor, 'relative-alias')), '../../.agents/skills/active');
  assert.equal(readFileSync(join(cursor, 'local-file'), 'utf8'), 'keep');
  assert.ok(lstatSync(join(cursor, 'local-directory')).isDirectory());
  assert.equal(run('verify').status, 0);
  assert.equal(run('gen-cursor-skills').status, 0);
});
