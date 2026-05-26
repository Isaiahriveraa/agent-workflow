#!/usr/bin/env node
/**
 * memory-sync-tools.mjs
 * 
 * Explicitly parses active lessons/artifacts and flushes them to the memory backend (MemPalace).
 * Replaces the old detached implicit hook behavior.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const args = process.argv.slice(2);
const command = args[0];
const target = args[1] || 'all';

if (!command) {
  console.log("Usage: node scripts/memory-sync-tools.mjs <command> [options]");
  console.log("Commands:");
  console.log("  flush [file|all]    Sync lesson artifacts to memory index");
  console.log("  consolidate         Deduplicate, expire, and promote memories");
  console.log("    --dry-run         Preview changes without modifying data");
  console.log("    --verbose         Show detailed progress");
  process.exit(1);
}

if (command === 'consolidate') {
  const consolidateArgs = args.slice(1);
  const AGENTS_ROOT = process.env.AGENTS_ROOT
    ? path.resolve(process.env.AGENTS_ROOT)
    : path.join(os.homedir(), '.agents');

  const consolidationScript = path.join(AGENTS_ROOT, 'scripts', 'memory-consolidation.mjs');

  if (!fs.existsSync(consolidationScript)) {
    console.error('[Memory Sync] memory-consolidation.mjs not found.');
    process.exit(1);
  }

  const result = spawnSync('node', [consolidationScript, ...consolidateArgs], {
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env
  });
  process.exit(result.status ?? 0);
}

if (command === 'flush') {
  console.log(`[Memory Sync] Explicitly syncing ${target} artifacts to memory index...`);
  
  const AGENTS_ROOT = process.env.AGENTS_ROOT
    ? path.resolve(process.env.AGENTS_ROOT)
    : path.join(os.homedir(), '.agents');
    
  // The system's underlying lesson-tools handles the actual mem0 integration.
  const lessonTools = path.join(AGENTS_ROOT, 'scripts', 'lesson-tools.mjs');
  
  if (!fs.existsSync(lessonTools)) {
    console.log('[Memory Sync] WARNING: lesson-tools.mjs not found. Cannot flush to DB.');
    console.log('[Memory Sync] Simulated success. No records created.');
    process.exit(0);
  }

  // `.planning/` removed — lessons live in `thoughts/lessons/`
  if (target === 'all') {
    console.log(`[Memory Sync] .planning/ removed. Use thoughts/lessons/ directly.`);
  } else {
    // Sync specific file
    try {
      const result = spawnSync('node', [lessonTools, 'flush', '--file', target], { encoding: 'utf8' });
      if (result.status === 0) {
        console.log(`[Memory Sync] Sync complete for ${target}.`);
      } else {
        console.error(`[Memory Sync] Error flushing ${target}:`, result.stderr);
      }
    } catch (err) {
      console.error(`[Memory Sync] Execution failed:`, err.message);
    }
  }
}
