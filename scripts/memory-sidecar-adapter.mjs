import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { MemoryClient } from 'mem0ai';

import {
  compareMemoryRecords,
  deriveMemoryProjectId,
  DeterministicMemoryBackend,
  MEMORY_CONTRACT_LIMITS,
  MEMORY_KINDS,
  MEMORY_WORKFLOW_STAGES,
  SHARED_SCOPE_ALLOWED_KINDS,
  SUPPORTED_MEM0_LANCEDB_PROFILE,
  SUPPORTED_MEM0_PROFILE,
  normalizeMemoryRecord
} from './memory-sidecar-contract.mjs';
import { LanceDbLangChainStore } from './memory-lancedb-store.mjs';
import { getProjectContext } from './project-context.mjs';

// Lazy lifecycle tracking — non-blocking, best-effort
let lifecycleModulePromise = null;
let lifecycleDb = null;

const ensureLifecycleModule = () => {
  if (!lifecycleModulePromise) {
    lifecycleModulePromise = import('./memory-consolidation.mjs').catch(() => null);
  }
  return lifecycleModulePromise;
};

const trackRecallUsage = (items, config) => {
  const lanceDbPath = config?.localMemory?.lanceDb?.path;
  if (!lanceDbPath || items.length === 0) return;

  // Fire-and-forget — never block the recall path
  ensureLifecycleModule().then((mod) => {
    if (!mod) return;
    try {
      if (!lifecycleDb) {
        lifecycleDb = mod.openLifecycleDb(path.dirname(lanceDbPath));
      }
      for (const item of items) {
        if (item.id) {
          mod.incrementUsage(lifecycleDb, item.id, `recall:${item.scope ?? 'unknown'}`);
        }
      }
    } catch {
      // Best-effort
    }
  }).catch(() => {});
};

const require = createRequire(import.meta.url);

const truthy = new Set(['1', 'true', 'yes', 'on']);

const parseBoolean = (value) => truthy.has(String(value ?? '').trim().toLowerCase());

const getContextBudget = () => {
  try {
    const tmpDir = os.tmpdir();
    const files = fs.readdirSync(tmpDir).filter(f => f.startsWith('claude-ctx-') && f.endsWith('.json') && !f.endsWith('-warned.json'));
    if (files.length === 0) return null;
    let latestFile = null;
    let latestMtime = 0;
    for (const f of files) {
      const p = path.join(tmpDir, f);
      const stat = fs.statSync(p);
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latestFile = p;
      }
    }
    if (!latestFile) return null;
    // Discard if older than 5 minutes
    if (Date.now() - latestMtime > 5 * 60 * 1000) return null;
    const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    return typeof data.remaining_percentage === 'number' ? data.remaining_percentage : null;
  } catch(e) {
    return null;
  }
};

export const MEMORY_ENV_KEYS = Object.freeze({
  enabled: 'AGENTS_MEMORY_ENABLED',
  backend: 'AGENTS_MEMORY_BACKEND',
  apiKey: 'AGENTS_MEMORY_API_KEY',
  baseUrl: 'AGENTS_MEMORY_BASE_URL',
  organizationName: 'AGENTS_MEMORY_ORGANIZATION_NAME',
  projectName: 'AGENTS_MEMORY_PROJECT_NAME',
  organizationId: 'AGENTS_MEMORY_ORGANIZATION_ID',
  projectId: 'AGENTS_MEMORY_PROJECT_ID',
  sharedUserId: 'AGENTS_MEMORY_SHARED_USER_ID',
  localLlmBaseUrl: 'AGENTS_MEMORY_OSS_LLM_BASE_URL',
  localLlmApiKey: 'AGENTS_MEMORY_OSS_LLM_API_KEY',
  localLlmModel: 'AGENTS_MEMORY_OSS_LLM_MODEL',
  localEmbedderBaseUrl: 'AGENTS_MEMORY_OSS_EMBEDDER_BASE_URL',
  localEmbedderApiKey: 'AGENTS_MEMORY_OSS_EMBEDDER_API_KEY',
  localHistoryDbPath: 'AGENTS_MEMORY_OSS_HISTORY_DB_PATH',
  lanceDbPath: 'AGENTS_MEMORY_LANCEDB_PATH',
  lanceDbTableBase: 'AGENTS_MEMORY_LANCEDB_TABLE_BASE',
  projectIdOverride: 'AGENTS_MEMORY_PROJECT_ID_OVERRIDE'
});

const resolveBackendProfile = (backend) => {
  if (backend === 'mem0-lancedb' || backend === 'mem0-oss') {
    return SUPPORTED_MEM0_LANCEDB_PROFILE;
  }

  return SUPPORTED_MEM0_PROFILE;
};

const resolveLanceDbPath = (env) => {
  const explicit = env[MEMORY_ENV_KEYS.lanceDbPath]?.trim();
  if (explicit) {
    return {
      path: explicit,
      resolution: 'explicit-env'
    };
  }

  const historyDbPath = env[MEMORY_ENV_KEYS.localHistoryDbPath]?.trim();
  if (historyDbPath) {
    return {
      path: path.join(path.dirname(historyDbPath), 'lancedb'),
      resolution: 'derived-from-history-db'
    };
  }

  const home = env.HOME ?? env.USERPROFILE;
  return {
    path: home ? path.join(home, '.agents', '.agents-memory', 'lancedb') : null,
    resolution: home ? 'default' : 'missing'
  };
};

const resolveHistoryDbPath = (env) => {
  const explicit = env[MEMORY_ENV_KEYS.localHistoryDbPath]?.trim();
  if (explicit) {
    return { path: explicit, resolution: 'explicit-env' };
  }

  const home = env.HOME ?? env.USERPROFILE;
  return {
    path: home ? path.join(home, '.agents', '.agents-memory', 'memory_lifecycle.db') : null,
    resolution: home ? 'default' : 'missing'
  };
};

const buildReadiness = ({ backend, env }) => {
  if (backend === 'mem0-oss') {
    return {
      backend: 'mem0-oss',
      overall: false,
      deprecated: true,
      projectIdentityOverridePresent: Boolean(env[MEMORY_ENV_KEYS.projectIdOverride]?.trim())
    };
  }

  if (backend === 'mem0-lancedb') {
    const embedder = {
      apiKeyPresent: Boolean(env[MEMORY_ENV_KEYS.localEmbedderApiKey]?.trim()),
      baseUrlPresent: Boolean(env[MEMORY_ENV_KEYS.localEmbedderBaseUrl]?.trim())
    };
    const llm = {
      apiKeyPresent: Boolean(env[MEMORY_ENV_KEYS.localLlmApiKey]?.trim()),
      modelPresent: Boolean(env[MEMORY_ENV_KEYS.localLlmModel]?.trim()),
      baseUrlPresent: Boolean(env[MEMORY_ENV_KEYS.localLlmBaseUrl]?.trim())
    };
    const lanceDb = resolveLanceDbPath(env);
    const resolvedHistoryDb = resolveHistoryDbPath(env);
    const historyDb = {
      pathPresent: Boolean(resolvedHistoryDb.path),
      resolution: resolvedHistoryDb.resolution
    };

    return {
      backend: 'mem0-lancedb',
      overall: embedder.apiKeyPresent && llm.apiKeyPresent && llm.modelPresent && Boolean(lanceDb.path) && historyDb.pathPresent,
      embedder,
      llm,
      lanceDb: {
        pathPresent: Boolean(lanceDb.path),
        pathResolution: lanceDb.resolution,
        tableBase: env[MEMORY_ENV_KEYS.lanceDbTableBase]?.trim() || SUPPORTED_MEM0_LANCEDB_PROFILE.storage.tableBaseName
      },
      historyDb,
      projectIdentityOverridePresent: Boolean(env[MEMORY_ENV_KEYS.projectIdOverride]?.trim())
    };
  }

  return {
    backend: 'mem0',
    overall: Boolean(env[MEMORY_ENV_KEYS.apiKey]?.trim()),
    apiKeyPresent: Boolean(env[MEMORY_ENV_KEYS.apiKey]?.trim())
  };
};

export const resolveMemorySidecarConfig = ({ env = process.env } = {}) => {
  const enabled = parseBoolean(env[MEMORY_ENV_KEYS.enabled]);
  const backend = env[MEMORY_ENV_KEYS.backend]?.trim() || SUPPORTED_MEM0_PROFILE.backend;
  const profile = resolveBackendProfile(backend);
  const readiness = buildReadiness({ backend, env });

  return {
    enabled,
    backend,
    profile: profile.integration,
    envKeys: { ...MEMORY_ENV_KEYS },
    credentials: {
      apiKeyPresent: Boolean(env[MEMORY_ENV_KEYS.apiKey]?.trim())
    },
    readiness,
    mem0: {
      host: env[MEMORY_ENV_KEYS.baseUrl]?.trim() || null,
      organizationName: env[MEMORY_ENV_KEYS.organizationName]?.trim() || null,
      projectName: env[MEMORY_ENV_KEYS.projectName]?.trim() || null,
      organizationId: env[MEMORY_ENV_KEYS.organizationId]?.trim() || null,
      projectId: env[MEMORY_ENV_KEYS.projectId]?.trim() || null
    },
    localMemory: {
      llm: {
        baseUrl: env[MEMORY_ENV_KEYS.localLlmBaseUrl]?.trim() || null,
        apiKeyPresent: readiness.backend === 'mem0-lancedb' ? readiness.llm.apiKeyPresent : false,
        model: env[MEMORY_ENV_KEYS.localLlmModel]?.trim() || null
      },
      embedder: {
        baseUrl: env[MEMORY_ENV_KEYS.localEmbedderBaseUrl]?.trim() || null,
        apiKeyPresent: readiness.backend === 'mem0-lancedb' ? readiness.embedder.apiKeyPresent : false,
        model: SUPPORTED_MEM0_LANCEDB_PROFILE.storage.embeddingModel
      },
      lanceDb: {
        path: resolveLanceDbPath(env).path,
        pathResolution: resolveLanceDbPath(env).resolution,
        tableBase: env[MEMORY_ENV_KEYS.lanceDbTableBase]?.trim() || SUPPORTED_MEM0_LANCEDB_PROFILE.storage.tableBaseName
      },
      historyDb: {
        path: resolveHistoryDbPath(env).path,
        resolution: resolveHistoryDbPath(env).resolution
      }
    },
    scope: {
      sharedUserId: env[MEMORY_ENV_KEYS.sharedUserId]?.trim() || 'agents-shared'
    },
    projectIdentity: {
      override: env[MEMORY_ENV_KEYS.projectIdOverride]?.trim() || null
    }
  };
};

const buildDisabledPayload = ({ workflowStage, projectContext, config }) => ({
  enabled: false,
  workflow_stage: workflowStage,
  project_id: deriveMemoryProjectId(projectContext),
  limits: MEMORY_CONTRACT_LIMITS,
  source: config.backend,
  items: [],
  warnings: []
});

const buildDeprecatedBackendWarning = () =>
  'Memory backend "mem0-oss" is deprecated. Set AGENTS_MEMORY_BACKEND=mem0-lancedb, add AGENTS_MEMORY_OSS_HISTORY_DB_PATH, and remove AGENTS_MEMORY_OSS_VECTORSTORE_URL and AGENTS_MEMORY_OSS_VECTORSTORE_COLLECTION from your environment.';

const buildUnavailableWarning = (config) =>
  config.backend === 'mem0-oss'
    ? buildDeprecatedBackendWarning()
    : `Memory enabled but backend "${config.backend}" is unavailable; returning empty advisory recall.`;

const buildCredentialWarning = (config) =>
  `Memory enabled but backend "${config.backend}" is missing required credentials; returning empty advisory recall.`;

const hasBackendReadiness = (config) => {
  if (config.backend === 'mem0-lancedb') {
    return config.readiness?.overall === true;
  }

  return config.credentials.apiKeyPresent;
};

const normalizeRecallItem = (record) => ({
  id: record.id,
  memory_kind: record.memory_kind,
  workflow_stage: record.workflow_stage,
  project_id: record.project_id,
  scope: record.scope,
  summary: record.summary,
  source_artifact: record.source_artifact,
  confidence: record.confidence,
  match_reason: record.match_reason,
  created_at: record.created_at,
  idempotency_key: record.idempotency_key,
  metadata: {
    ...record.metadata,
    project_match: record.project_match === true,
    filters_passed: [...(record.filters_passed ?? [])]
  }
});

const normalizeCreatedAt = (value) => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
};

const extractMemoryText = (record) =>
  record.memory
  ?? record.data?.memory
  ?? record.text
  ?? null;

const buildScopeUserId = ({ scope, projectId, sharedUserId }) =>
  scope === 'shared' ? sharedUserId : `project:${projectId}`;

const buildCompatibleWorkflowStages = (workflowStage) =>
  workflowStage === 'implement-plan'
    ? ['implement-plan', 'create-plan']
    : ['create-plan'];

let localMemoryClass = null;

const shouldAllowMem0TelemetryImport = () => {
  if (!Object.prototype.hasOwnProperty.call(process.env, 'MEM0_TELEMETRY')) {
    process.env.MEM0_TELEMETRY = 'false';
  }

  return String(process.env.MEM0_TELEMETRY).trim().toLowerCase() === 'false';
};

export const prepareLocalMemoryRuntimeEnv = (config) => {
  const embedderBaseUrl = config?.localMemory?.embedder?.baseUrl?.trim();
  if (embedderBaseUrl) {
    process.env.OPENAI_BASE_URL = embedderBaseUrl;
  }
};

const getLocalMemoryClass = () => {
  if (localMemoryClass) {
    return localMemoryClass;
  }

  if (!shouldAllowMem0TelemetryImport()) {
    return null;
  }

  ({ Memory: localMemoryClass } = require('mem0ai/oss'));
  return localMemoryClass;
};

const dedupeRecallItems = (records) => {
  const deduped = new Map();

  for (const record of records) {
    const dedupeKey = record.idempotency_key
      ?? `${record.scope}:${record.memory_kind}:${record.summary}:${record.source_artifact ?? 'none'}`;
    const existing = deduped.get(dedupeKey);

    if (!existing || compareMemoryRecords(record, existing) < 0) {
      deduped.set(dedupeKey, record);
    }
  }

  return [...deduped.values()];
};

const buildMem0Metadata = (record, userId) => ({
  project_id: record.project_id,
  workflow_stage: record.workflow_stage,
  memory_kind: record.memory_kind,
  scope: record.scope,
  source_artifact: record.source_artifact,
  source_exists: record.source_exists !== false,
  superseded: record.superseded === true,
  confidence: record.confidence,
  score: record.score ?? record.confidence,
  idempotency_key: record.idempotency_key ?? null,
  match_reason: record.match_reason ?? 'mem0-search',
  created_at: normalizeCreatedAt(record.created_at),
  user_id: userId,
  ...record.metadata
});

const buildLocalMemoryMetadata = (record, userId) => ({
  project_id: record.project_id,
  workflow_stage: record.workflow_stage,
  memory_kind: record.memory_kind,
  scope: record.scope,
  source_artifact: record.source_artifact,
  source_exists: record.source_exists !== false,
  superseded: record.superseded === true,
  confidence: record.confidence,
  score: record.score ?? record.confidence,
  idempotency_key: record.idempotency_key ?? null,
  match_reason: record.match_reason ?? 'mem0-lancedb-search',
  created_at: normalizeCreatedAt(record.created_at),
  user_id: userId,
  ...record.metadata
});

const normalizeMem0Memory = ({ memory, projectId }) =>
  normalizeMemoryRecord({
    id: memory.id,
    project_id: memory.metadata?.project_id ?? projectId,
    workflow_stage: memory.metadata?.workflow_stage ?? 'create-plan',
    memory_kind: memory.metadata?.memory_kind ?? 'lesson',
    scope: memory.metadata?.scope ?? 'project',
    summary: extractMemoryText(memory),
    source_artifact: memory.metadata?.source_artifact ?? null,
    source_exists: memory.metadata?.source_exists !== false,
    superseded: memory.metadata?.superseded === true,
    confidence: Number(memory.metadata?.confidence ?? memory.score ?? 0),
    score: Number(memory.score ?? memory.metadata?.score ?? 0),
    match_reason: memory.metadata?.match_reason ?? 'mem0-search',
    created_at: memory.metadata?.created_at ?? memory.created_at,
    idempotency_key: memory.metadata?.idempotency_key ?? null,
    metadata: {
      project_root: memory.metadata?.project_root ?? null,
      source_tool: memory.metadata?.source_tool ?? null,
      topic_tags: [...(memory.metadata?.topic_tags ?? [])]
    }
  });

const normalizeLocalMemoryItem = ({ memory, projectId }) => {
  const metadata = memory.metadata ?? {};

  return normalizeMemoryRecord({
    id: memory.id,
    project_id: metadata.project_id ?? projectId,
    workflow_stage: metadata.workflow_stage ?? 'create-plan',
    memory_kind: metadata.memory_kind ?? 'lesson',
    scope: metadata.scope ?? 'project',
    summary: extractMemoryText(memory),
    source_artifact: metadata.source_artifact ?? null,
    source_exists: metadata.source_exists !== false,
    superseded: metadata.superseded === true,
    confidence: Number(metadata.confidence ?? memory.score ?? 0),
    score: Number(memory.score ?? metadata.score ?? metadata.confidence ?? 0),
    match_reason: metadata.match_reason ?? 'mem0-lancedb-search',
    created_at: memory.createdAt ?? memory.updatedAt ?? metadata.created_at,
    idempotency_key: metadata.idempotency_key ?? null,
    metadata: {
      project_root: metadata.project_root ?? null,
      source_tool: metadata.source_tool ?? null,
      topic_tags: [...(metadata.topic_tags ?? [])]
    }
  });
};

const buildMem0Filters = ({ query, config }) => {
  const projectUserId = buildScopeUserId({
    scope: 'project',
    projectId: query.project_id,
    sharedUserId: config.scope.sharedUserId
  });
  const allowShared = query.allowed_memory_kinds.some((kind) => SHARED_SCOPE_ALLOWED_KINDS.includes(kind));
  const compatibleStages = buildCompatibleWorkflowStages(query.workflow_stage);
  const scopeFilters = [{ user_id: projectUserId }];

  if (allowShared) {
    scopeFilters.push({ user_id: config.scope.sharedUserId });
  }

  return {
    AND: [
      { OR: scopeFilters },
      { workflow_stage: { in: compatibleStages } },
      { memory_kind: { in: query.allowed_memory_kinds } },
      { source_exists: true },
      { superseded: false },
      { confidence: { gte: Number(query.min_score ?? 0) } }
    ]
  };
};

const buildMem0QueryText = (query) =>
  query.query_text
  ?? query.context_summary
  ?? `${query.workflow_stage} ${query.allowed_memory_kinds.join(' ')}`.trim();

const mapMem0SearchResults = ({ items, query }) =>
  dedupeRecallItems(
    items.map((item) => normalizeMem0Memory({
      memory: item,
      projectId: query.project_id
    }))
  )
    .sort(compareMemoryRecords)
    .slice(0, Math.min(Number(query.top_k ?? MEMORY_CONTRACT_LIMITS.maxRecallItems), MEMORY_CONTRACT_LIMITS.maxRecallItems))
    .map((record) => ({
      ...record,
      project_match: record.scope === 'project',
      filters_passed: [
        record.scope === 'project' ? 'project_id' : 'shared_scope',
        'workflow_stage',
        'memory_kind',
        'score_threshold'
      ]
    }));

const buildLocalMemorySearchFilters = ({ query, config, scope }) => ({
  userId: buildScopeUserId({
    scope,
    projectId: query.project_id,
    sharedUserId: config.scope.sharedUserId
  }),
  limit: Math.max(
    Number(query.top_k ?? MEMORY_CONTRACT_LIMITS.maxRecallItems) * 4,
    MEMORY_CONTRACT_LIMITS.maxRecallItems
  )
});

const sanitizeTableSegment = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'memory';

const buildLanceDbTableName = ({ config, userId }) =>
  `${config.localMemory.lanceDb.tableBase}_${sanitizeTableSegment(userId)}`;

const applyClientSideFilters = (records, query) => {
  const compatibleStages = new Set(buildCompatibleWorkflowStages(query.workflow_stage));
  const allowedKinds = new Set(query.allowed_memory_kinds ?? MEMORY_KINDS);
  const minScore = Number(query.min_score ?? 0);

  return records.filter((record) =>
    record.source_exists !== false
    && record.superseded !== true
    && allowedKinds.has(record.memory_kind)
    && compatibleStages.has(record.workflow_stage)
    && Number(record.score ?? 0) >= minScore
  );
};

const normalizeLocalMemorySearchResults = ({ items, projectId }) =>
  items.flatMap((item) => {
    try {
      return [normalizeLocalMemoryItem({ memory: item, projectId })];
    } catch {
      return [];
    }
  });

export const createMem0MemoryBackend = ({ client, config }) => {
  const mem0Client = client ?? new MemoryClient({
    apiKey: process.env[MEMORY_ENV_KEYS.apiKey],
    host: config.mem0.host ?? undefined,
    organizationName: config.mem0.organizationName ?? undefined,
    projectName: config.mem0.projectName ?? undefined,
    organizationId: config.mem0.organizationId ?? undefined,
    projectId: config.mem0.projectId ?? undefined
  });

  return {
    async search(query) {
      const remaining = getContextBudget();
      if (remaining !== null) {
        if (remaining <= 30) {
          return { items: [], total_considered: 0, warning: 'Context critically low: skipping recall' };
        }
        if (remaining <= 50) {
          query.top_k = Math.max(1, Math.floor(Number(query.top_k ?? MEMORY_CONTRACT_LIMITS.maxRecallItems) / 2));
        }
      }

      const items = await mem0Client.search(buildMem0QueryText(query), {
        version: 'v2',
        filters: buildMem0Filters({ query, config }),
        top_k: Math.max(Number(query.top_k ?? MEMORY_CONTRACT_LIMITS.maxRecallItems) * 3, MEMORY_CONTRACT_LIMITS.maxRecallItems),
        threshold: Number(query.min_score ?? 0)
      });

      return {
        items: mapMem0SearchResults({ items, query }),
        total_considered: Array.isArray(items) ? items.length : 0
      };
    },
    async record(record) {
      const userId = buildScopeUserId({
        scope: record.scope,
        projectId: record.project_id,
        sharedUserId: config.scope.sharedUserId
      });
      const metadata = buildMem0Metadata(record, userId);
      const normalizedInput = normalizeMemoryRecord({
        ...record,
        created_at: metadata.created_at,
        metadata
      });

      if (normalizedInput.idempotency_key) {
        const existing = await mem0Client.getAll({
          version: 'v2',
          user_id: userId,
          filters: {
            idempotency_key: normalizedInput.idempotency_key
          }
        });

        if (Array.isArray(existing) && existing[0]?.id) {
          await mem0Client.update(existing[0].id, {
            text: normalizedInput.summary,
            metadata,
            timestamp: metadata.created_at
          });

          return normalizeMem0Memory({
            memory: {
              ...existing[0],
              memory: normalizedInput.summary,
              score: normalizedInput.score,
              metadata
            },
            projectId: normalizedInput.project_id
          });
        }
      }

      const added = await mem0Client.add([
        {
          role: 'user',
          content: normalizedInput.summary
        }
      ], {
        version: 'v2',
        user_id: userId,
        metadata,
        infer: false,
        immutable: true,
        output_format: 'v1.1'
      });
      const created = Array.isArray(added) ? added[0] : added;

      return normalizeMem0Memory({
        memory: {
          ...created,
          memory: extractMemoryText(created) ?? normalizedInput.summary,
          score: Number(created?.score ?? normalizedInput.score),
          metadata
        },
        projectId: normalizedInput.project_id
      });
    }
  };
};

const buildMem0LanceDbConfig = ({ config, store }) => ({
  embedder: {
    provider: 'openai',
    config: {
      apiKey: process.env[MEMORY_ENV_KEYS.localEmbedderApiKey],
      model: config.localMemory.embedder.model,
      ...(config.localMemory.embedder.baseUrl ? { baseURL: config.localMemory.embedder.baseUrl } : {})
    }
  },
  vectorStore: {
    provider: 'langchain',
    config: {
      client: store
    }
  },
  llm: {
    provider: 'openai',
    config: {
      apiKey: process.env[MEMORY_ENV_KEYS.localLlmApiKey],
      model: config.localMemory.llm.model,
      ...(config.localMemory.llm.baseUrl ? { baseURL: config.localMemory.llm.baseUrl } : {})
    }
  },
  historyDbPath: config.localMemory.historyDb.path,
  disableHistory: false
});

const createMem0LanceDbNamespaceFactory = (config) => {
  const namespaces = new Map();

  return async (userId) => {
    if (namespaces.has(userId)) {
      return namespaces.get(userId);
    }

    const Memory = getLocalMemoryClass();
    if (!Memory) {
      return null;
    }

    const store = new LanceDbLangChainStore({
      dbPath: config.localMemory.lanceDb.path,
      tableName: buildLanceDbTableName({ config, userId })
    });
    const memoryClient = new Memory(buildMem0LanceDbConfig({ config, store }));
    const namespace = { userId, store, memoryClient };
    namespaces.set(userId, namespace);
    return namespace;
  };
};

export const createMem0LanceDbMemoryBackend = ({ config, namespaceFactory } = {}) => {
  const resolveNamespace = namespaceFactory ?? createMem0LanceDbNamespaceFactory(config);

  return {
    async search(query) {
      const remaining = getContextBudget();
      if (remaining !== null) {
        if (remaining <= 30) {
          return { items: [], total_considered: 0, warning: 'Context critically low: skipping recall' };
        }
        if (remaining <= 50) {
          query.top_k = Math.max(1, Math.floor(Number(query.top_k ?? MEMORY_CONTRACT_LIMITS.maxRecallItems) / 2));
        }
      }

      const projectUserId = buildScopeUserId({
        scope: 'project',
        projectId: query.project_id,
        sharedUserId: config.scope.sharedUserId
      });
      const projectNamespace = await resolveNamespace(projectUserId);
      if (!projectNamespace) {
        return {
          items: [],
          total_considered: 0
        };
      }

      const projectSearch = await projectNamespace.memoryClient.search(
        buildMem0QueryText(query),
        buildLocalMemorySearchFilters({ query, config, scope: 'project' })
      );
      let rawItems = Array.isArray(projectSearch?.results) ? projectSearch.results : [];

      const allowShared = (query.allowed_memory_kinds ?? MEMORY_KINDS)
        .some((kind) => SHARED_SCOPE_ALLOWED_KINDS.includes(kind));

      if (allowShared) {
        const sharedNamespace = await resolveNamespace(config.scope.sharedUserId);
        if (sharedNamespace) {
          const sharedSearch = await sharedNamespace.memoryClient.search(
            buildMem0QueryText(query),
            buildLocalMemorySearchFilters({ query, config, scope: 'shared' })
          );
          rawItems = rawItems.concat(Array.isArray(sharedSearch?.results) ? sharedSearch.results : []);
        }
      }

      const filtered = applyClientSideFilters(
        normalizeLocalMemorySearchResults({
          items: rawItems,
          projectId: query.project_id
        }),
        query
      );

      const items = dedupeRecallItems(filtered)
        .sort(compareMemoryRecords)
        .slice(0, Math.min(Number(query.top_k ?? MEMORY_CONTRACT_LIMITS.maxRecallItems), MEMORY_CONTRACT_LIMITS.maxRecallItems))
        .map((record) => ({
          ...record,
          project_match: record.scope === 'project',
          filters_passed: [
            record.scope === 'project' ? 'project_id' : 'shared_scope',
            'workflow_stage',
            'memory_kind',
            'score_threshold'
          ]
        }));

      return {
        items,
        total_considered: rawItems.length
      };
    },
    async record(record) {
      const userId = buildScopeUserId({
        scope: record.scope,
        projectId: record.project_id,
        sharedUserId: config.scope.sharedUserId
      });
      const namespace = await resolveNamespace(userId);
      if (!namespace) {
        throw new Error('LanceDB namespace initialization failed');
      }

      const metadata = buildLocalMemoryMetadata(record, userId);
      const normalizedInput = normalizeMemoryRecord({
        ...record,
        created_at: metadata.created_at,
        metadata
      });

      if (normalizedInput.idempotency_key) {
        const existingIds = await namespace.store.findMemoryIdsByIdempotencyKey(normalizedInput.idempotency_key);
        for (const memoryId of existingIds) {
          await namespace.store.deleteByMemoryId(memoryId);
        }
      }

      const added = await namespace.memoryClient.add([
        {
          role: 'user',
          content: normalizedInput.summary
        }
      ], {
        userId,
        metadata,
        infer: false
      });
      const memoryId = Array.isArray(added?.results) ? added.results[0]?.id : null;

      return normalizeMemoryRecord({
        ...normalizedInput,
        id: memoryId ?? normalizedInput.id
      });
    }
  };
};

export const resolveMemorySidecarBackend = ({ config, backend, client } = {}) => {
  if (backend) {
    return backend;
  }

  if (!config?.enabled) {
    return null;
  }

  if (config.backend === 'mem0-oss') {
    return {
      deprecated: true
    };
  }

  if (config.backend === 'mem0-lancedb') {
    if (!hasBackendReadiness(config)) {
      return null;
    }

    prepareLocalMemoryRuntimeEnv(config);
    if (!client && !getLocalMemoryClass()) {
      return null;
    }

    return createMem0LanceDbMemoryBackend({
      config,
      namespaceFactory: client
    });
  }

  if (config.backend !== 'mem0' || !config.credentials.apiKeyPresent) {
    return null;
  }

  return createMem0MemoryBackend({ client, config });
};

const ensureWorkflowStage = (workflowStage) => {
  if (!MEMORY_WORKFLOW_STAGES.includes(workflowStage)) {
    throw new Error(`Unsupported workflow_stage: ${workflowStage}`);
  }
};

const buildProjectContext = (input = {}) =>
  ({
    ...(input.projectContext ?? getProjectContext({
      cwd: input.cwd,
      projectRoot: input.projectRoot,
      projectSlug: input.projectSlug
    })),
    ...(input.projectIdOverride ? { projectIdOverride: input.projectIdOverride } : {})
  });

const buildQuery = ({ input, projectContext }) => ({
  project_id: deriveMemoryProjectId(projectContext),
  workflow_stage: input.workflowStage,
  allowed_memory_kinds: input.allowedMemoryKinds ?? MEMORY_KINDS,
  min_score: input.minScore ?? 0.8,
  top_k: input.topK ?? MEMORY_CONTRACT_LIMITS.maxRecallItems,
  query_text: input.queryText ?? null,
  context_summary: input.contextSummary ?? null
});

const normalizeEvent = ({ event, projectContext }) =>
  normalizeMemoryRecord({
    ...event,
    project_id: event.project_id ?? deriveMemoryProjectId(projectContext),
    metadata: {
      ...(event.metadata ?? {}),
      project_root: projectContext.projectRoot,
      source_tool: event.metadata?.source_tool ?? event.source_tool ?? null,
      topic_tags: [...(event.metadata?.topic_tags ?? event.topic_tags ?? [])]
    }
  });

export const getRelevantMemories = async (input, options = {}) => {
  ensureWorkflowStage(input.workflowStage);

  const config = options.config ?? resolveMemorySidecarConfig({ env: options.env });
  const projectContext = buildProjectContext({
    ...input,
    projectContext: options.projectContext ?? input.projectContext,
    projectIdOverride: config.projectIdentity.override
  });

  if (!config.enabled) {
    return buildDisabledPayload({
      workflowStage: input.workflowStage,
      projectContext,
      config
    });
  }

  const backend = resolveMemorySidecarBackend({
    config,
    backend: options.backend,
    client: options.client
  });
  if (!backend && !hasBackendReadiness(config)) {
    return {
      ...buildDisabledPayload({
        workflowStage: input.workflowStage,
        projectContext,
        config
      }),
      enabled: true,
      warnings: [buildCredentialWarning(config)]
    };
  }

  if (!backend?.search) {
    return {
      ...buildDisabledPayload({
        workflowStage: input.workflowStage,
        projectContext,
        config
      }),
      enabled: true,
      warnings: [buildUnavailableWarning(config)]
    };
  }

  const query = buildQuery({ input, projectContext });
  const result = await backend.search(query);
  const items = result.items.map(normalizeRecallItem);

  // Best-effort usage tracking for consolidation promotion
  trackRecallUsage(items, config);

  return {
    enabled: true,
    workflow_stage: input.workflowStage,
    project_id: query.project_id,
    limits: MEMORY_CONTRACT_LIMITS,
    source: config.backend,
    items,
    warnings: []
  };
};

export const recordMemory = async (event, options = {}) => {
  ensureWorkflowStage(event.workflow_stage);

  const config = options.config ?? resolveMemorySidecarConfig({ env: options.env });
  const projectContext = buildProjectContext({
    cwd: options.cwd,
    projectRoot: options.projectRoot,
    projectSlug: options.projectSlug,
    projectContext: options.projectContext,
    projectIdOverride: config.projectIdentity.override
  });

  if (!config.enabled) {
    return {
      enabled: false,
      recorded: false,
      warning: null,
      record: null
    };
  }

  const normalized = normalizeEvent({ event, projectContext });
  const backend = resolveMemorySidecarBackend({
    config,
    backend: options.backend,
    client: options.client
  });
  if (!backend && !hasBackendReadiness(config)) {
    return {
      enabled: true,
      recorded: false,
      warning: buildCredentialWarning(config),
      record: normalized
    };
  }

  if (!backend?.record) {
    return {
      enabled: true,
      recorded: false,
      warning: buildUnavailableWarning(config),
      record: normalized
    };
  }

  const recorded = await backend.record(normalized);

  return {
    enabled: true,
    recorded: true,
    warning: null,
    record: normalizeRecallItem(recorded)
  };
};

export const createMemorySidecarAdapter = ({ config, backend, env } = {}) => {
  const resolvedConfig = config ?? resolveMemorySidecarConfig({ env });
  const resolvedBackend = resolveMemorySidecarBackend({ config: resolvedConfig, backend });

  return {
    config: resolvedConfig,
    getRelevantMemories: (input, options = {}) =>
      getRelevantMemories(input, {
        ...options,
        config: resolvedConfig,
        backend: options.backend ?? resolvedBackend,
        env
      }),
    recordMemory: (event, options = {}) =>
      recordMemory(event, {
        ...options,
        config: resolvedConfig,
        backend: options.backend ?? resolvedBackend,
        env
      })
  };
};

export { DeterministicMemoryBackend };

const parseCliArgs = (argv) => {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;
    parsed[current.slice(2)] = argv[index + 1];
    index += 1;
  }

  return parsed;
};

const buildStatusPayload = ({ cwd, env }) => {
  const config = resolveMemorySidecarConfig({ env });
  const projectContext = buildProjectContext({ cwd, projectIdOverride: config.projectIdentity.override });

  return {
    ok: true,
    command: 'status',
    project: {
      projectRoot: projectContext.projectRoot,
      projectSlug: deriveMemoryProjectId(projectContext)
    },
    memory: {
      enabled: config.enabled,
      backend: config.backend,
      profile: config.profile,
      readiness: config.readiness
    }
  };
};

const runCli = async ({ argv = process.argv.slice(2), cwd = process.cwd(), env = process.env } = {}) => {
  const command = argv[0];
  const args = parseCliArgs(argv.slice(1));
  const resolvedCwd = env.AGENTS_PROJECT_ROOT?.trim() || cwd;

  if (command === 'status') {
    console.log(JSON.stringify(buildStatusPayload({ cwd: resolvedCwd, env }), null, 2));
    return;
  }

  if (command === 'recall') {
    const workflowStage = args['workflow-stage']?.trim();
    if (!workflowStage) {
      throw new Error('recall requires --workflow-stage <create-plan|implement-plan>');
    }

    const result = await getRelevantMemories({
      workflowStage,
      queryText: args.query?.trim() || null,
      contextSummary: args['context-summary']?.trim() || null,
      cwd: resolvedCwd
    }, { env });

    // Cap to 5 items before any filtering
    if (result.items) result.items = result.items.slice(0, 5);

    // LLM relevance filter: evaluate each recalled item against the current task
    if (args['filter-relevance'] != null && args.query?.trim() && result.items?.length) {
      try {
        const { evaluateRecallRelevance } = await import('./memory-quality-gate.mjs');
        const filtered = [];
        const deadline = Date.now() + 3000; // 3-second total budget
        for (const item of result.items) {
          if (Date.now() >= deadline) break;
          const verdict = await evaluateRecallRelevance({
            memory: item.summary || item.text || '',
            taskDescription: args.query.trim(),
            workflowStage
          });
          if (verdict.applicable) {
            filtered.push({ ...item, relevance: verdict });
          }
        }
        result.items = filtered;
      } catch {
        // fail-open: return unfiltered items if quality gate import or LLM fails
      }
    }

    console.log(JSON.stringify({
      ok: true,
      command: 'recall',
      result
    }, null, 2));
    return;
  }

  throw new Error('Usage: node scripts/memory-sidecar-adapter.mjs <status|recall> [--workflow-stage stage] [--query text] [--context-summary text] [--filter-relevance]');
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
