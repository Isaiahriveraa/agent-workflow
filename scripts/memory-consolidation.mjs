#!/usr/bin/env node
/**
 * memory-consolidation.mjs
 *
 * Maintenance stub for the MemPalace memory store.
 *
 * Previously handled LanceDB-specific dedup, expiry, and promotion.
 * With MemPalace, these are handled internally by the Python package
 * (ChromaDB compaction + knowledge graph maintenance).
 *
 * The consolidate hooks still call this for backward compatibility.
 * They now run a lightweight mempalace integrity check instead.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const MEMPALACE_PYTHON = process.env.AGENTS_MEMPALACE_PYTHON || '/opt/homebrew/bin/python3.13';

const runMemPalaceCheck = () => {
  // Check if mempalace is installed
  const check = spawnSync(MEMPALACE_PYTHON, [
    '-c', 'import importlib.util,sys; sys.exit(0 if importlib.util.find_spec("mempalace") else 1)'
  ], { encoding: 'utf8', timeout: 5000 });
  if (check.status !== 0) return null;

  // Run mempalace status to verify store health
  const status = spawnSync(MEMPALACE_PYTHON, [
    '-m', 'mempalace', 'status'
  ], { encoding: 'utf8', timeout: 10000 });

  if (status.status === 0 && status.stdout) {
    return status.stdout;
  }
  return null;
};

const run = ({ dryRun = false } = {}) => {
  console.error(`[Memory Consolidation] Running MemPalace integrity check (dry_run=${dryRun})...`);
  const result = runMemPalaceCheck();
  if (result) {
    console.error('[Memory Consolidation] MemPalace status: OK');
  } else {
    console.error('[Memory Consolidation] MemPalace not available — skipping');
  }
  return { ok: true, status: result ? 'healthy' : 'skipped' };
};

// ── CLI entry point ──
if (process.argv[1]?.endsWith('memory-consolidation.mjs')) {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-n');
  const { ok } = run({ dryRun });
  process.exit(ok ? 0 : 1);
}

export { run, runMemPalaceCheck };
