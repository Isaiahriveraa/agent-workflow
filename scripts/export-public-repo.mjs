import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultDest = path.resolve(repoRoot, '..', `${path.basename(repoRoot)}-public`);

const parseArgs = (argv) => {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--dest') {
      parsed.dest = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === '--init-git') {
      parsed.initGit = true;
    }
  }

  return parsed;
};

const args = parseArgs(process.argv.slice(2));
const destRoot = args.dest ? path.resolve(args.dest) : defaultDest;

if (destRoot === repoRoot || destRoot.startsWith(`${repoRoot}${path.sep}`)) {
  console.error('Destination must be outside the source repo.');
  process.exit(1);
}

if (fs.existsSync(destRoot) && fs.readdirSync(destRoot).length > 0) {
  console.error(`Destination already exists and is not empty: ${destRoot}`);
  process.exit(1);
}

fs.mkdirSync(destRoot, { recursive: true });

const trackedFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '-z'],
  { cwd: repoRoot, encoding: 'utf8' }
)
  .split('\0')
  .filter(Boolean)
  .sort();

for (const relativePath of trackedFiles) {
  const sourcePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    continue;
  }

  const targetPath = path.join(destRoot, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

if (args.initGit) {
  execFileSync('git', ['init', '-b', 'main'], { cwd: destRoot, stdio: 'ignore' });
}

console.log(JSON.stringify({
  ok: true,
  source: repoRoot,
  destination: destRoot,
  filesExported: trackedFiles.length,
  gitInitialized: Boolean(args.initGit)
}, null, 2));
