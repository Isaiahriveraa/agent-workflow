import path from 'node:path';

export const MEMORY_KINDS = Object.freeze([
  'lesson',
  'failure_pattern',
  'user_preference',
  'prior_work_summary'
]);

export const MEMORY_WORKFLOW_STAGES = Object.freeze([
  'create-plan',
  'implement-plan'
]);

export const MEMORY_SCOPE_PRECEDENCE = Object.freeze([
  'project',
  'shared'
]);

export const SHARED_SCOPE_ALLOWED_KINDS = Object.freeze([
  'lesson',
  'user_preference'
]);

export const MEMORY_CONTRACT_LIMITS = Object.freeze({
  maxRecallItems: 3,
  maxRecallTokens: 600,
  latencyMedianMs: 1500,
  latencyP95Ms: 3000
});

export const MEMORY_EVALUATION_THRESHOLDS = Object.freeze({
  totalScenarios: 12,
  createPlanScenarios: 8,
  implementPlanScenarios: 2,
  crossProjectScenarios: 2,
  disabledModeParity: 1,
  relevantRecallPrecision: 0.8,
  noiseRejection: 0.9,
  crossProjectIsolation: 1,
  duplicateSuppression: 1,
  persistence: 1,
  fallbackSafety: 1
});

export const SUPPORTED_MEM0_PROFILE = Object.freeze({
  enabledByDefault: false,
  integration: 'platform-client',
  backend: 'mem0',
  projectIdentity: 'projectSlug',
  branchIsolation: 'shared-project-namespace',
  storage: {
    persistenceRequired: true,
    inMemoryFallbackAllowed: false,
    provider: 'mem0-managed'
  },
  model: {
    provider: 'mem0-managed',
    primary: 'mem0-platform-default',
    textFallback: 'mem0-platform-managed',
    embedding: 'mem0-platform-default',
    embeddingFallback: 'mem0-platform-managed'
  },
  failureMode: {
    disabled: 'silent-no-op',
    enabledBackendUnavailable: 'warn-and-return-empty'
  },
  openclaw: {
    supportedInV1: false,
    mode: 'native-markdown-memory-only',
    mem0Plugin: 'experimental',
    autoPromoteToAgents: false
  }
});

export const SUPPORTED_MEM0_OSS_PROFILE = Object.freeze({
  enabledByDefault: false,
  integration: 'oss-node',
  backend: 'mem0-oss',
  projectIdentity: 'projectSlug-or-override',
  branchIsolation: 'shared-project-namespace',
  storage: {
    persistenceRequired: true,
    inMemoryFallbackAllowed: false,
    provider: 'qdrant',
    collectionName: 'agents-memory-v1',
    embeddingDims: 1536,
    embeddingModel: 'text-embedding-3-small'
  },
  model: {
    provider: 'openai-compatible',
    primary: 'env:AGENTS_MEMORY_OSS_LLM_MODEL',
    embedding: 'text-embedding-3-small',
    inferMode: false
  },
  historyDb: {
    pathTemplate: '<projectRoot>/.agents-memory/history.db',
    explicitPathRequired: true
  },
  upsertStrategy: 'delete-and-readd',
  filterStrategy: 'dual-search-client-side-merge',
  failureMode: {
    disabled: 'silent-no-op',
    enabledBackendUnavailable: 'warn-and-return-empty'
  },
  openclaw: {
    supportedInV1: false
  }
});

const STAGE_COMPATIBILITY = Object.freeze({
  'create-plan': new Set(['create-plan']),
  'implement-plan': new Set(['implement-plan', 'create-plan'])
});

const kindAllowedInSharedScope = (memoryKind) =>
  SHARED_SCOPE_ALLOWED_KINDS.includes(memoryKind);

export const deriveMemoryProjectId = (projectContext) => {
  const projectId = projectContext?.projectIdOverride?.trim()
    || projectContext?.projectSlug?.trim();
  if (!projectId) {
    throw new Error('deriveMemoryProjectId requires projectContext.projectSlug or projectIdOverride');
  }
  return projectId;
};

const normalizeCreatedAt = (value) => {
  if (!value) return new Date(0).toISOString();
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid created_at value: ${value}`);
  }

  return parsed.toISOString();
};

const ensureAbsoluteArtifactPath = (value) => {
  if (!value) return null;
  if (!path.isAbsolute(value)) {
    throw new Error('memory record source_artifact must be an absolute path');
  }
  return value;
};

export const normalizeMemoryRecord = (record) => {
  if (!MEMORY_KINDS.includes(record.memory_kind)) {
    throw new Error(`Unsupported memory_kind: ${record.memory_kind}`);
  }

  if (!MEMORY_WORKFLOW_STAGES.includes(record.workflow_stage)) {
    throw new Error(`Unsupported workflow_stage: ${record.workflow_stage}`);
  }

  if (!MEMORY_SCOPE_PRECEDENCE.includes(record.scope)) {
    throw new Error(`Unsupported scope: ${record.scope}`);
  }

  if (record.scope === 'shared' && !kindAllowedInSharedScope(record.memory_kind)) {
    throw new Error(`Shared scope is not allowed for memory_kind: ${record.memory_kind}`);
  }

  const sourceArtifact = ensureAbsoluteArtifactPath(record.source_artifact);
  const createdAt = normalizeCreatedAt(record.created_at);
  const confidence = Number(record.confidence ?? record.score ?? 0);

  return {
    id: record.id ?? `${record.project_id}:${record.memory_kind}:${createdAt}`,
    project_id: record.project_id,
    workflow_stage: record.workflow_stage,
    memory_kind: record.memory_kind,
    scope: record.scope,
    summary: record.summary,
    source_artifact: sourceArtifact,
    source_exists: record.source_exists !== false,
    superseded: record.superseded === true,
    confidence,
    score: Number(record.score ?? confidence),
    match_reason: record.match_reason ?? 'fixture-match',
    created_at: createdAt,
    idempotency_key: record.idempotency_key ?? null,
    metadata: {
      project_root: record.metadata?.project_root ?? null,
      source_tool: record.metadata?.source_tool ?? null,
      topic_tags: [...(record.metadata?.topic_tags ?? [])]
    }
  };
};

export class DeterministicMemoryBackend {
  constructor(seedRecords = []) {
    this.records = seedRecords.map((record) => normalizeMemoryRecord(record));
  }

  record(event) {
    const normalized = normalizeMemoryRecord(event);
    if (normalized.idempotency_key) {
      const existingIndex = this.records.findIndex((record) => record.idempotency_key === normalized.idempotency_key);
      if (existingIndex >= 0) {
        this.records.splice(existingIndex, 1, normalized);
        return normalized;
      }
    }

    this.records.push(normalized);
    return normalized;
  }

  search(query) {
    const stage = query.workflow_stage;
    const compatibleStages = STAGE_COMPATIBILITY[stage];

    if (!compatibleStages) {
      throw new Error(`Unsupported query workflow_stage: ${stage}`);
    }

    const allowedKinds = query.allowed_memory_kinds ?? MEMORY_KINDS;
    const minScore = Number(query.min_score ?? 0);
    const topK = Math.min(
      Number(query.top_k ?? MEMORY_CONTRACT_LIMITS.maxRecallItems),
      MEMORY_CONTRACT_LIMITS.maxRecallItems
    );

    const deduped = new Map();

    for (const record of this.records) {
      if (!allowedKinds.includes(record.memory_kind)) continue;
      if (!compatibleStages.has(record.workflow_stage)) continue;
      if (record.superseded) continue;
      if (!record.source_exists) continue;
      if (record.score < minScore) continue;

      const isProjectScoped = record.scope === 'project' && record.project_id === query.project_id;
      const isSharedScoped = record.scope === 'shared' && kindAllowedInSharedScope(record.memory_kind);

      if (!isProjectScoped && !isSharedScoped) continue;

      const dedupeKey = record.idempotency_key
        ?? `${record.scope}:${record.memory_kind}:${record.summary}:${record.source_artifact ?? 'none'}`;
      const existing = deduped.get(dedupeKey);

      if (!existing || compareMemoryRecords(record, existing) < 0) {
        deduped.set(dedupeKey, record);
      }
    }

    const items = [...deduped.values()]
      .sort(compareMemoryRecords)
      .slice(0, topK)
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
      total_considered: this.records.length
    };
  }
}

export const compareMemoryRecords = (left, right) => {
  const scopeRank = MEMORY_SCOPE_PRECEDENCE.indexOf(left.scope) - MEMORY_SCOPE_PRECEDENCE.indexOf(right.scope);
  if (scopeRank !== 0) return scopeRank;
  if (right.score !== left.score) return right.score - left.score;
  if (left.created_at !== right.created_at) {
    return right.created_at.localeCompare(left.created_at);
  }
  return left.id.localeCompare(right.id);
};
