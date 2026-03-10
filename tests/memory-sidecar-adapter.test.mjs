import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createMem0MemoryBackend,
  createMem0OssMemoryBackend,
  createMemorySidecarAdapter,
  DeterministicMemoryBackend,
  getRelevantMemories,
  MEMORY_ENV_KEYS,
  prepareMem0OssRuntimeEnv,
  recordMemory,
  resolveMemorySidecarBackend,
  resolveMemorySidecarConfig
} from '../scripts/memory-sidecar-adapter.mjs';
import { getProjectContext } from '../scripts/project-context.mjs';

const createRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
};

const buildOssEnv = (overrides = {}) => ({
  AGENTS_MEMORY_ENABLED: 'true',
  AGENTS_MEMORY_BACKEND: 'mem0-oss',
  AGENTS_MEMORY_OSS_LLM_API_KEY: 'oss-llm-key',
  AGENTS_MEMORY_OSS_LLM_MODEL: 'gpt-4.1-mini',
  AGENTS_MEMORY_OSS_EMBEDDER_API_KEY: 'oss-embed-key',
  AGENTS_MEMORY_OSS_VECTORSTORE_URL: 'http://localhost:6333',
  AGENTS_MEMORY_OSS_HISTORY_DB_PATH: '/tmp/agents-memory/history.db',
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

test('mem0 oss config exposes the oss profile and backend-specific readiness shape', () => {
  const config = resolveMemorySidecarConfig({
    env: {
      AGENTS_MEMORY_ENABLED: 'true',
      AGENTS_MEMORY_BACKEND: 'mem0-oss',
      AGENTS_MEMORY_OSS_LLM_API_KEY: 'oss-llm-key',
      AGENTS_MEMORY_OSS_LLM_MODEL: 'gpt-4.1-mini',
      AGENTS_MEMORY_OSS_EMBEDDER_API_KEY: 'oss-embed-key',
      AGENTS_MEMORY_OSS_VECTORSTORE_URL: 'http://localhost:6333',
      AGENTS_MEMORY_OSS_HISTORY_DB_PATH: '/tmp/agents-memory/history.db',
      AGENTS_MEMORY_PROJECT_ID_OVERRIDE: 'stable-project-id'
    }
  });

  assert.equal(config.enabled, true);
  assert.equal(config.backend, 'mem0-oss');
  assert.equal(config.profile, 'oss-node');
  assert.equal(config.readiness.backend, 'mem0-oss');
  assert.equal(config.readiness.overall, true);
  assert.equal(config.readiness.embedder.apiKeyPresent, true);
  assert.equal(config.readiness.llm.apiKeyPresent, true);
  assert.equal(config.readiness.llm.modelPresent, true);
  assert.equal(config.readiness.vectorStore.urlPresent, true);
  assert.equal(config.readiness.vectorStore.collection, 'agents-memory-v1');
  assert.equal(config.readiness.historyDb.pathPresent, true);
  assert.equal(config.readiness.historyDb.resolution, 'explicit-env');
  assert.equal(config.readiness.projectIdentityOverridePresent, true);
  assert.equal(config.mem0Oss.vectorStore.collection, 'agents-memory-v1');
  assert.equal(config.mem0Oss.historyDb.resolution, 'explicit-env');
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

test('mem0 oss mode warns and returns empty recall when required readiness inputs are missing', async () => {
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
    assert.match(result.warnings[0], /missing required credentials/);
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

test('resolveMemorySidecarBackend activates mem0 oss when the backend is ready', () => {
  const config = resolveMemorySidecarConfig({
    env: buildOssEnv()
  });
  const backend = resolveMemorySidecarBackend({
    config,
    client: {
      async search() {
        return { results: [] };
      },
      async getAll() {
        return { results: [] };
      },
      async add() {
        return { results: [] };
      }
    }
  });

  assert.equal(typeof backend.search, 'function');
  assert.equal(typeof backend.record, 'function');
});

test('mem0 oss search performs dual scope lookup, filters client-side, and dedupes by idempotency key', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-oss-'));
  const repoRoot = createRepo(tmpDir, 'oss-search');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const calls = [];
  const client = {
    async search(_queryText, options) {
      calls.push(options);
      if (options.userId === `project:${projectContext.projectSlug}`) {
        return {
          results: [
            {
              id: 'project-keep',
              memory: 'Keep the project lesson',
              score: 0.94,
              createdAt: '2026-03-09T03:00:00.000Z',
              metadata: {
                project_id: projectContext.projectSlug,
                workflow_stage: 'create-plan',
                memory_kind: 'lesson',
                scope: 'project',
                source_artifact: '/tmp/project.md',
                source_exists: true,
                superseded: false,
                confidence: 0.94,
                idempotency_key: 'dedupe-1'
              }
            },
            {
              id: 'project-drop-stage',
              memory: 'Wrong stage',
              score: 0.99,
              createdAt: '2026-03-09T02:00:00.000Z',
              metadata: {
                project_id: projectContext.projectSlug,
                workflow_stage: 'implement-plan',
                memory_kind: 'lesson',
                scope: 'project',
                source_artifact: '/tmp/stage.md',
                source_exists: true,
                superseded: false,
                confidence: 0.99
              }
            },
            {
              id: 'project-drop-source',
              memory: 'Deleted source',
              score: 0.93,
              createdAt: '2026-03-09T01:00:00.000Z',
              metadata: {
                project_id: projectContext.projectSlug,
                workflow_stage: 'create-plan',
                memory_kind: 'lesson',
                scope: 'project',
                source_artifact: '/tmp/deleted.md',
                source_exists: false,
                superseded: false,
                confidence: 0.93
              }
            }
          ]
        };
      }

      return {
        results: [
          {
            id: 'shared-dedupe',
            memory: 'Keep the project lesson',
            score: 0.89,
            createdAt: '2026-03-09T04:00:00.000Z',
            metadata: {
              project_id: projectContext.projectSlug,
              workflow_stage: 'create-plan',
              memory_kind: 'lesson',
              scope: 'shared',
              source_artifact: '/tmp/shared.md',
              source_exists: true,
              superseded: false,
              confidence: 0.89,
              idempotency_key: 'dedupe-1'
            }
          },
          {
            id: 'shared-keep',
            memory: 'Keep the shared preference',
            score: 0.91,
            createdAt: '2026-03-09T05:00:00.000Z',
            metadata: {
              project_id: projectContext.projectSlug,
              workflow_stage: 'create-plan',
              memory_kind: 'user_preference',
              scope: 'shared',
              source_artifact: '/tmp/shared-preference.md',
              source_exists: true,
              superseded: false,
              confidence: 0.91
            }
          },
          {
            id: 'shared-drop-kind',
            memory: 'Wrong kind for the query',
            score: 0.92,
            createdAt: '2026-03-09T06:00:00.000Z',
            metadata: {
              project_id: projectContext.projectSlug,
              workflow_stage: 'create-plan',
              memory_kind: 'failure_pattern',
              scope: 'shared',
              source_artifact: '/tmp/failure.md',
              source_exists: true,
              superseded: false,
              confidence: 0.92
            }
          },
          {
            id: 'shared-drop-superseded',
            memory: 'Superseded shared lesson',
            score: 0.95,
            createdAt: '2026-03-09T07:00:00.000Z',
            metadata: {
              project_id: projectContext.projectSlug,
              workflow_stage: 'create-plan',
              memory_kind: 'lesson',
              scope: 'shared',
              source_artifact: '/tmp/old.md',
              source_exists: true,
              superseded: true,
              confidence: 0.95
            }
          }
        ]
      };
    }
  };

  try {
    const result = await getRelevantMemories({
      workflowStage: 'create-plan',
      projectContext,
      allowedMemoryKinds: ['lesson', 'user_preference'],
      minScore: 0.9,
      queryText: 'project lessons and preferences'
    }, {
      env: buildOssEnv(),
      client
    });

    assert.equal(result.enabled, true);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map((item) => item.userId), [
      `project:${projectContext.projectSlug}`,
      'agents-shared'
    ]);
    assert.ok(calls.every((item) => item.limit === 12));
    assert.deepEqual(result.items.map((item) => item.id), ['project-keep', 'shared-keep']);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('mem0 oss search uses only project scope when shared kinds are not allowed', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-oss-'));
  const repoRoot = createRepo(tmpDir, 'oss-project-only');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const calls = [];
  const client = {
    async search(_queryText, options) {
      calls.push(options);
      return {
        results: [
          {
            id: 'project-only',
            memory: 'Failure pattern stays project-scoped',
            score: 0.95,
            createdAt: '2026-03-09T01:00:00.000Z',
            metadata: {
              project_id: projectContext.projectSlug,
              workflow_stage: 'implement-plan',
              memory_kind: 'failure_pattern',
              scope: 'project',
              source_artifact: '/tmp/failure-pattern.md',
              source_exists: true,
              superseded: false,
              confidence: 0.95
            }
          }
        ]
      };
    }
  };

  try {
    const result = await getRelevantMemories({
      workflowStage: 'implement-plan',
      projectContext,
      allowedMemoryKinds: ['failure_pattern'],
      minScore: 0.9,
      queryText: 'failure pattern'
    }, {
      env: buildOssEnv(),
      client
    });

    assert.equal(calls.length, 1);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, 'project-only');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('mem0 oss search caps output at the contract recall limit', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-oss-'));
  const repoRoot = createRepo(tmpDir, 'oss-cap');
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
  const backend = createMem0OssMemoryBackend({
    client: {
      async search() {
        return { results };
      }
    },
    config: resolveMemorySidecarConfig({ env: buildOssEnv() })
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

test('mem0 oss record deletes existing idempotent memory and re-adds with infer disabled', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-oss-'));
  const repoRoot = createRepo(tmpDir, 'oss-record');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const calls = [];
  const client = {
    async getAll(options) {
      calls.push(['getAll', options]);
      return {
        results: [
          {
            id: 'oss-existing-1',
            metadata: {
              idempotency_key: 'stable-key-oss'
            }
          }
        ]
      };
    },
    async delete(memoryId) {
      calls.push(['delete', memoryId]);
      return { message: 'deleted' };
    },
    async add(messages, options) {
      calls.push(['add', messages, options]);
      return {
        results: [
          {
            id: 'oss-new-1'
          }
        ]
      };
    },
    async update() {
      throw new Error('update should not be called');
    }
  };

  try {
    const result = await recordMemory({
      workflow_stage: 'create-plan',
      memory_kind: 'lesson',
      scope: 'project',
      summary: 'Delete then re-add the OSS memory entry.',
      source_artifact: '/tmp/oss-record/lesson.md',
      idempotency_key: 'stable-key-oss'
    }, {
      env: buildOssEnv(),
      projectContext,
      client
    });

    assert.equal(result.recorded, true);
    assert.deepEqual(calls[0], ['getAll', { userId: `project:${projectContext.projectSlug}` }]);
    assert.deepEqual(calls[1], ['delete', 'oss-existing-1']);
    assert.equal(calls[2][0], 'add');
    assert.equal(calls[2][2].infer, false);
    assert.equal(result.record.id, 'oss-new-1');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('mem0 oss record skips getAll and delete when no idempotency key is present', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-oss-'));
  const repoRoot = createRepo(tmpDir, 'oss-record-direct');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const calls = [];
  const client = {
    async add(messages, options) {
      calls.push(['add', messages, options]);
      return {
        results: [
          {
            id: 'oss-direct-1'
          }
        ]
      };
    }
  };

  try {
    const result = await recordMemory({
      workflow_stage: 'implement-plan',
      memory_kind: 'lesson',
      scope: 'project',
      summary: 'Direct OSS record without idempotency.',
      source_artifact: '/tmp/oss-record/direct.md'
    }, {
      env: buildOssEnv(),
      projectContext,
      client
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'add');
    assert.equal(calls[0][2].infer, false);
    assert.equal(result.record.id, 'oss-direct-1');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('mem0 oss backend stays unavailable when history db path is missing', () => {
  const backend = resolveMemorySidecarBackend({
    config: resolveMemorySidecarConfig({
      env: buildOssEnv({
        AGENTS_MEMORY_OSS_HISTORY_DB_PATH: ''
      })
    }),
    client: {
      async search() {
        return { results: [] };
      }
    }
  });

  assert.equal(backend, null);
});

test('mem0 oss backend stays unavailable when vector store url is missing', () => {
  const backend = resolveMemorySidecarBackend({
    config: resolveMemorySidecarConfig({
      env: buildOssEnv({
        AGENTS_MEMORY_OSS_VECTORSTORE_URL: ''
      })
    }),
    client: {
      async search() {
        return { results: [] };
      }
    }
  });

  assert.equal(backend, null);
});

test('mem0 oss backend stays unavailable when embedder credentials are missing', () => {
  const backend = resolveMemorySidecarBackend({
    config: resolveMemorySidecarConfig({
      env: buildOssEnv({
        AGENTS_MEMORY_OSS_EMBEDDER_API_KEY: ''
      })
    }),
    client: {
      async search() {
        return { results: [] };
      }
    }
  });

  assert.equal(backend, null);
});

test('mem0 oss backend stays unavailable when llm config is missing', () => {
  const backend = resolveMemorySidecarBackend({
    config: resolveMemorySidecarConfig({
      env: buildOssEnv({
        AGENTS_MEMORY_OSS_LLM_MODEL: ''
      })
    }),
    client: {
      async search() {
        return { results: [] };
      }
    }
  });

  assert.equal(backend, null);
});

test('mem0 oss setup requires MEM0_TELEMETRY=false before runtime import', () => {
  const previous = process.env.MEM0_TELEMETRY;
  process.env.MEM0_TELEMETRY = 'true';

  try {
    const backend = resolveMemorySidecarBackend({
      config: resolveMemorySidecarConfig({
        env: buildOssEnv()
      })
    });

    assert.equal(backend, null);
  } finally {
    if (previous === undefined) {
      delete process.env.MEM0_TELEMETRY;
    } else {
      process.env.MEM0_TELEMETRY = previous;
    }
  }
});

test('mem0 oss runtime env mirrors embedder base url into OPENAI_BASE_URL', () => {
  const previous = process.env.OPENAI_BASE_URL;

  try {
    process.env.OPENAI_BASE_URL = 'https://old.example/v1';
    prepareMem0OssRuntimeEnv(resolveMemorySidecarConfig({
      env: buildOssEnv({
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

test('project id override is used by both oss search and record paths', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-memory-oss-'));
  const repoRoot = createRepo(tmpDir, 'oss-override');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const calls = [];
  const override = 'stable-project-id';
  const env = buildOssEnv({
    AGENTS_MEMORY_PROJECT_ID_OVERRIDE: override
  });
  const client = {
    async search(_queryText, options) {
      calls.push(['search', options.userId]);
      return { results: [] };
    },
    async add(_messages, options) {
      calls.push(['add', options.userId]);
      return {
        results: [
          {
            id: 'oss-override-1'
          }
        ]
      };
    }
  };

  try {
    const recall = await getRelevantMemories({
      workflowStage: 'create-plan',
      projectContext
    }, {
      env,
      client
    });

    const recorded = await recordMemory({
      workflow_stage: 'create-plan',
      memory_kind: 'lesson',
      scope: 'project',
      summary: 'Use the stable override for recall and writes.',
      source_artifact: '/tmp/oss-override/lesson.md'
    }, {
      env,
      projectContext,
      client
    });

    assert.equal(recall.project_id, override);
    assert.equal(recorded.record.project_id, override);
    assert.deepEqual(calls, [
      ['search', `project:${override}`],
      ['search', 'agents-shared'],
      ['add', `project:${override}`]
    ]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
