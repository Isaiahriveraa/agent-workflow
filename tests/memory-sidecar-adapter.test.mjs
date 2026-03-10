import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createMem0LanceDbMemoryBackend,
  createMem0MemoryBackend,
  createMemorySidecarAdapter,
  DeterministicMemoryBackend,
  getRelevantMemories,
  MEMORY_ENV_KEYS,
  prepareLocalMemoryRuntimeEnv,
  recordMemory,
  resolveMemorySidecarBackend,
  resolveMemorySidecarConfig
} from '../scripts/memory-sidecar-adapter.mjs';
import { LanceDbLangChainStore } from '../scripts/memory-lancedb-store.mjs';
import { getProjectContext } from '../scripts/project-context.mjs';

const createRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
};

const buildDeprecatedBackendEnv = (overrides = {}) => ({
  AGENTS_MEMORY_ENABLED: 'true',
  AGENTS_MEMORY_BACKEND: 'mem0-oss',
  AGENTS_MEMORY_OSS_LLM_API_KEY: 'oss-llm-key',
  AGENTS_MEMORY_OSS_LLM_MODEL: 'gpt-4.1-mini',
  AGENTS_MEMORY_OSS_EMBEDDER_API_KEY: 'oss-embed-key',
  AGENTS_MEMORY_OSS_VECTORSTORE_URL: 'http://localhost:6333',
  AGENTS_MEMORY_OSS_HISTORY_DB_PATH: '/tmp/agents-memory/history.db',
  ...overrides
});

const buildLanceDbEnv = (overrides = {}) => ({
  AGENTS_MEMORY_ENABLED: 'true',
  AGENTS_MEMORY_BACKEND: 'mem0-lancedb',
  AGENTS_MEMORY_OSS_LLM_API_KEY: 'oss-llm-key',
  AGENTS_MEMORY_OSS_LLM_MODEL: 'gpt-4.1-mini',
  AGENTS_MEMORY_OSS_EMBEDDER_API_KEY: 'oss-embed-key',
  AGENTS_MEMORY_OSS_HISTORY_DB_PATH: '/tmp/agents-memory/history.db',
  AGENTS_MEMORY_LANCEDB_PATH: '/tmp/agents-memory/lancedb',
  ...overrides
});

test('memory adapter config stays disabled by default and exposes the supported env contract', () => {
  const config = resolveMemorySidecarConfig({ env: {} });

  assert.equal(config.enabled, false);
  assert.equal(config.backend, 'mem0');
  assert.equal(config.profile, 'platform-client');
  assert.deepEqual(Object.keys(config.envKeys).sort(), Object.keys(MEMORY_ENV_KEYS).sort());
  assert.equal(config.readiness.backend, 'mem0');
  assert.equal(config.readiness.overall, false);
});

test('deprecated mem0 oss config keeps the local runtime profile and deprecated readiness shape', () => {
  const config = resolveMemorySidecarConfig({
    env: {
      AGENTS_MEMORY_ENABLED: 'true',
      AGENTS_MEMORY_BACKEND: 'mem0-oss',
      AGENTS_MEMORY_OSS_LLM_API_KEY: 'oss-llm-key',
      AGENTS_MEMORY_OSS_LLM_MODEL: 'gpt-4.1-mini',
      AGENTS_MEMORY_OSS_EMBEDDER_API_KEY: 'oss-embed-key',
      AGENTS_MEMORY_OSS_HISTORY_DB_PATH: '/tmp/agents-memory/history.db',
      AGENTS_MEMORY_PROJECT_ID_OVERRIDE: 'stable-project-id'
    }
  });

  assert.equal(config.enabled, true);
  assert.equal(config.backend, 'mem0-oss');
  assert.equal(config.profile, 'oss-node');
  assert.equal(config.readiness.backend, 'mem0-oss');
  assert.equal(config.readiness.overall, false);
  assert.equal(config.readiness.deprecated, true);
  assert.equal(config.localMemory.llm.apiKeyPresent, false);
  assert.equal(config.localMemory.embedder.apiKeyPresent, false);
  assert.equal(config.localMemory.historyDb.resolution, 'explicit-env');
  assert.equal(config.readiness.projectIdentityOverridePresent, true);
  assert.equal(config.projectIdentity.override, 'stable-project-id');
});

test('mem0 lancedb config exposes the lancedb profile and derived path shape', () => {
  const config = resolveMemorySidecarConfig({
    env: buildLanceDbEnv({
      AGENTS_MEMORY_LANCEDB_PATH: '',
      AGENTS_MEMORY_PROJECT_ID_OVERRIDE: 'stable-project-id'
    })
  });

  assert.equal(config.enabled, true);
  assert.equal(config.backend, 'mem0-lancedb');
  assert.equal(config.profile, 'oss-node');
  assert.equal(config.readiness.backend, 'mem0-lancedb');
  assert.equal(config.readiness.overall, true);
  assert.equal(config.readiness.lanceDb.pathPresent, true);
  assert.equal(config.readiness.lanceDb.pathResolution, 'derived-from-history-db');
  assert.equal(config.readiness.lanceDb.tableBase, 'agents_memory_v1');
  assert.equal(config.localMemory.lanceDb.path, '/tmp/agents-memory/lancedb');
  assert.equal(config.localMemory.lanceDb.pathResolution, 'derived-from-history-db');
  assert.equal(config.projectIdentity.override, 'stable-project-id');
});

test('getRelevantMemories is a no-op when memory is disabled', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-adapter-'));
  const repoRoot = createRepo(tmpDir, 'disabled');

  try {
    const result = await getRelevantMemories({
      workflowStage: 'create-plan',
      cwd: repoRoot
    }, {
      env: {}
    });

    assert.equal(result.enabled, false);
    assert.equal(result.workflow_stage, 'create-plan');
    assert.match(result.project_id, /^disabled-[0-9a-f]{8}$/);
    assert.deepEqual(result.items, []);
    assert.deepEqual(result.warnings, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enabled mode returns a normalized advisory payload from the Mem0 backend mapping', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-adapter-'));
  const repoRoot = createRepo(tmpDir, 'enabled');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const client = {
    async search() {
      return [
        {
          id: 'project-lesson-1',
          memory: 'Prefer explicit validation before enabling workflow mutations.',
          score: 0.96,
          metadata: {
            project_id: projectContext.projectSlug,
            workflow_stage: 'create-plan',
            memory_kind: 'lesson',
            scope: 'project',
            source_artifact: '/tmp/enabled/research.md',
            confidence: 0.96,
            source_tool: 'lesson-tools',
            topic_tags: ['mem0', 'workflow'],
            created_at: '2026-03-09T00:00:00.000Z'
          }
        }
      ];
    }
  };

  try {
    const result = await getRelevantMemories({
      workflowStage: 'create-plan',
      projectContext,
      queryText: 'validation before enabling workflow mutations'
    }, {
      env: {
        AGENTS_MEMORY_ENABLED: 'true',
        AGENTS_MEMORY_API_KEY: 'test-key'
      },
      client
    });

    assert.equal(result.enabled, true);
    assert.equal(result.project_id, projectContext.projectSlug);
    assert.equal(result.items.length, 1);
    assert.deepEqual(result.items[0], {
      id: 'project-lesson-1',
      memory_kind: 'lesson',
      workflow_stage: 'create-plan',
      project_id: projectContext.projectSlug,
      scope: 'project',
      summary: 'Prefer explicit validation before enabling workflow mutations.',
      source_artifact: '/tmp/enabled/research.md',
      confidence: 0.96,
      match_reason: 'mem0-search',
      created_at: '2026-03-09T00:00:00.000Z',
      idempotency_key: null,
      metadata: {
        project_root: null,
        source_tool: 'lesson-tools',
        topic_tags: ['mem0', 'workflow'],
        project_match: true,
        filters_passed: ['project_id', 'workflow_stage', 'memory_kind', 'score_threshold']
      }
    });
    assert.deepEqual(result.warnings, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('enabled mode warns and returns empty recall when no backend is available', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-adapter-'));
  const repoRoot = createRepo(tmpDir, 'warning');

  try {
    const result = await getRelevantMemories({
      workflowStage: 'implement-plan',
      cwd: repoRoot
    }, {
      env: {
        AGENTS_MEMORY_ENABLED: 'true'
      }
    });

    assert.equal(result.enabled, true);
    assert.deepEqual(result.items, []);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /missing required credentials/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('mem0 oss mode warns and returns empty recall with the deprecation message', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-adapter-'));
  const repoRoot = createRepo(tmpDir, 'oss-warning');

  try {
    const result = await getRelevantMemories({
      workflowStage: 'implement-plan',
      cwd: repoRoot
    }, {
      env: {
        AGENTS_MEMORY_ENABLED: 'true',
        AGENTS_MEMORY_BACKEND: 'mem0-oss',
        AGENTS_MEMORY_OSS_LLM_API_KEY: 'oss-llm-key'
      }
    });

    assert.equal(result.enabled, true);
    assert.deepEqual(result.items, []);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /AGENTS_MEMORY_BACKEND=mem0-lancedb/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deprecated mem0 oss backend returns a migration warning instead of resolving silently to null', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-adapter-'));
  const repoRoot = createRepo(tmpDir, 'oss-deprecated');

  try {
    const config = resolveMemorySidecarConfig({
      env: buildDeprecatedBackendEnv()
    });

    const backend = resolveMemorySidecarBackend({ config });
    const result = await getRelevantMemories({
      workflowStage: 'implement-plan',
      cwd: repoRoot
    }, {
      config
    });

    assert.deepEqual(backend, { deprecated: true });
    assert.equal(result.enabled, true);
    assert.deepEqual(result.items, []);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /AGENTS_MEMORY_BACKEND=mem0-lancedb/);
    assert.match(result.warnings[0], /AGENTS_MEMORY_OSS_HISTORY_DB_PATH/);
    assert.match(result.warnings[0], /AGENTS_MEMORY_OSS_VECTORSTORE_URL/);
    assert.match(result.warnings[0], /AGENTS_MEMORY_OSS_VECTORSTORE_COLLECTION/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('recordMemory normalizes project metadata and writes through the Mem0 backend', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-adapter-'));
  const repoRoot = createRepo(tmpDir, 'recording');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const calls = [];
  const client = {
    async getAll() {
      calls.push(['getAll']);
      return [];
    },
    async add(messages, options) {
      calls.push(['add', messages, options]);
      return [{ id: 'mem-new-1', memory: messages[0].content, metadata: options.metadata }];
    }
  };

  try {
    const result = await recordMemory({
      workflow_stage: 'implement-plan',
      memory_kind: 'lesson',
      scope: 'project',
      summary: 'Carry project-root metadata through every mirrored memory write.',
      source_artifact: '/tmp/recording/lesson.md',
      source_tool: 'lesson-tools',
      topic_tags: ['memory', 'phase-1'],
      confidence: 0.91
    }, {
      env: {
        AGENTS_MEMORY_ENABLED: 'true',
        AGENTS_MEMORY_API_KEY: 'test-key'
      },
      projectContext,
      client
    });

    assert.equal(result.enabled, true);
    assert.equal(result.recorded, true);
    assert.deepEqual(calls.map(([name]) => name), ['add']);
    assert.equal(result.record.project_id, projectContext.projectSlug);
    assert.deepEqual(result.record.metadata, {
      project_root: repoRoot,
      source_tool: 'lesson-tools',
      topic_tags: ['memory', 'phase-1'],
      project_match: false,
      filters_passed: []
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('recordMemory updates an existing Mem0 memory when the idempotency key already exists', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-adapter-'));
  const repoRoot = createRepo(tmpDir, 'updating');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const calls = [];
  const client = {
    async getAll() {
      calls.push('getAll');
      return [{ id: 'mem-existing-1' }];
    },
    async update(memoryId, payload) {
      calls.push(['update', memoryId, payload]);
      return [{ id: memoryId, memory: payload.text, metadata: payload.metadata }];
    }
  };

  try {
    const result = await recordMemory({
      workflow_stage: 'create-plan',
      memory_kind: 'lesson',
      scope: 'project',
      summary: 'Update the existing curated memory instead of duplicating it.',
      source_artifact: '/tmp/updating/lesson.md',
      idempotency_key: 'stable-key-1'
    }, {
      env: {
        AGENTS_MEMORY_ENABLED: 'true',
        AGENTS_MEMORY_API_KEY: 'test-key'
      },
      projectContext,
      client
    });

    assert.equal(result.recorded, true);
    assert.deepEqual(calls[0], 'getAll');
    assert.equal(calls[1][0], 'update');
    assert.equal(calls[1][1], 'mem-existing-1');
    assert.equal(result.record.id, 'mem-existing-1');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('adapter instances reuse resolved config across reads and writes', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-adapter-'));
  const repoRoot = createRepo(tmpDir, 'factory');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const client = {
    async getAll() {
      return [];
    },
    async add(messages, options) {
      return [{ id: 'mem-factory-1', memory: messages[0].content, metadata: options.metadata }];
    },
    async search() {
      return [
        {
          id: 'mem-factory-1',
          memory: 'Factory adapter should reuse the resolved config.',
          score: 0.91,
          metadata: {
            project_id: projectContext.projectSlug,
            workflow_stage: 'create-plan',
            memory_kind: 'lesson',
            scope: 'project',
            source_artifact: '/tmp/factory/lesson.md',
            confidence: 0.91,
            created_at: '2026-03-09T00:00:00.000Z'
          }
        }
      ];
    }
  };
  const adapter = createMemorySidecarAdapter({
    env: {
      AGENTS_MEMORY_ENABLED: 'true',
      AGENTS_MEMORY_API_KEY: 'test-key',
      AGENTS_MEMORY_BASE_URL: 'https://api.mem0.ai'
    },
    backend: createMem0MemoryBackend({
      client,
      config: resolveMemorySidecarConfig({
        env: {
          AGENTS_MEMORY_ENABLED: 'true',
          AGENTS_MEMORY_API_KEY: 'test-key',
          AGENTS_MEMORY_BASE_URL: 'https://api.mem0.ai'
        }
      })
    })
  });

  try {
    assert.equal(adapter.config.enabled, true);
    assert.equal(adapter.config.mem0.host, 'https://api.mem0.ai');

    const recorded = await adapter.recordMemory({
      workflow_stage: 'create-plan',
      memory_kind: 'lesson',
      scope: 'project',
      summary: 'Factory adapter should reuse the resolved config.',
      source_artifact: '/tmp/factory/lesson.md'
    }, {
      projectContext
    });

    const recalled = await adapter.getRelevantMemories({
      workflowStage: 'create-plan',
      projectContext,
      minScore: 0,
      queryText: 'factory adapter memory'
    });

    assert.equal(recorded.recorded, true);
    assert.equal(recalled.items.length, 1);
    assert.equal(recalled.items[0].summary, 'Factory adapter should reuse the resolved config.');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('resolveMemorySidecarBackend creates a Mem0 backend only when credentials are present', async () => {
  const config = resolveMemorySidecarConfig({
    env: {
      AGENTS_MEMORY_ENABLED: 'true',
      AGENTS_MEMORY_API_KEY: 'test-key'
    }
  });
  const backend = resolveMemorySidecarBackend({
    config,
    client: {
      async search() {
        return [];
      },
      async getAll() {
        return [];
      },
      async add() {
        return [];
      }
    }
  });

  assert.equal(typeof backend.search, 'function');

  const missingCredentials = resolveMemorySidecarBackend({
    config: resolveMemorySidecarConfig({
      env: {
        AGENTS_MEMORY_ENABLED: 'true'
      }
    })
  });

  assert.equal(missingCredentials, null);
});

test('resolveMemorySidecarBackend resolves mem0 oss to the deprecated backend warning path', () => {
  const config = resolveMemorySidecarConfig({
    env: buildDeprecatedBackendEnv()
  });
  const backend = resolveMemorySidecarBackend({ config });

  assert.deepEqual(backend, { deprecated: true });
});

test('resolveMemorySidecarBackend activates mem0 lancedb when the backend is ready', () => {
  const backend = resolveMemorySidecarBackend({
    config: resolveMemorySidecarConfig({
      env: buildLanceDbEnv()
    }),
    client: async () => ({
      userId: 'project:test',
      store: {
        async findMemoryIdsByIdempotencyKey() {
          return [];
        },
        async deleteByMemoryId() {}
      },
      memoryClient: {
        async search() {
          return { results: [] };
        },
        async add() {
          return { results: [] };
        }
      }
    })
  });

  assert.equal(typeof backend.search, 'function');
  assert.equal(typeof backend.record, 'function');
});

test('mem0 lancedb search performs dual scope lookup and record deletes prior idempotent rows', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-lancedb-'));
  const repoRoot = createRepo(tmpDir, 'lancedb-search');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const calls = [];
  const backend = createMem0LanceDbMemoryBackend({
    config: resolveMemorySidecarConfig({
      env: buildLanceDbEnv()
    }),
    namespaceFactory: async (userId) => {
      calls.push(['namespace', userId]);
      return {
        userId,
        store: {
          async findMemoryIdsByIdempotencyKey(key) {
            calls.push(['find', userId, key]);
            return ['existing-memory-1'];
          },
          async deleteByMemoryId(memoryId) {
            calls.push(['delete', userId, memoryId]);
          }
        },
        memoryClient: {
          async search(_queryText, options) {
            calls.push(['search', userId, options.userId]);
            if (userId.startsWith('project:')) {
              return {
                results: [
                  {
                    id: 'project-keep',
                    memory: 'Keep the scoped project lesson',
                    score: 0.95,
                    createdAt: '2026-03-09T03:00:00.000Z',
                    metadata: {
                      project_id: projectContext.projectSlug,
                      workflow_stage: 'create-plan',
                      memory_kind: 'lesson',
                      scope: 'project',
                      source_artifact: '/tmp/project.md',
                      source_exists: true,
                      superseded: false,
                      confidence: 0.95
                    }
                  }
                ]
              };
            }

            return {
              results: [
                {
                  id: 'shared-keep',
                  memory: 'Keep the shared preference',
                  score: 0.93,
                  createdAt: '2026-03-09T04:00:00.000Z',
                  metadata: {
                    project_id: projectContext.projectSlug,
                    workflow_stage: 'create-plan',
                    memory_kind: 'user_preference',
                    scope: 'shared',
                    source_artifact: '/tmp/shared.md',
                    source_exists: true,
                    superseded: false,
                    confidence: 0.93
                  }
                }
              ]
            };
          },
          async add(_messages, options) {
            calls.push(['add', userId, options.userId, options.metadata.idempotency_key]);
            return {
              results: [
                {
                  id: 'lancedb-new-1'
                }
              ]
            };
          }
        }
      };
    }
  });

  try {
    const recall = await backend.search({
      project_id: projectContext.projectSlug,
      workflow_stage: 'create-plan',
      allowed_memory_kinds: ['lesson', 'user_preference'],
      min_score: 0.8,
      top_k: 3,
      query_text: 'project lessons and preferences'
    });
    const recorded = await backend.record({
      project_id: projectContext.projectSlug,
      workflow_stage: 'create-plan',
      memory_kind: 'lesson',
      scope: 'project',
      summary: 'Delete then re-add the LanceDB memory entry.',
      source_artifact: '/tmp/lancedb/lesson.md',
      idempotency_key: 'stable-key-lancedb',
      confidence: 0.9
    });

    assert.deepEqual(recall.items.map((item) => item.id), ['project-keep', 'shared-keep']);
    assert.equal(recorded.id, 'lancedb-new-1');
    assert.deepEqual(calls.filter(([name]) => name === 'search'), [
      ['search', `project:${projectContext.projectSlug}`, `project:${projectContext.projectSlug}`],
      ['search', 'agents-shared', 'agents-shared']
    ]);
    assert.deepEqual(calls.slice(-3), [
      ['find', `project:${projectContext.projectSlug}`, 'stable-key-lancedb'],
      ['delete', `project:${projectContext.projectSlug}`, 'existing-memory-1'],
      ['add', `project:${projectContext.projectSlug}`, `project:${projectContext.projectSlug}`, 'stable-key-lancedb']
    ]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('mem0 lancedb backend caps output at the contract recall limit', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-lancedb-'));
  const repoRoot = createRepo(tmpDir, 'lancedb-cap');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const results = Array.from({ length: 5 }, (_, index) => ({
    id: `project-${index + 1}`,
    memory: `Lesson ${index + 1}`,
    score: 0.99 - index * 0.01,
    createdAt: `2026-03-0${index + 1}T00:00:00.000Z`,
    metadata: {
      project_id: projectContext.projectSlug,
      workflow_stage: 'create-plan',
      memory_kind: 'lesson',
      scope: 'project',
      source_artifact: `/tmp/lesson-${index + 1}.md`,
      source_exists: true,
      superseded: false,
      confidence: 0.99 - index * 0.01
    }
  }));
  const backend = createMem0LanceDbMemoryBackend({
    config: resolveMemorySidecarConfig({ env: buildLanceDbEnv() }),
    namespaceFactory: async (userId) => ({
      userId,
      store: {
        async findMemoryIdsByIdempotencyKey() {
          return [];
        },
        async deleteByMemoryId() {}
      },
      memoryClient: {
        async search() {
          return { results };
        },
        async add() {
          return { results: [] };
        }
      }
    })
  });

  try {
    const result = await backend.search({
      project_id: projectContext.projectSlug,
      workflow_stage: 'create-plan',
      allowed_memory_kinds: ['lesson'],
      min_score: 0.8,
      top_k: 5,
      query_text: 'lesson'
    });

    assert.equal(result.items.length, 3);
    assert.deepEqual(result.items.map((item) => item.id), ['project-1', 'project-2', 'project-3']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('mem0 lancedb search drops records with wrong workflow_stage', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-lancedb-'));
  const repoRoot = createRepo(tmpDir, 'lancedb-stage-filter');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const backend = createMem0LanceDbMemoryBackend({
    config: resolveMemorySidecarConfig({ env: buildLanceDbEnv() }),
    namespaceFactory: async (userId) => ({
      userId,
      store: {
        async findMemoryIdsByIdempotencyKey() {
          return [];
        },
        async deleteByMemoryId() {}
      },
      memoryClient: {
        async search() {
          return {
            results: [
              {
                id: 'keep-create-plan',
                memory: 'Create-plan lesson',
                score: 0.94,
                createdAt: '2026-03-09T03:00:00.000Z',
                metadata: {
                  project_id: projectContext.projectSlug,
                  workflow_stage: 'create-plan',
                  memory_kind: 'lesson',
                  scope: 'project',
                  source_artifact: '/tmp/keep.md',
                  source_exists: true,
                  superseded: false,
                  confidence: 0.94
                }
              },
              {
                id: 'drop-implement-plan',
                memory: 'Implementation-only memory',
                score: 0.99,
                createdAt: '2026-03-09T04:00:00.000Z',
                metadata: {
                  project_id: projectContext.projectSlug,
                  workflow_stage: 'implement-plan',
                  memory_kind: 'lesson',
                  scope: 'project',
                  source_artifact: '/tmp/drop.md',
                  source_exists: true,
                  superseded: false,
                  confidence: 0.99
                }
              }
            ]
          };
        },
        async add() {
          return { results: [] };
        }
      }
    })
  });

  try {
    const result = await backend.search({
      project_id: projectContext.projectSlug,
      workflow_stage: 'create-plan',
      allowed_memory_kinds: ['lesson'],
      min_score: 0.8,
      top_k: 3,
      query_text: 'lesson'
    });

    assert.deepEqual(result.items.map((item) => item.id), ['keep-create-plan']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('mem0 lancedb search drops superseded records', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-lancedb-'));
  const repoRoot = createRepo(tmpDir, 'lancedb-superseded-filter');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const backend = createMem0LanceDbMemoryBackend({
    config: resolveMemorySidecarConfig({ env: buildLanceDbEnv() }),
    namespaceFactory: async (userId) => ({
      userId,
      store: {
        async findMemoryIdsByIdempotencyKey() {
          return [];
        },
        async deleteByMemoryId() {}
      },
      memoryClient: {
        async search() {
          return {
            results: [
              {
                id: 'keep-current',
                memory: 'Current lesson',
                score: 0.91,
                createdAt: '2026-03-09T03:00:00.000Z',
                metadata: {
                  project_id: projectContext.projectSlug,
                  workflow_stage: 'create-plan',
                  memory_kind: 'lesson',
                  scope: 'project',
                  source_artifact: '/tmp/current.md',
                  source_exists: true,
                  superseded: false,
                  confidence: 0.91
                }
              },
              {
                id: 'drop-superseded',
                memory: 'Superseded lesson',
                score: 0.97,
                createdAt: '2026-03-09T04:00:00.000Z',
                metadata: {
                  project_id: projectContext.projectSlug,
                  workflow_stage: 'create-plan',
                  memory_kind: 'lesson',
                  scope: 'project',
                  source_artifact: '/tmp/old.md',
                  source_exists: true,
                  superseded: true,
                  confidence: 0.97
                }
              }
            ]
          };
        },
        async add() {
          return { results: [] };
        }
      }
    })
  });

  try {
    const result = await backend.search({
      project_id: projectContext.projectSlug,
      workflow_stage: 'create-plan',
      allowed_memory_kinds: ['lesson'],
      min_score: 0.8,
      top_k: 3,
      query_text: 'lesson'
    });

    assert.deepEqual(result.items.map((item) => item.id), ['keep-current']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('local memory runtime env mirrors embedder base url into OPENAI_BASE_URL', () => {
  const previous = process.env.OPENAI_BASE_URL;

  try {
    process.env.OPENAI_BASE_URL = 'https://old.example/v1';
    prepareLocalMemoryRuntimeEnv(resolveMemorySidecarConfig({
      env: buildDeprecatedBackendEnv({
        AGENTS_MEMORY_OSS_EMBEDDER_BASE_URL: 'https://openrouter.ai/api/v1'
      })
    }));

    assert.equal(process.env.OPENAI_BASE_URL, 'https://openrouter.ai/api/v1');
  } finally {
    if (previous === undefined) {
      delete process.env.OPENAI_BASE_URL;
    } else {
      process.env.OPENAI_BASE_URL = previous;
    }
  }
});

test('lancedb langchain store can insert, search, and delete records locally', async () => {
  const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-lancedb-store-'));
  const store = new LanceDbLangChainStore({
    dbPath,
    tableName: 'agents_memory_v1_project_test'
  });

  try {
    await store.addVectors(
      [[1, 0], [0.9, 0.1]],
      [
        { metadata: { idempotency_key: 'key-1', summary: 'alpha' } },
        { metadata: { idempotency_key: 'key-2', summary: 'beta' } }
      ],
      { ids: ['mem-1', 'mem-2'] }
    );

    const matches = await store.similaritySearchVectorWithScore([1, 0], 2);
    const dedupe = await store.findMemoryIdsByIdempotencyKey('key-1');
    await store.delete({ filter: { _mem0_id: 'mem-1' } });
    const afterDelete = await store.findMemoryIdsByIdempotencyKey('key-1');

    assert.equal(matches.length, 2);
    assert.equal(matches[0][0].metadata.idempotency_key, 'key-1');
    assert.ok(matches[0][1] >= matches[1][1]);
    assert.deepEqual(dedupe, ['mem-1']);
    assert.deepEqual(afterDelete, []);
  } finally {
    fs.rmSync(dbPath, { recursive: true, force: true });
  }
});

test('mem0 lancedb backend stays unavailable when the history db path is missing', () => {
  const backend = resolveMemorySidecarBackend({
    config: resolveMemorySidecarConfig({
      env: buildLanceDbEnv({
        AGENTS_MEMORY_OSS_HISTORY_DB_PATH: ''
      })
    }),
    client: async () => null
  });

  assert.equal(backend, null);
});

test('mem0 lancedb backend stays unavailable when lancedb path is missing AND history db path is missing', () => {
  const backend = resolveMemorySidecarBackend({
    config: resolveMemorySidecarConfig({
      env: buildLanceDbEnv({
        AGENTS_MEMORY_LANCEDB_PATH: '',
        AGENTS_MEMORY_OSS_HISTORY_DB_PATH: ''
      })
    }),
    client: async () => null
  });

  assert.equal(backend, null);
});

test('project id override is used by lancedb search and record paths', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-lancedb-'));
  const repoRoot = createRepo(tmpDir, 'lancedb-override');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const calls = [];
  const override = 'stable-project-id';
  const env = buildLanceDbEnv({
    AGENTS_MEMORY_PROJECT_ID_OVERRIDE: override
  });
  const backend = createMem0LanceDbMemoryBackend({
    config: resolveMemorySidecarConfig({ env }),
    namespaceFactory: async (userId) => ({
      userId,
      store: {
        async findMemoryIdsByIdempotencyKey(key) {
          calls.push(['find', userId, key]);
          return [];
        },
        async deleteByMemoryId(memoryId) {
          calls.push(['delete', userId, memoryId]);
        }
      },
      memoryClient: {
        async search(_queryText, options) {
          calls.push(['search', userId, options.userId]);
          return { results: [] };
        },
        async add(_messages, options) {
          calls.push(['add', userId, options.userId]);
          return {
            results: [
              {
                id: 'lancedb-override-1'
              }
            ]
          };
        }
      }
    })
  });

  try {
    const recall = await getRelevantMemories({
      workflowStage: 'create-plan',
      projectContext
    }, {
      env,
      backend
    });

    const recorded = await recordMemory({
      workflow_stage: 'create-plan',
      memory_kind: 'lesson',
      scope: 'project',
      summary: 'Use the stable override for recall and writes.',
      source_artifact: '/tmp/lancedb-override/lesson.md'
    }, {
      env,
      projectContext,
      backend
    });

    assert.equal(recall.project_id, override);
    assert.equal(recorded.record.project_id, override);
    assert.deepEqual(calls, [
      ['search', `project:${override}`, `project:${override}`],
      ['search', 'agents-shared', 'agents-shared'],
      ['add', `project:${override}`, `project:${override}`]
    ]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
