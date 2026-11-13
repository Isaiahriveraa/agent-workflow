import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const script = path.join(root, 'scripts/workflow-session.mjs');

function launch(t, mode, harness = 'pi', extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-session-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'launch.json');
  fs.writeFileSync(path.join(dir, harness), '#!/usr/bin/env node\nrequire("node:fs").writeFileSync(process.env.LAUNCH_OUTPUT, JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));\n', { mode: 0o755 });
  const before = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  const result = spawnSync(process.execPath, [script, mode, '--harness', harness, ...extra], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, LAUNCH_OUTPUT: output },
  });
  assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), before, 'launch must not change shared instructions');
  return { result, invocation: fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : null, dir };
}

test('starts a session with the requested profile, preserving cwd and arguments', t => {
  const { result, invocation, dir } = launch(t, 'sprint', 'pi', ['--model', 'example', 'Build a signup flow']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(invocation.cwd, fs.realpathSync(dir));
  assert.equal(invocation.args[0], '--append-system-prompt');
  assert.match(invocation.args[1], /Active session profile: sprint/);
  assert.match(invocation.args[1], /attempt/i);
  assert.doesNotMatch(invocation.args[1], /^# Agent Contract/m, 'harness already loads AGENTS.md; do not append it twice');
  assert.deepEqual(invocation.args.slice(2), ['--model', 'example', 'Build a signup flow']);
});

test('launches each mode independently on each supported harness', t => {
  for (const harness of ['pi', 'claude', 'codex']) {
    for (const mode of ['sprint', 'school-learn', 'school-fast', 'research', 'ideation', 'coding', 'tutor']) {
      const { result, invocation } = launch(t, mode, harness);
      assert.equal(result.status, 0, result.stderr);
      const prompt = harness === 'codex'
        ? JSON.parse(invocation.args[1].slice('developer_instructions='.length))
        : invocation.args[1];
      assert.match(prompt, new RegExp(`Active session profile: ${mode}`));
      assert.ok(prompt.length < 16000, 'startup must not embed the full coding contract');
    }
  }
});

test('terminal command aliases select a session without changing the global default', t => {
  const { dir } = launch(t, 'research');
  const alias = path.join(dir, 'sprint');
  fs.symlinkSync(script, alias);
  const output = path.join(dir, 'alias.json');
  const result = spawnSync(process.execPath, [alias], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, LAUNCH_OUTPUT: output, AGENT_HARNESS: 'pi' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(fs.readFileSync(output, 'utf8')).args[1], /Active session profile: sprint/);
});

test('aw starts a mode session', t => {
  const { dir } = launch(t, 'research');
  const output = path.join(dir, 'aw.json');
  const result = spawnSync(path.join(root, 'scripts/aw'), ['school-fast'], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, LAUNCH_OUTPUT: output, AGENT_HARNESS: 'pi' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(fs.readFileSync(output, 'utf8')).args[1], /Active session profile: school-fast/);
});

test('rejects invalid selections before invoking a harness', t => {
  for (const [mode, harness] of [['unknown', 'pi'], ['sprint', 'unknown']]) {
    const { result, invocation } = launch(t, mode, harness);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage:/);
    assert.equal(invocation, null);
  }
});
