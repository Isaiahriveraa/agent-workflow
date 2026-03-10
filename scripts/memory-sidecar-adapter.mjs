import { createRequire } from 'node:module';
import { MemoryClient } from 'mem0ai';

import {
  compareMemoryRecords,
  deriveMemoryProjectId,
  DeterministicMemoryBackend,
  MEMORY_CONTRACT_LIMITS,
  MEMORY_KINDS,
  MEMORY_WORKFLOW_STAGES,
  SHARED_SCOPE_ALLOWED_KINDS,
  SUPPORTED_MEM0_OSS_PROFILE,
  SUPPORTED_MEM0_PROFILE,
  normalizeMemoryRecord
} from './memory-sidecar-contract.mjs';
import { getProjectContext } from './project-context.mjs';

const require = createRequire(import.meta.url);

const truthy = new Set(['1', 'true', 'yes', 'on']);

const parseBoolean = (value) => truthy.has(String(value ?? '').trim().toLowerCase());

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
  ossLlmBaseUrl: 'AGENTS_MEMORY_OSS_LLM_BASE_URL',
  ossLlmApiKey: 'AGENTS_MEMORY_OSS_LLM_API_KEY',
  ossLlmModel: 'AGENTS_MEMORY_OSS_LLM_MODEL',
  ossEmbedderBaseUrl: 'AGENTS_MEMORY_OSS_EMBEDDER_BASE_URL',
  ossEmbedderApiKey: 'AGENTS_MEMORY_OSS_EMBEDDER_API_KEY',
  ossVectorstoreUrl: 'AGENTS_MEMORY_OSS_VECTORSTORE_URL',
  ossVectorstoreCollection: 'AGENTS_MEMORY_OSS_VECTORSTORE_COLLECTION',
  ossHistoryDbPath: 'AGENTS_MEMORY_OSS_HISTORY_DB_PATH',
  projectIdOverride: 'AGENTS_MEMORY_PROJECT_ID_OVERRIDE'
});

const resolveBackendProfile = (backend) =>
  backend === 'mem0-oss' ? SUPPORTED_MEM0_OSS_PROFILE : SUPPORTED_MEM0_PROFILE;

const buildReadiness = ({ backend, env }) => {
  if (backend === 'mem0-oss') {
    const embedder = {
      apiKeyPresent: Boolean(env[MEMORY_ENV_KEYS.ossEmbedderApiKey]?.trim()),
      baseUrlPresent: Boolean(env[MEMORY_ENV_KEYS.ossEmbedderBaseUrl]?.trim())
    };
    const llm = {
      apiKeyPresent: Boolean(env[MEMORY_ENV_KEYS.ossLlmApiKey]?.trim()),
      modelPresent: Boolean(env[MEMORY_ENV_KEYS.ossLlmModel]?.trim()),
      baseUrlPresent: Boolean(env[MEMORY_ENV_KEYS.ossLlmBaseUrl]?.trim())
    };
    const vectorStore = {
      urlPresent: Boolean(env[MEMORY_ENV_KEYS.ossVectorstoreUrl]?.trim()),
      collection: env[MEMORY_ENV_KEYS.ossVectorstoreCollection]?.trim() || SUPPORTED_MEM0_OSS_PROFILE.storage.collectionName
    };
    const historyDb = {
      pathPresent: Boolean(env[MEMORY_ENV_KEYS.ossHistoryDbPath]?.trim()),
      resolution: env[MEMORY_ENV_KEYS.ossHistoryDbPath]?.trim() ? 'explicit-env' : 'missing'
    };

    return {
      backend: 'mem0-oss',
      overall: embedder.apiKeyPresent && llm.apiKeyPresent && llm.modelPresent && vectorStore.urlPresent && historyDb.pathPresent,
      embedder,
      llm,
      vectorStore,
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
    mem0Oss: {
      llm: {
        baseUrl: env[MEMORY_ENV_KEYS.ossLlmBaseUrl]?.trim() || null,
        apiKeyPresent: readiness.backend === 'mem0-oss' ? readiness.llm.apiKeyPresent : false,
        model: env[MEMORY_ENV_KEYS.ossLlmModel]?.trim() || null
      },
      embedder: {
        baseUrl: env[MEMORY_ENV_KEYS.ossEmbedderBaseUrl]?.trim() || null,
        apiKeyPresent: readiness.backend === 'mem0-oss' ? readiness.embedder.apiKeyPresent : false,
        model: SUPPORTED_MEM0_OSS_PROFILE.storage.embeddingModel
      },
      vectorStore: {
        url: env[MEMORY_ENV_KEYS.ossVectorstoreUrl]?.trim() || null,
        collection: readiness.backend === 'mem0-oss'
          ? readiness.vectorStore.collection
          : SUPPORTED_MEM0_OSS_PROFILE.storage.collectionName
      },
      historyDb: {
        path: env[MEMORY_ENV_KEYS.ossHistoryDbPath]?.trim() || null,
        resolution: readiness.backend === 'mem0-oss' ? readiness.historyDb.resolution : 'unconfigured'
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

const buildUnavailableWarning = (config) =>
  `Memory enabled but backend "${config.backend}" is unavailable; returning empty advisory recall.`;

const buildCredentialWarning = (config) =>
  `Memory enabled but backend "${config.backend}" is missing required credentials; returning empty advisory recall.`;

const hasBackendReadiness = (config) => {
  if (config.backend === 'mem0-oss') {
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

let mem0OssMemoryClass = null;

const shouldAllowMem0TelemetryImport = () => {
  if (!Object.prototype.hasOwnProperty.call(process.env, 'MEM0_TELEMETRY')) {
    process.env.MEM0_TELEMETRY = 'false';
  }

  return String(process.env.MEM0_TELEMETRY).trim().toLowerCase() === 'false';
};

export const prepareMem0OssRuntimeEnv = (config) => {
  const embedderBaseUrl = config?.mem0Oss?.embedder?.baseUrl?.trim();
  if (embedderBaseUrl) {
    process.env.OPENAI_BASE_URL = embedderBaseUrl;
  }
};

const getMem0OssMemoryClass = () => {
  if (mem0OssMemoryClass) {
    return mem0OssMemoryClass;
  }

  if (!shouldAllowMem0TelemetryImport()) {
    return null;
  }

  ({ Memory: mem0OssMemoryClass } = require('mem0ai/oss'));
  return mem0OssMemoryClass;
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

const buildOssMetadata = (record, userId) => ({
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
  match_reason: record.match_reason ?? 'mem0-oss-search',
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

const normalizeOssMemoryItem = ({ memory, projectId }) => {
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
    match_reason: metadata.match_reason ?? 'mem0-oss-search',
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

const buildOssSearchFilters = ({ query, config, scope }) => ({
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

const normalizeOssSearchResults = ({ items, projectId }) =>
  items.flatMap((item) => {
    try {
      return [normalizeOssMemoryItem({ memory: item, projectId })];
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

const buildMem0OssConfig = (config) => ({
  embedder: {
    provider: 'openai',
    config: {
      apiKey: process.env[MEMORY_ENV_KEYS.ossEmbedderApiKey],
      model: SUPPORTED_MEM0_OSS_PROFILE.storage.embeddingModel,
      ...(config.mem0Oss.embedder.baseUrl ? { baseURL: config.mem0Oss.embedder.baseUrl } : {})
    }
  },
  vectorStore: {
    provider: 'qdrant',
    config: {
      collectionName: config.mem0Oss.vectorStore.collection,
      url: config.mem0Oss.vectorStore.url,
      dimension: SUPPORTED_MEM0_OSS_PROFILE.storage.embeddingDims
    }
  },
  llm: {
    provider: 'openai',
    config: {
      apiKey: process.env[MEMORY_ENV_KEYS.ossLlmApiKey],
      model: config.mem0Oss.llm.model,
      ...(config.mem0Oss.llm.baseUrl ? { baseURL: config.mem0Oss.llm.baseUrl } : {})
    }
  },
  historyDbPath: config.mem0Oss.historyDb.path,
  disableHistory: false
});

export const createMem0OssMemoryBackend = ({ client, config }) => {
  const ossClient = client;

  return {
    async search(query) {
      const projectSearch = await ossClient.search(
        buildMem0QueryText(query),
        buildOssSearchFilters({ query, config, scope: 'project' })
      );
      let rawItems = Array.isArray(projectSearch?.results) ? projectSearch.results : [];

      const allowShared = (query.allowed_memory_kinds ?? MEMORY_KINDS)
        .some((kind) => SHARED_SCOPE_ALLOWED_KINDS.includes(kind));

      if (allowShared) {
        const sharedSearch = await ossClient.search(
          buildMem0QueryText(query),
          buildOssSearchFilters({ query, config, scope: 'shared' })
        );
        rawItems = rawItems.concat(Array.isArray(sharedSearch?.results) ? sharedSearch.results : []);
      }

      const filtered = applyClientSideFilters(
        normalizeOssSearchResults({
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
      const metadata = buildOssMetadata(record, userId);
      const normalizedInput = normalizeMemoryRecord({
        ...record,
        created_at: metadata.created_at,
        metadata
      });

      if (normalizedInput.idempotency_key) {
        const existing = await ossClient.getAll({ userId });
        const existingItems = Array.isArray(existing?.results) ? existing.results : [];
        const match = existingItems.find((item) => item.metadata?.idempotency_key === normalizedInput.idempotency_key);
        if (match?.id) {
          await ossClient.delete(match.id);
        }
      }

      const added = await ossClient.add([
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
    if (!hasBackendReadiness(config)) {
      return null;
    }

    prepareMem0OssRuntimeEnv(config);

    const ossClient = client ?? (() => {
      const Memory = getMem0OssMemoryClass();
      if (!Memory) {
        return null;
      }

      return new Memory(buildMem0OssConfig(config));
    })();

    if (!ossClient) {
      return null;
    }

    return createMem0OssMemoryBackend({ client: ossClient, config });
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

  return {
    enabled: true,
    workflow_stage: input.workflowStage,
    project_id: query.project_id,
    limits: MEMORY_CONTRACT_LIMITS,
    source: config.backend,
    items: result.items.map(normalizeRecallItem),
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
