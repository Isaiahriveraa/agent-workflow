import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const cwd = process.cwd();

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const detectPackageManager = () => {
  const output = execFileSync('node', ['scripts/package-manager-tools.mjs', 'detect'], {
    cwd,
    encoding: 'utf8'
  });
  return JSON.parse(output);
};

const detectScripts = () => {
  const packageJson = readJson(path.join(cwd, 'package.json'));
  return packageJson?.scripts ?? {};
};

const hasMakefile = () => fs.existsSync(path.join(cwd, 'Makefile'));

const verificationPriority = [
  'validate:ssot',
  'check',
  'lint',
  'typecheck',
  'build',
  'test'
];

const classifyScript = (name) => {
  if (/^validate(?::|$)/.test(name)) return 'validate';
  if (/^(lint)(:|$)/.test(name)) return 'lint';
  if (/^(typecheck|check-types)(:|$)/.test(name)) return 'typecheck';
  if (/^(build)(:|$)/.test(name)) return 'build';
  if (/^(test)(:|$)/.test(name)) return 'test';
  if (/^(check)(:|$)/.test(name)) return 'check';
  return null;
};

const pmRun = (script) =>
  execFileSync('node', ['scripts/package-manager-tools.mjs', 'run', script], {
    cwd,
    encoding: 'utf8'
  }).trim();

const detect = () => {
  const packageManager = detectPackageManager();
  const scripts = detectScripts();
  const availableScripts = Object.keys(scripts);
  const classified = availableScripts
    .map((name) => ({ name, type: classifyScript(name), command: pmRun(name) }))
    .filter((entry) => entry.type);

  return {
    packageManager,
    makefile: hasMakefile(),
    scripts: classified
  };
};

const plan = () => {
  const result = detect();
  const scriptMap = new Map(result.scripts.map((entry) => [entry.name, entry]));

  const preferred = [];

  if (scriptMap.has('validate:ssot')) preferred.push(scriptMap.get('validate:ssot'));
  if (scriptMap.has('test')) preferred.push(scriptMap.get('test'));
  if (preferred.length === 0) {
    for (const key of verificationPriority) {
      for (const entry of result.scripts) {
        if (entry.name === key || entry.type === key) {
          preferred.push(entry);
        }
      }
    }
  }

  const seen = new Set();
  const uniquePreferred = preferred.filter((entry) => {
    if (!entry || seen.has(entry.name)) return false;
    seen.add(entry.name);
    return true;
  });

  const fallback = result.scripts.filter((entry) => !seen.has(entry.name));

  return {
    packageManager: result.packageManager,
    preferred: uniquePreferred,
    fallback,
    makefile: result.makefile
  };
};

const runbook = () => {
  const result = plan();
  return {
    packageManager: result.packageManager.manager,
    preferredCommands: result.preferred.map((entry) => entry.command),
    fallbackCommands: result.fallback.map((entry) => entry.command)
  };
};

const command = process.argv[2];

switch (command) {
  case 'detect':
    console.log(JSON.stringify(detect(), null, 2));
    break;
  case 'plan':
    console.log(JSON.stringify(plan(), null, 2));
    break;
  case 'runbook':
    console.log(JSON.stringify(runbook(), null, 2));
    break;
  default:
    console.error('Usage: node scripts/verification-tools.mjs <detect|plan|runbook>');
    process.exitCode = 1;
}
