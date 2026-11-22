#!/usr/bin/env node
// Flags raw color literals in source files so colors come from named tokens.
//
// Usage: node check-tokens.mjs [--allow <substring>]... <file-or-dir>...
// Exit 0 when clean, 1 when raw colors are found, 2 on bad usage.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SOURCE_EXTENSIONS = new Set([
  '.css', '.scss', '.sass', '.less', '.js', '.jsx', '.mjs', '.ts', '.tsx',
  '.vue', '.svelte', '.astro', '.html',
]);
const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const TOKEN_BASENAME = /^(tokens?|theme)[^/]*$/i;

const PATTERNS = [
  {
    kind: 'hex',
    re: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g,
  },
  {
    kind: 'function',
    re: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^)]*\)/gi,
  },
];

export function isTokenFile(path) {
  return TOKEN_BASENAME.test(basename(path));
}

function isCommentLine(trimmed) {
  return trimmed.startsWith('//') || trimmed.startsWith('/*') ||
    trimmed.startsWith('*') || trimmed.startsWith('<!--');
}

export function findRawColors(text) {
  const findings = [];
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (isCommentLine(line.trim())) return;
    for (const { kind, re } of PATTERNS) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(line)) !== null) {
        findings.push({ line: index + 1, value: match[0], kind });
      }
    }
  });
  return findings;
}

function collectFiles(target, allow, out) {
  const stats = statSync(target);
  if (stats.isDirectory()) {
    for (const entry of readdirSync(target)) {
      if (IGNORED_DIRECTORIES.has(entry)) continue;
      collectFiles(join(target, entry), allow, out);
    }
    return out;
  }
  if (!SOURCE_EXTENSIONS.has(extname(target))) return out;
  if (isTokenFile(target)) return out;
  if (allow.some((part) => target.includes(part))) return out;
  out.push(target);
  return out;
}

function main(argv) {
  const allow = [];
  const targets = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--allow') {
      const value = argv[i + 1];
      if (!value) {
        console.error('check-tokens: --allow needs a path substring');
        return 2;
      }
      allow.push(value);
      i += 1;
    } else {
      targets.push(argv[i]);
    }
  }
  if (targets.length === 0) {
    console.error('usage: check-tokens.mjs [--allow <substring>]... <file-or-dir>...');
    return 2;
  }

  const files = [];
  for (const target of targets) {
    try {
      collectFiles(target, allow, files);
    } catch (error) {
      console.error(`check-tokens: cannot read ${target}: ${error.message}`);
      return 2;
    }
  }

  let total = 0;
  for (const file of files) {
    const findings = findRawColors(readFileSync(file, 'utf8'));
    for (const finding of findings) {
      console.log(`${file}:${finding.line}: raw color ${finding.value} — use a token`);
    }
    total += findings.length;
  }

  if (total > 0) {
    console.log(`${total} raw color(s) found. Replace each with a token from the token file.`);
    return 1;
  }
  console.log(`No raw colors found in ${files.length} file(s).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
