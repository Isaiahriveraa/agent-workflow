#!/usr/bin/env node
/**
 * memory-sync-tools.mjs
 * 
 * Explicitly parses active lessons/artifacts and flushes them to LanceDB/mem0.
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
  console.log("Usage: node scripts/memory-sync-tools.mjs flush [file|all]");
  process.exit(1);
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

  // If "all", we just trigger a generic flush or simulate it if the underlying script needs explicit files.
  // For the reinvented script, we keep it completely synchronous and explicit.
  if (target === 'all') {
    const lessonsDir = path.join(process.cwd(), '.planning', 'lessons');
    if (fs.existsSync(lessonsDir)) {
      const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.md') && !f.startsWith('queue') && !f.startsWith('pending'));
      
      let syncedCount = 0;
      for (const file of files) {
        const fullPath = path.join(lessonsDir, file);
        try {
          const result = spawnSync('node', [lessonTools, 'flush', '--file', fullPath], { encoding: 'utf8' });
          if (result.status === 0) syncedCount++;
        } catch (err) {
          console.error(`[Memory Sync] Failed to sync ${file}:`, err.message);
        }
      }
      console.log(`[Memory Sync] Sync complete. Flushed ${syncedCount} lesson(s) to the cognitive index natively.`);
    } else {
      console.log(`[Memory Sync] No .planning/lessons directory found. Nothing to sync.`);
    }
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
