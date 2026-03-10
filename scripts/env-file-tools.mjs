import fs from 'node:fs';
import path from 'node:path';

const stripWrappingQuotes = (value) => {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const exportPrefix = trimmed.startsWith('export ') ? 'export ' : '';
  const body = exportPrefix ? trimmed.slice(exportPrefix.length) : trimmed;
  const separatorIndex = body.indexOf('=');
  if (separatorIndex === -1) {
    return null;
  }

  const key = body.slice(0, separatorIndex).trim();
  const rawValue = body.slice(separatorIndex + 1).trim();
  if (!key) {
    return null;
  }

  return [key, stripWrappingQuotes(rawValue)];
};

export const loadEnvFile = ({ filePath, override = false } = {}) => {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    return {
      filePath: resolvedPath,
      loaded: false,
      applied: []
    };
  }

  const applied = [];
  const contents = fs.readFileSync(resolvedPath, 'utf8');
  for (const line of contents.split(/\r?\n/u)) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }

    const [key, value] = parsed;
    if (!override && Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }

    process.env[key] = value;
    applied.push(key);
  }

  return {
    filePath: resolvedPath,
    loaded: true,
    applied
  };
};

export const loadDefaultEnvFiles = ({ cwd = process.cwd(), override = false } = {}) => {
  const candidates = [
    path.join(cwd, '.env'),
    path.join(cwd, '.env.local')
  ];

  return candidates.map((filePath) => loadEnvFile({ filePath, override }));
};
