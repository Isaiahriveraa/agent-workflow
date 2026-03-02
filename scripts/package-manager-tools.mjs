import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();

const lockfileDetectors = [
  { manager: 'bun', files: ['bun.lock', 'bun.lockb'], source: 'bun lockfile' },
  { manager: 'pnpm', files: ['pnpm-lock.yaml'], source: 'pnpm lockfile' },
  { manager: 'yarn', files: ['yarn.lock'], source: 'yarn lockfile' },
  { manager: 'npm', files: ['package-lock.json'], source: 'package-lock' }
];

const walkUp = (startDir) => {
  const dirs = [];
  let current = path.resolve(startDir);

  while (true) {
    dirs.push(current);
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return dirs;
};

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const resolveDetection = (startDir = cwd) => {
  for (const dir of walkUp(startDir)) {
    const packageJsonPath = path.join(dir, 'package.json');
    const packageJson = fs.existsSync(packageJsonPath) ? readJson(packageJsonPath) : null;

    if (packageJson?.packageManager) {
      const manager = String(packageJson.packageManager).split('@')[0];
      return { manager, source: 'package.json#packageManager', root: dir };
    }

    for (const detector of lockfileDetectors) {
      for (const file of detector.files) {
        if (fs.existsSync(path.join(dir, file))) {
          return { manager: detector.manager, source: detector.source, root: dir };
        }
      }
    }

    if (packageJson) {
      return { manager: 'npm', source: 'package.json default', root: dir };
    }
  }

  return { manager: 'npm', source: 'fallback default', root: path.resolve(startDir) };
};

const splitArgs = (args) => {
  const separatorIndex = args.indexOf('--');
  if (separatorIndex === -1) {
    return { head: args, tail: [] };
  }

  return {
    head: args.slice(0, separatorIndex),
    tail: args.slice(separatorIndex + 1)
  };
};

const quote = (value) => (/\s/.test(value) ? JSON.stringify(value) : value);

const formatRun = (manager, script, extraArgs) => {
  const base = manager === 'npm' ? ['npm', 'run', script] : [manager, manager === 'yarn' ? script : 'run', script];
  if (manager === 'yarn') {
    base.splice(1, 1);
  }
  if (extraArgs.length > 0) {
    if (manager === 'npm') {
      base.push('--', ...extraArgs);
    } else {
      base.push(...extraArgs);
    }
  }
  return base.map(quote).join(' ');
};

const formatInstall = (manager, packages, dev = false) => {
  const args =
    manager === 'npm'
      ? ['npm', 'install', ...(dev ? ['-D'] : []), ...packages]
      : manager === 'yarn'
        ? ['yarn', 'add', ...(dev ? ['-D'] : []), ...packages]
        : manager === 'pnpm'
          ? ['pnpm', 'add', ...(dev ? ['-D'] : []), ...packages]
          : ['bun', 'add', ...(dev ? ['-d'] : []), ...packages];
  return args.map(quote).join(' ');
};

const formatExec = (manager, args) => {
  const base =
    manager === 'npm'
      ? ['npx', ...args]
      : manager === 'pnpm'
        ? ['pnpm', 'exec', ...args]
        : manager === 'yarn'
          ? ['yarn', ...args]
          : ['bunx', ...args];
  return base.map(quote).join(' ');
};

const output = (value) => {
  if (typeof value === 'string') {
    console.log(value);
  } else {
    console.log(JSON.stringify(value, null, 2));
  }
};

const command = process.argv[2];
const args = process.argv.slice(3);
const detection = resolveDetection(args[0] && ['detect', 'info'].includes(command) ? args[0] : cwd);

switch (command) {
  case 'detect':
    output(detection);
    break;
  case 'info':
    output({
      ...detection,
      install: formatInstall(detection.manager, ['<packages>']),
      installDev: formatInstall(detection.manager, ['<packages>'], true),
      run: formatRun(detection.manager, '<script>', ['<args>']),
      exec: formatExec(detection.manager, ['<binary>', '<args>'])
    });
    break;
  case 'run': {
    const { head, tail } = splitArgs(args);
    const [script, ...rest] = head;
    if (!script) {
      console.error('Usage: node scripts/package-manager-tools.mjs run <script> [-- extra args]');
      process.exitCode = 1;
      break;
    }
    output(formatRun(detection.manager, script, [...rest, ...tail]));
    break;
  }
  case 'install':
    if (args.length === 0) {
      console.error('Usage: node scripts/package-manager-tools.mjs install <packages...>');
      process.exitCode = 1;
      break;
    }
    output(formatInstall(detection.manager, args));
    break;
  case 'install-dev':
    if (args.length === 0) {
      console.error('Usage: node scripts/package-manager-tools.mjs install-dev <packages...>');
      process.exitCode = 1;
      break;
    }
    output(formatInstall(detection.manager, args, true));
    break;
  case 'exec':
    if (args.length === 0) {
      console.error('Usage: node scripts/package-manager-tools.mjs exec <binary> [args...]');
      process.exitCode = 1;
      break;
    }
    output(formatExec(detection.manager, args));
    break;
  default:
    console.error('Usage: node scripts/package-manager-tools.mjs <detect|info|run|install|install-dev|exec> [...]');
    process.exitCode = 1;
}
