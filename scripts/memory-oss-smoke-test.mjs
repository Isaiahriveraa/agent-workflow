import fs from 'node:fs';
import path from 'node:path';

import {
  getRelevantMemories,
  prepareMem0OssRuntimeEnv,
  recordMemory,
  resolveMemorySidecarBackend,
  resolveMemorySidecarConfig
} from './memory-sidecar-adapter.mjs';
import { loadDefaultEnvFiles } from './env-file-tools.mjs';

const HELP_TEXT = `Usage: node ./scripts/memory-oss-smoke-test.mjs

Required env:
  AGENTS_MEMORY_ENABLED=true
  AGENTS_MEMORY_BACKEND=mem0-oss
  MEM0_TELEMETRY=false
  AGENTS_MEMORY_OSS_LLM_API_KEY
  AGENTS_MEMORY_OSS_LLM_MODEL
  AGENTS_MEMORY_OSS_EMBEDDER_API_KEY
  AGENTS_MEMORY_OSS_VECTORSTORE_URL
  AGENTS_MEMORY_OSS_HISTORY_DB_PATH

Optional env:
  AGENTS_MEMORY_OSS_LLM_BASE_URL
  AGENTS_MEMORY_OSS_EMBEDDER_BASE_URL
  AGENTS_MEMORY_OSS_VECTORSTORE_COLLECTION
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
    'AGENTS_MEMORY_OSS_VECTORSTORE_URL',
    'AGENTS_MEMORY_OSS_HISTORY_DB_PATH'
  ];

  const missing = required.filter((name) => !String(process.env[name] ?? '').trim());
  if (missing.length > 0) {
    fail(`missing required env: ${missing.join(', ')}`);
  }

  if (process.env.AGENTS_MEMORY_ENABLED !== 'true') {
    fail('AGENTS_MEMORY_ENABLED must be "true"');
  }

  if (process.env.AGENTS_MEMORY_BACKEND !== 'mem0-oss') {
    fail('AGENTS_MEMORY_BACKEND must be "mem0-oss"');
  }

  if (String(process.env.MEM0_TELEMETRY).trim().toLowerCase() !== 'false') {
    fail('MEM0_TELEMETRY must be set to "false" before the OSS runtime imports');
  }
};

const ensureHistoryPath = (historyDbPath) => {
  const dir = path.dirname(historyDbPath);
  fs.mkdirSync(dir, { recursive: true });
};

const buildSmokeContext = () => {
  const projectIdOverride = process.env.AGENTS_MEMORY_PROJECT_ID_OVERRIDE?.trim()
    || `mem0-oss-smoke-${Date.now()}`;

  return {
    projectContext: {
      projectRoot: process.cwd(),
      projectSlug: 'mem0-oss-smoke-local',
      projectIdOverride
    },
    projectIdOverride,
    userId: `project:${projectIdOverride}`
  };
};

const instantiateClient = async () => {
  const config = resolveMemorySidecarConfig({ env: process.env });
  prepareMem0OssRuntimeEnv(config);
  const { Memory } = await import('mem0ai/oss');

  return new Memory({
    embedder: {
      provider: 'openai',
      config: {
        apiKey: process.env.AGENTS_MEMORY_OSS_EMBEDDER_API_KEY,
        model: config.mem0Oss.embedder.model,
        ...(config.mem0Oss.embedder.baseUrl ? { baseURL: config.mem0Oss.embedder.baseUrl } : {})
      }
    },
    vectorStore: {
      provider: 'qdrant',
      config: {
        collectionName: config.mem0Oss.vectorStore.collection,
        url: config.mem0Oss.vectorStore.url,
        dimension: 1536
      }
    },
    llm: {
      provider: 'openai',
      config: {
        apiKey: process.env.AGENTS_MEMORY_OSS_LLM_API_KEY,
        model: config.mem0Oss.llm.model,
        ...(config.mem0Oss.llm.baseUrl ? { baseURL: config.mem0Oss.llm.baseUrl } : {})
      }
    },
    historyDbPath: config.mem0Oss.historyDb.path,
    disableHistory: false
  });
};

const assertSingleMatchingRecord = (records, idempotencyKey) => {
  const matches = records.filter((item) => item.metadata?.idempotency_key === idempotencyKey);
  if (matches.length !== 1) {
    fail(`expected exactly one record for idempotency key "${idempotencyKey}", found ${matches.length}`);
  }
  return matches[0];
};

if (process.argv.includes('--help')) {
  console.log(HELP_TEXT);
  process.exit(0);
}

loadDefaultEnvFiles();

ensureRequiredEnv();
ensureHistoryPath(process.env.AGENTS_MEMORY_OSS_HISTORY_DB_PATH);

const smoke = buildSmokeContext();
const keyword = `smoke-keyword-${Date.now()}`;
const idempotencyKey = `smoke-idempotency-${Date.now()}`;
const sourceArtifact = path.join(process.cwd(), '.agents-memory', 'smoke-test-artifact.md');
fs.writeFileSync(sourceArtifact, `Smoke test artifact for ${keyword}\n`, 'utf8');

const config = resolveMemorySidecarConfig({ env: process.env });
const backend = resolveMemorySidecarBackend({ config });
if (!backend) {
  fail('resolveMemorySidecarBackend returned null even though required OSS env was provided');
}

const client = await instantiateClient();

try {
  await client.deleteAll({ userId: smoke.userId });
  printStep('cleanup previous smoke namespace', true, smoke.userId);

  const firstWrite = await recordMemory({
    workflow_stage: 'create-plan',
    memory_kind: 'lesson',
    scope: 'project',
    summary: `Mem0 OSS smoke lesson ${keyword}`,
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
    summary: `Mem0 OSS smoke lesson ${keyword}`,
    source_artifact: sourceArtifact,
    idempotency_key: idempotencyKey
  }, {
    env: process.env,
    projectContext: smoke.projectContext
  });
  printStep('repeat idempotent write', secondWrite.recorded === true, secondWrite.record?.id ?? 'no-id');

  const afterRepeat = await client.getAll({ userId: smoke.userId });
  assertSingleMatchingRecord(afterRepeat.results ?? [], idempotencyKey);
  printStep('no duplicate after repeated write', true, 'single matching record');

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
} finally {
  await client.deleteAll({ userId: smoke.userId });
  printStep('cleanup isolated smoke namespace', true, smoke.userId);
}
