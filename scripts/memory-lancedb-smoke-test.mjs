import fs from 'node:fs';
import path from 'node:path';

import {
  getRelevantMemories,
  prepareLocalMemoryRuntimeEnv,
  recordMemory,
  resolveMemorySidecarBackend,
  resolveMemorySidecarConfig
} from './memory-sidecar-adapter.mjs';
import { loadDefaultEnvFiles } from './env-file-tools.mjs';
import { LanceDbLangChainStore } from './memory-lancedb-store.mjs';

const HELP_TEXT = `Usage: node ./scripts/memory-lancedb-smoke-test.mjs

Required env:
  AGENTS_MEMORY_ENABLED=true
  AGENTS_MEMORY_BACKEND=mem0-lancedb
  MEM0_TELEMETRY=false
  AGENTS_MEMORY_OSS_LLM_API_KEY
  AGENTS_MEMORY_OSS_LLM_MODEL
  AGENTS_MEMORY_OSS_EMBEDDER_API_KEY
  AGENTS_MEMORY_OSS_HISTORY_DB_PATH

Optional env:
  AGENTS_MEMORY_OSS_LLM_BASE_URL
  AGENTS_MEMORY_OSS_EMBEDDER_BASE_URL
  AGENTS_MEMORY_LANCEDB_PATH
  AGENTS_MEMORY_LANCEDB_TABLE_BASE
  AGENTS_MEMORY_PROJECT_ID_OVERRIDE

This script auto-loads .env and .env.local from the current repo root before validation.

This script uses a dedicated project-id override namespace so it does not touch normal operator data.`;

const PASS = 'PASS';
const FAIL = 'FAIL';

const fail = (message) => {
  console.error(`${FAIL} ${message}`);
  process.exit(1);
};

const printStep = (label, passed, detail) => {
  const status = passed ? PASS : FAIL;
  console.log(`${status} ${label}${detail ? `: ${detail}` : ''}`);
  if (!passed) {
    process.exit(1);
  }
};

const ensureRequiredEnv = () => {
  const required = [
    'AGENTS_MEMORY_ENABLED',
    'AGENTS_MEMORY_BACKEND',
    'MEM0_TELEMETRY',
    'AGENTS_MEMORY_OSS_LLM_API_KEY',
    'AGENTS_MEMORY_OSS_LLM_MODEL',
    'AGENTS_MEMORY_OSS_EMBEDDER_API_KEY',
    'AGENTS_MEMORY_OSS_HISTORY_DB_PATH'
  ];

  const missing = required.filter((name) => !String(process.env[name] ?? '').trim());
  if (missing.length > 0) {
    fail(`missing required env: ${missing.join(', ')}`);
  }

  if (process.env.AGENTS_MEMORY_ENABLED !== 'true') {
    fail('AGENTS_MEMORY_ENABLED must be "true"');
  }

  if (process.env.AGENTS_MEMORY_BACKEND !== 'mem0-lancedb') {
    fail('AGENTS_MEMORY_BACKEND must be "mem0-lancedb"');
  }

  if (String(process.env.MEM0_TELEMETRY).trim().toLowerCase() !== 'false') {
    fail('MEM0_TELEMETRY must be set to "false" before the local mem0 runtime imports');
  }
};

const sanitizeTableSegment = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'memory';

const buildSmokeContext = () => {
  const projectIdOverride = process.env.AGENTS_MEMORY_PROJECT_ID_OVERRIDE?.trim()
    || `mem0-lancedb-smoke-${Date.now()}`;

  return {
    projectContext: {
      projectRoot: process.cwd(),
      projectSlug: 'mem0-lancedb-smoke-local',
      projectIdOverride
    },
    projectIdOverride,
    userId: `project:${projectIdOverride}`
  };
};

if (process.argv.includes('--help')) {
  console.log(HELP_TEXT);
  process.exit(0);
}

loadDefaultEnvFiles();
ensureRequiredEnv();

const config = resolveMemorySidecarConfig({ env: process.env });
prepareLocalMemoryRuntimeEnv(config);
fs.mkdirSync(path.dirname(config.localMemory.historyDb.path), { recursive: true });
fs.mkdirSync(config.localMemory.lanceDb.path, { recursive: true });

const smoke = buildSmokeContext();
const keyword = `smoke-keyword-${Date.now()}`;
const idempotencyKey = `smoke-idempotency-${Date.now()}`;
const sourceArtifact = path.join(process.cwd(), '.agents-memory', 'smoke-test-artifact.md');
fs.mkdirSync(path.dirname(sourceArtifact), { recursive: true });
fs.writeFileSync(sourceArtifact, `LanceDB smoke test artifact for ${keyword}\n`, 'utf8');

const backend = resolveMemorySidecarBackend({ config });
if (!backend) {
  fail('resolveMemorySidecarBackend returned null even though required LanceDB env was provided');
}

const store = new LanceDbLangChainStore({
  dbPath: config.localMemory.lanceDb.path,
  tableName: `${config.localMemory.lanceDb.tableBase}_${sanitizeTableSegment(smoke.userId)}`
});

const firstWrite = await recordMemory({
  workflow_stage: 'create-plan',
  memory_kind: 'lesson',
  scope: 'project',
  summary: `Mem0 LanceDB smoke lesson ${keyword}`,
  source_artifact: sourceArtifact,
  idempotency_key: idempotencyKey
}, {
  env: process.env,
  projectContext: smoke.projectContext
});
printStep('write curated lesson', firstWrite.recorded === true, firstWrite.record?.id ?? 'no-id');

const firstRecall = await getRelevantMemories({
  workflowStage: 'create-plan',
  queryText: keyword,
  minScore: 0,
  allowedMemoryKinds: ['lesson'],
  topK: 3,
  projectContext: smoke.projectContext
}, {
  env: process.env
});
const recalled = firstRecall.items.find((item) => item.idempotency_key === idempotencyKey);
printStep('recall by keyword', Boolean(recalled), recalled?.id ?? 'not-found');

const secondWrite = await recordMemory({
  workflow_stage: 'create-plan',
  memory_kind: 'lesson',
  scope: 'project',
  summary: `Mem0 LanceDB smoke lesson ${keyword}`,
  source_artifact: sourceArtifact,
  idempotency_key: idempotencyKey
}, {
  env: process.env,
  projectContext: smoke.projectContext
});
printStep('repeat idempotent write', secondWrite.recorded === true, secondWrite.record?.id ?? 'no-id');

const matchingIds = await store.findMemoryIdsByIdempotencyKey(idempotencyKey);
printStep('no duplicate after repeated write', matchingIds.length === 1, matchingIds.join(',') || 'none');

const restartedBackend = resolveMemorySidecarBackend({
  config: resolveMemorySidecarConfig({ env: process.env })
});
if (!restartedBackend) {
  fail('restarted backend failed to initialize');
}

const postRestartRecall = await getRelevantMemories({
  workflowStage: 'create-plan',
  queryText: keyword,
  minScore: 0,
  allowedMemoryKinds: ['lesson'],
  topK: 3,
  projectContext: smoke.projectContext
}, {
  env: process.env
});
const restartMatch = postRestartRecall.items.find((item) => item.idempotency_key === idempotencyKey);
printStep('record survives process restart', Boolean(restartMatch), restartMatch?.id ?? 'not-found');
