import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const agentsRoot = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = process.env.CLAUDE_PLAN_SYNC_SOURCE_DIR
  ? path.resolve(process.env.CLAUDE_PLAN_SYNC_SOURCE_DIR)
  : path.join(os.homedir(), '.claude', 'plans');
const destDir = process.env.CLAUDE_PLAN_SYNC_DEST_DIR
  ? path.resolve(process.env.CLAUDE_PLAN_SYNC_DEST_DIR)
  : path.join(agentsRoot, 'thoughts', 'plans');
const quarantineDir = process.env.CLAUDE_PLAN_SYNC_QUARANTINE_DIR
  ? path.resolve(process.env.CLAUDE_PLAN_SYNC_QUARANTINE_DIR)
  : path.join(agentsRoot, 'thoughts', 'imported', 'claude-plans');
const manifestPath = process.env.CLAUDE_PLAN_SYNC_MANIFEST_PATH
  ? path.resolve(process.env.CLAUDE_PLAN_SYNC_MANIFEST_PATH)
  : path.join(agentsRoot, 'thoughts', 'imported', 'claude-plan-sync-manifest.json');

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const readJson = (filePath, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
};

const writeJson = (filePath, value) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const listMarkdownFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(dir, entry.name))
    .sort();
};

const hashContent = (content) =>
  crypto.createHash('sha256').update(content).digest('hex');

const hashFile = (filePath) =>
  hashContent(fs.readFileSync(filePath));

const ensureManifest = () => readJson(manifestPath, {
  version: 1,
  updatedAt: null,
  entries: []
});

const writeManifest = (manifest) => {
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
};

const replaceExtension = (filename, suffix) => {
  const extension = path.extname(filename);
  const base = path.basename(filename, extension);
  return `${base}${suffix}${extension}`;
};

const resolveImportPath = (filename, contentHash) => {
  const preferred = path.join(destDir, filename);
  if (!fs.existsSync(preferred)) {
    return preferred;
  }

  if (hashFile(preferred) === contentHash) {
    return preferred;
  }

  return path.join(destDir, replaceExtension(filename, `-${contentHash.slice(0, 8)}`));
};

const resolveQuarantinePath = (filename, contentHash) => {
  const preferred = path.join(quarantineDir, filename);
  if (!fs.existsSync(preferred)) {
    return preferred;
  }

  return path.join(quarantineDir, replaceExtension(filename, `-${contentHash.slice(0, 8)}`));
};

const importEntry = (filePath, manifest) => {
  const sourceStat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath);
  const contentHash = hashContent(content);
  const existing = manifest.entries.find((entry) =>
    entry.sourcePath === filePath &&
    entry.sourceHash === contentHash &&
    entry.sourceMtimeMs === sourceStat.mtimeMs
  );

  if (existing && fs.existsSync(existing.importedPath)) {
    return { type: 'skipped', reason: 'already-imported', entry: existing };
  }

  ensureDir(destDir);
  ensureDir(quarantineDir);

  const filename = path.basename(filePath);
  const importedPath = resolveImportPath(filename, contentHash);
  fs.writeFileSync(importedPath, content);

  const importedHash = hashFile(importedPath);
  if (importedHash !== contentHash) {
    fs.rmSync(importedPath, { force: true });
    throw new Error(`Imported plan hash mismatch for ${filePath}`);
  }

  const quarantinedPath = resolveQuarantinePath(filename, contentHash);
  fs.renameSync(filePath, quarantinedPath);

  const entry = {
    sourcePath: filePath,
    sourceHash: contentHash,
    sourceMtimeMs: sourceStat.mtimeMs,
    importedPath,
    importedHash,
    quarantinedPath,
    status: 'imported',
    importedAt: new Date().toISOString()
  };

  manifest.entries = manifest.entries.filter((item) => !(item.sourcePath === filePath && item.sourceHash === contentHash));
  manifest.entries.push(entry);

  return { type: 'imported', entry };
};

const scan = () => {
  const manifest = ensureManifest();
  const files = listMarkdownFiles(sourceDir);
  const pending = files.map((filePath) => {
    const sourceStat = fs.statSync(filePath);
    const sourceHash = hashFile(filePath);
    const existing = manifest.entries.find((entry) =>
      entry.sourcePath === filePath &&
      entry.sourceHash === sourceHash &&
      entry.sourceMtimeMs === sourceStat.mtimeMs &&
      fs.existsSync(entry.importedPath)
    );

    return {
      sourcePath: filePath,
      sourceHash,
      sourceMtimeMs: sourceStat.mtimeMs,
      status: existing ? 'already-imported' : 'pending'
    };
  });

  return {
    sourceDir,
    destDir,
    quarantineDir,
    manifestPath,
    pending,
    entries: manifest.entries
  };
};

const sync = () => {
  const manifest = ensureManifest();
  const files = listMarkdownFiles(sourceDir);
  const imported = [];
  const skipped = [];

  for (const filePath of files) {
    const result = importEntry(filePath, manifest);
    if (result.type === 'imported') {
      imported.push(result.entry);
    } else {
      skipped.push(result.entry);
    }
  }

  writeManifest(manifest);

  return {
    sourceDir,
    destDir,
    quarantineDir,
    manifestPath,
    imported,
    skipped
  };
};

const status = () => ({
  sourceDir,
  destDir,
  quarantineDir,
  manifestPath,
  entries: ensureManifest().entries,
  pending: scan().pending
});

const verify = () => {
  const manifest = ensureManifest();
  const checks = manifest.entries.map((entry) => ({
    importedPath: entry.importedPath,
    exists: fs.existsSync(entry.importedPath),
    hashMatches: fs.existsSync(entry.importedPath) ? hashFile(entry.importedPath) === entry.importedHash : false
  }));

  return {
    ok: checks.every((check) => check.exists && check.hashMatches),
    checks
  };
};

const pruneQuarantine = () => {
  ensureDir(quarantineDir);
  const pruned = [];
  for (const filePath of listMarkdownFiles(quarantineDir)) {
    fs.rmSync(filePath, { force: true });
    pruned.push(filePath);
  }
  return { pruned };
};

const command = process.argv[2] ?? 'status';

try {
  let output;
  switch (command) {
    case 'scan':
      output = scan();
      break;
    case 'sync':
      output = sync();
      break;
    case 'status':
      output = status();
      break;
    case 'verify':
      output = verify();
      break;
    case 'prune-quarantine':
      output = pruneQuarantine();
      break;
    default:
      throw new Error('Usage: node scripts/claude-plan-sync.mjs <scan|sync|status|verify|prune-quarantine>');
  }

  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
