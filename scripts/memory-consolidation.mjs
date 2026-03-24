#!/usr/bin/env node
/**
 * memory-consolidation.mjs
 *
 * Batch maintenance for the LanceDB memory store:
 *   1. Deduplicate near-identical vectors (cosine similarity > threshold)
 *   2. Expire stale, low-confidence memories beyond a max age
 *   3. Promote high-usage project memories to the shared scope
 *   4. Clean up smoke/debug test tables
 *
 * Designed to run on-demand via `memory-sync-tools.mjs consolidate`
 * or on a schedule via the future daemon manager (PR #13).
 */

import fs from 'node:fs';
import path from 'node:path';
import { connect } from '@lancedb/lancedb';
import Database from 'better-sqlite3';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DEDUP_THRESHOLD = 0.95;
const DEFAULT_MAX_AGE_DAYS = 90;
const DEFAULT_MIN_CONFIDENCE_FOR_EXPIRY = 0.4;
const DEFAULT_PROMOTION_MIN_USAGE = 5;
const LIFECYCLE_DB_FILENAME = 'memory_lifecycle.db';
const SMOKE_DEBUG_TABLE_PATTERN = /_(smoke|debug)_\d+$/;

// ---------------------------------------------------------------------------
// Lifecycle SQLite (usage tracking + consolidation log)
// ---------------------------------------------------------------------------

export const openLifecycleDb = (agentsMemoryDir) => {
  const dbPath = path.join(agentsMemoryDir, LIFECYCLE_DB_FILENAME);
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_lifecycle (
      memory_id   TEXT PRIMARY KEY,
      table_name  TEXT NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 0,
      last_used   TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      promoted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS consolidation_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ran_at      TEXT NOT NULL DEFAULT (datetime('now')),
      dedup_removed    INTEGER NOT NULL DEFAULT 0,
      expired_removed  INTEGER NOT NULL DEFAULT 0,
      promoted         INTEGER NOT NULL DEFAULT 0,
      tables_cleaned   INTEGER NOT NULL DEFAULT 0,
      dry_run          INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_lifecycle_table
      ON memory_lifecycle(table_name);
    CREATE INDEX IF NOT EXISTS idx_lifecycle_usage
      ON memory_lifecycle(usage_count DESC);
  `);

  return db;
};

export const incrementUsage = (db, memoryId, tableName) => {
  const stmt = db.prepare(`
    INSERT INTO memory_lifecycle (memory_id, table_name, usage_count, last_used)
    VALUES (?, ?, 1, datetime('now'))
    ON CONFLICT(memory_id) DO UPDATE SET
      usage_count = usage_count + 1,
      last_used   = datetime('now')
  `);
  stmt.run(memoryId, tableName);
};

export const getUsageCount = (db, memoryId) => {
  const row = db.prepare('SELECT usage_count FROM memory_lifecycle WHERE memory_id = ?').get(memoryId);
  return row?.usage_count ?? 0;
};

const getHighUsageMemoryIds = (db, tableName, minUsage) => {
  const rows = db.prepare(
    'SELECT memory_id FROM memory_lifecycle WHERE table_name = ? AND usage_count >= ? AND promoted_at IS NULL'
  ).all(tableName, minUsage);
  return rows.map((r) => r.memory_id);
};

const markPromoted = (db, memoryId) => {
  db.prepare('UPDATE memory_lifecycle SET promoted_at = datetime(\'now\') WHERE memory_id = ?').run(memoryId);
};

const deleteLifecycleRow = (db, memoryId) => {
  db.prepare('DELETE FROM memory_lifecycle WHERE memory_id = ?').run(memoryId);
};

const logConsolidation = (db, stats, dryRun) => {
  db.prepare(`
    INSERT INTO consolidation_log (dedup_removed, expired_removed, promoted, tables_cleaned, dry_run)
    VALUES (?, ?, ?, ?, ?)
  `).run(stats.dedupRemoved, stats.expiredRemoved, stats.promoted, stats.tablesCleaned, dryRun ? 1 : 0);
};

// ---------------------------------------------------------------------------
// LanceDB helpers
// ---------------------------------------------------------------------------

const listLanceTables = async (dbPath) => {
  const conn = await connect(dbPath);
  return conn.tableNames();
};

const openLanceTable = async (dbPath, tableName) => {
  const conn = await connect(dbPath);
  try {
    return await conn.openTable(tableName);
  } catch {
    return null;
  }
};

const dropLanceTable = async (dbPath, tableName) => {
  const conn = await connect(dbPath);
  await conn.dropTable(tableName);
};

const getAllRows = async (table) => {
  const rows = await table.query().limit(100_000).toArray();
  return rows;
};

const parsePayload = (row) => {
  if (typeof row.payload_json === 'string' && row.payload_json.length > 0) {
    try {
      return JSON.parse(row.payload_json);
    } catch {
      return {};
    }
  }
  return {};
};

// ---------------------------------------------------------------------------
// 1. Deduplication (index-accelerated via LanceDB vector search)
// ---------------------------------------------------------------------------

const NEIGHBOR_SEARCH_LIMIT = 16;

const pickWorse = (rowA, payloadA, rowB, payloadB) => {
  const confA = Number(payloadA.confidence ?? payloadA.score ?? 0);
  const confB = Number(payloadB.confidence ?? payloadB.score ?? 0);
  if (confA !== confB) return confA < confB ? rowA._mem0_id : rowB._mem0_id;
  const dateA = payloadA.created_at ?? '';
  const dateB = payloadB.created_at ?? '';
  return dateA < dateB ? rowA._mem0_id : rowB._mem0_id;
};

const deduplicateTable = async (table, _tableName, threshold, dryRun, lifecycleDb) => {
  const rows = await getAllRows(table);
  if (rows.length < 2) return 0;

  // Use LanceDB's indexed search: for each row, find its nearest neighbors
  // within the cosine distance threshold. O(n·k) instead of O(n²).
  const maxDistance = 1 - threshold; // cosine distance = 1 - similarity
  const toRemove = new Set();
  const rowById = new Map(rows.map((r) => [r._mem0_id, r]));
  const payloadCache = new Map();

  const getPayload = (row) => {
    if (!payloadCache.has(row._mem0_id)) payloadCache.set(row._mem0_id, parsePayload(row));
    return payloadCache.get(row._mem0_id);
  };

  for (const row of rows) {
    if (toRemove.has(row._mem0_id)) continue;

    const neighbors = await table
      .search(row.vector)
      .distanceType('cosine')
      .limit(NEIGHBOR_SEARCH_LIMIT)
      .toArray();

    for (const neighbor of neighbors) {
      if (neighbor._mem0_id === row._mem0_id) continue;
      if (toRemove.has(neighbor._mem0_id)) continue;
      if (neighbor._distance > maxDistance) continue;

      const neighborRow = rowById.get(neighbor._mem0_id) ?? neighbor;
      const loserId = pickWorse(row, getPayload(row), neighborRow, getPayload(neighborRow));
      toRemove.add(loserId);
      if (loserId === row._mem0_id) break; // this row lost, stop searching its neighbors
    }
  }

  if (toRemove.size === 0) return 0;

  if (!dryRun) {
    for (const idx of toRemove) {
      const memId = rows[idx]._mem0_id;
      if (memId) {
        await table.delete(`_mem0_id = '${String(memId).replace(/'/g, "''")}'`);
        deleteLifecycleRow(lifecycleDb, memId);
      }
    }
  }

  return toRemove.size;
};

// ---------------------------------------------------------------------------
// 2. Expiry
// ---------------------------------------------------------------------------

const expireStaleMemories = async (table, _tableName, maxAgeDays, minConfidence, dryRun, lifecycleDb) => {
  const rows = await getAllRows(table);
  const cutoff = new Date(Date.now() - maxAgeDays * 86_400_000).toISOString();
  let removed = 0;

  for (const row of rows) {
    const payload = parsePayload(row);
    const createdAt = payload.created_at ?? '';
    const confidence = Number(payload.confidence ?? payload.score ?? 0);

    if (createdAt && createdAt < cutoff && confidence < minConfidence) {
      if (!dryRun && row._mem0_id) {
        await table.delete(`_mem0_id = '${String(row._mem0_id).replace(/'/g, "''")}'`);
        deleteLifecycleRow(lifecycleDb, row._mem0_id);
      }
      removed++;
    }
  }

  return removed;
};

// ---------------------------------------------------------------------------
// 3. Promotion (project → shared)
// ---------------------------------------------------------------------------

const promoteHighUsage = async (dbPath, config, lifecycleDb, minUsage, dryRun) => {
  const tableNames = await listLanceTables(dbPath);
  const sharedTableBase = `${config.tableBase}_agents_shared`;
  let promoted = 0;

  for (const tableName of tableNames) {
    // Only promote from project tables, not shared/smoke/debug
    if (!tableName.startsWith(`${config.tableBase}_project_`)) continue;
    if (SMOKE_DEBUG_TABLE_PATTERN.test(tableName)) continue;

    const highUsageIds = getHighUsageMemoryIds(lifecycleDb, tableName, minUsage);
    if (highUsageIds.length === 0) continue;

    const table = await openLanceTable(dbPath, tableName);
    if (!table) continue;

    const sharedTable = await openLanceTable(dbPath, sharedTableBase);

    for (const memId of highUsageIds) {
      const rows = await table.query()
        .where(`_mem0_id = '${String(memId).replace(/'/g, "''")}'`)
        .limit(1)
        .toArray();

      if (rows.length === 0) continue;

      const row = rows[0];
      const payload = parsePayload(row);

      // Only promote lesson and user_preference kinds (shared scope allowed kinds)
      const kind = payload.memory_kind;
      if (kind !== 'lesson' && kind !== 'user_preference') continue;

      if (!dryRun) {
        // Write to shared table
        const promotedPayload = {
          ...payload,
          scope: 'shared',
          promoted_from_table: tableName,
          promoted_at: new Date().toISOString()
        };

        const newRow = {
          vector: row.vector,
          _mem0_id: `promoted_${memId}`,
          idempotency_key: row.idempotency_key ?? null,
          payload_json: JSON.stringify(promotedPayload)
        };

        if (sharedTable) {
          await sharedTable.add([newRow]);
        } else {
          // Create the shared table with this first row
          const conn = await connect(dbPath);
          await conn.createTable(sharedTableBase, [newRow]);
        }

        markPromoted(lifecycleDb, memId);
      }

      promoted++;
    }
  }

  return promoted;
};

// ---------------------------------------------------------------------------
// 4. Clean up test tables
// ---------------------------------------------------------------------------

const cleanTestTables = async (dbPath, dryRun) => {
  const tableNames = await listLanceTables(dbPath);
  let cleaned = 0;

  for (const name of tableNames) {
    if (SMOKE_DEBUG_TABLE_PATTERN.test(name)) {
      if (!dryRun) {
        await dropLanceTable(dbPath, name);
      }
      cleaned++;
    }
  }

  return cleaned;
};

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export const runConsolidation = async ({
  lanceDbPath,
  agentsMemoryDir,
  tableBase = 'agents_memory_v1',
  dedupThreshold = DEFAULT_DEDUP_THRESHOLD,
  maxAgeDays = DEFAULT_MAX_AGE_DAYS,
  minConfidenceForExpiry = DEFAULT_MIN_CONFIDENCE_FOR_EXPIRY,
  promotionMinUsage = DEFAULT_PROMOTION_MIN_USAGE,
  dryRun = false,
  verbose = false
} = {}) => {
  const log = verbose ? (...a) => console.log('[Consolidation]', ...a) : () => {};

  if (!lanceDbPath || !fs.existsSync(lanceDbPath)) {
    throw new Error(`LanceDB path not found: ${lanceDbPath}`);
  }

  const memDir = agentsMemoryDir ?? path.dirname(lanceDbPath);
  const lifecycleDb = openLifecycleDb(memDir);

  const stats = {
    dedupRemoved: 0,
    expiredRemoved: 0,
    promoted: 0,
    tablesCleaned: 0,
    tablesProcessed: 0
  };

  try {
    // Phase 1: Clean test tables
    log('Cleaning smoke/debug test tables...');
    stats.tablesCleaned = await cleanTestTables(lanceDbPath, dryRun);
    log(`  ${dryRun ? 'Would remove' : 'Removed'} ${stats.tablesCleaned} test table(s)`);

    // Phase 2: Dedup + expiry per real table
    const tableNames = await listLanceTables(lanceDbPath);
    const realTables = tableNames.filter((n) => !SMOKE_DEBUG_TABLE_PATTERN.test(n));

    for (const tableName of realTables) {
      log(`Processing ${tableName}...`);
      const table = await openLanceTable(lanceDbPath, tableName);
      if (!table) {
        log(`  Skipped (could not open)`);
        continue;
      }

      const deduped = await deduplicateTable(table, tableName, dedupThreshold, dryRun, lifecycleDb);
      stats.dedupRemoved += deduped;
      if (deduped > 0) log(`  ${dryRun ? 'Would deduplicate' : 'Deduplicated'} ${deduped} row(s)`);

      const expired = await expireStaleMemories(table, tableName, maxAgeDays, minConfidenceForExpiry, dryRun, lifecycleDb);
      stats.expiredRemoved += expired;
      if (expired > 0) log(`  ${dryRun ? 'Would expire' : 'Expired'} ${expired} row(s)`);

      stats.tablesProcessed++;
    }

    // Phase 3: Promote high-usage memories
    log('Promoting high-usage memories to shared scope...');
    stats.promoted = await promoteHighUsage(
      lanceDbPath,
      { tableBase },
      lifecycleDb,
      promotionMinUsage,
      dryRun
    );
    if (stats.promoted > 0) log(`  ${dryRun ? 'Would promote' : 'Promoted'} ${stats.promoted} memory(ies)`);

    // Log consolidation run
    logConsolidation(lifecycleDb, stats, dryRun);

    log('Consolidation complete.');
  } finally {
    lifecycleDb.close();
  }

  return stats;
};

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const printUsage = () => {
  console.log(`Usage: node scripts/memory-consolidation.mjs [options]

Options:
  --dry-run              Preview changes without modifying data
  --verbose              Show detailed progress
  --dedup-threshold N    Cosine similarity threshold for dedup (default: ${DEFAULT_DEDUP_THRESHOLD})
  --max-age-days N       Max age in days for expiry (default: ${DEFAULT_MAX_AGE_DAYS})
  --min-confidence N     Minimum confidence to survive expiry (default: ${DEFAULT_MIN_CONFIDENCE_FOR_EXPIRY})
  --promotion-min-usage N  Minimum usage count for promotion (default: ${DEFAULT_PROMOTION_MIN_USAGE})
  --lance-db-path PATH   Override LanceDB directory path
  --help                 Show this help message`);
};

const parseCliArgs = (argv) => {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--verbose') opts.verbose = true;
    else if (arg === '--help') opts.help = true;
    else if (arg === '--dedup-threshold' && argv[i + 1]) opts.dedupThreshold = Number(argv[++i]);
    else if (arg === '--max-age-days' && argv[i + 1]) opts.maxAgeDays = Number(argv[++i]);
    else if (arg === '--min-confidence' && argv[i + 1]) opts.minConfidenceForExpiry = Number(argv[++i]);
    else if (arg === '--promotion-min-usage' && argv[i + 1]) opts.promotionMinUsage = Number(argv[++i]);
    else if (arg === '--lance-db-path' && argv[i + 1]) opts.lanceDbPath = argv[++i];
  }
  return opts;
};

const resolveDefaultLanceDbPath = () => {
  const fromEnv = process.env.AGENTS_MEMORY_LANCEDB_PATH?.trim();
  if (fromEnv) return fromEnv;

  const historyDb = process.env.AGENTS_MEMORY_OSS_HISTORY_DB_PATH?.trim();
  if (historyDb) return path.join(path.dirname(historyDb), 'lancedb');

  const home = process.env.HOME ?? process.env.USERPROFILE;
  return path.join(home, '.agents', '.agents-memory', 'lancedb');
};

if (process.argv[1]?.endsWith('memory-consolidation.mjs')) {
  const opts = parseCliArgs(process.argv.slice(2));

  if (opts.help) {
    printUsage();
    process.exit(0);
  }

  const lanceDbPath = opts.lanceDbPath ?? resolveDefaultLanceDbPath();
  const agentsMemoryDir = path.dirname(lanceDbPath);

  runConsolidation({
    lanceDbPath,
    agentsMemoryDir,
    ...opts
  })
    .then((stats) => {
      console.log(JSON.stringify({ ok: true, ...stats }, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Consolidation] Fatal: ${err.message}`);
      process.exit(1);
    });
}
