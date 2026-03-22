import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commandsRoot = path.join(root, 'commands');

const commandFiles = new Map();
const commandAliasKeys = new Map();

const normalizeSegment = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');

const normalizeRelativeCommandKey = (value) =>
  value
    .split('/')
    .map((segment) => normalizeSegment(segment))
    .join('/');

const indexCommands = (dir, prefix = '') => {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      indexCommands(absolutePath, path.posix.join(prefix, entry.name));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

    const relativePath = path.posix.join(prefix, entry.name.slice(0, -3));
    commandFiles.set(relativePath, path.join(commandsRoot, `${relativePath}.md`));

    const aliasKey = normalizeRelativeCommandKey(relativePath);
    if (!commandAliasKeys.has(aliasKey)) {
      commandAliasKeys.set(aliasKey, relativePath);
      continue;
    }

    const existing = commandAliasKeys.get(aliasKey);
    if (existing !== relativePath) {
      commandAliasKeys.delete(aliasKey);
    }
  }
};

indexCommands(commandsRoot);

const parseInvocation = (value) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';

  const first = tokens[0].replace(/^\/+/, '');
  if (!first) return '';

  if (first === 'gsd') {
    const subcommand = tokens[1] ? normalizeSegment(tokens[1]) : 'help';
    return `gsd/${subcommand}`;
  }

  if (first === 'gsd:' || first === 'gsd-' || first === 'gsd_') {
    return 'gsd/help';
  }

  if (first.startsWith('gsd:')) {
    const subcommand = first.slice(4).trim();
    return `gsd/${normalizeSegment(subcommand || 'help')}`;
  }

  if (/^gsd[-_]/.test(first)) {
    return `gsd/${normalizeSegment(first.slice(4) || 'help')}`;
  }

  return first;
};

export const resolveWorkflowCommand = (value) => {
  const invocation = parseInvocation(value);
  if (!invocation) {
    throw new Error('Workflow command reference is required');
  }

  if (commandFiles.has(invocation)) {
    return {
      diagnostics: {
        contract_version: 'workflow-command-resolution.v1',
        requested: String(value ?? '').trim(),
        invocation,
        alias_applied: false,
        canonical_changed: false
      },
      invocation,
      canonicalSlug: invocation,
      commandPath: commandFiles.get(invocation)
    };
  }

  const aliasKey = normalizeRelativeCommandKey(invocation);
  const canonicalSlug = commandAliasKeys.get(aliasKey);
  if (!canonicalSlug) {
    throw new Error(`Unknown workflow command reference: ${value}`);
  }

  return {
    diagnostics: {
      contract_version: 'workflow-command-resolution.v1',
      requested: String(value ?? '').trim(),
      invocation,
      alias_applied: true,
      canonical_changed: canonicalSlug !== invocation
    },
    invocation,
    canonicalSlug,
    commandPath: commandFiles.get(canonicalSlug)
  };
};

export const normalizeWorkflowCommandName = (value) => {
  const { canonicalSlug } = resolveWorkflowCommand(value);
  if (!canonicalSlug.includes('/')) {
    return canonicalSlug;
  }

  const [namespace, subcommand] = canonicalSlug.split('/');
  return `${namespace}:${subcommand}`;
};
