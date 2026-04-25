import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { ensureProjectContext } from './project-context.mjs';

const truthy = new Set(['1', 'true', 'yes', 'on']);
const DEFAULT_MEMPALACE_PYTHON = '/opt/homebrew/bin/python3.13';

export const MEMPALACE_ENV_KEYS = Object.freeze({
  enabled: 'AGENTS_MEMPALACE_ENABLED',
  python: 'AGENTS_MEMPALACE_PYTHON',
  palacePath: 'AGENTS_MEMPALACE_PALACE_PATH',
  wing: 'AGENTS_MEMPALACE_WING',
  topK: 'AGENTS_MEMPALACE_TOP_K'
});

const parseBoolean = (value) => truthy.has(String(value ?? '').trim().toLowerCase());

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const limitText = (value, maxLength) => {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const projectWingFallback = (projectContext) =>
  path.basename(projectContext?.projectRoot ?? process.cwd()).replace(/\s+/g, '_').toLowerCase();

const inferTopics = (text) => {
  const source = String(text ?? '').toLowerCase();
  const topics = new Set();
  const definitions = [
    ['frontend', /\b(front ?end|ui|ux|css|tailwind|component|layout|responsive|design|styling|animation)\b/],
    ['backend', /\b(back ?end|api|server|route|endpoint|service|handler)\b/],
    ['testing', /\b(test|vitest|jest|playwright|coverage|flaky|assert|spec)\b/],
    ['auth', /\b(auth|login|session|oauth|token|permission|rbac|acl)\b/],
    ['database', /\b(sql|postgres|mysql|sqlite|schema|query|migration|database|db)\b/],
    ['performance', /\b(perf|performance|latency|slow|optimi[sz]e|cache|bundle|memory leak)\b/],
    ['tooling', /\b(build|lint|typecheck|ci|workflow|hook|config|tooling|cli|codex|claude|gemini|openclaw)\b/],
    ['docs', /\b(readme|docs|documentation|guide|onboarding)\b/]
  ];

  for (const [topic, pattern] of definitions) {
    if (pattern.test(source)) topics.add(topic);
  }

  return [...topics];
};

export const inferMemPalaceWorkflowStage = (text) =>
  /\b(plan|brainstorm|spec|design|approach|tradeoff|requirements)\b/i.test(String(text ?? ''))
    ? 'create-plan'
    : 'implement-plan';

const buildTopicQueries = ({ text, topics, projectContext }) => {
  const queries = [];
  const cleaned = normalizeWhitespace(text);
  const projectName = path.basename(projectContext.projectRoot);

  if (cleaned) queries.push(cleaned);
  if (topics.includes('frontend')) queries.push(`${projectName} frontend ui preferences mistakes styling decisions`);
  if (topics.includes('testing')) queries.push(`${projectName} testing failures regressions coverage`);
  if (topics.includes('auth')) queries.push(`${projectName} auth decisions session token permissions`);
  if (topics.includes('database')) queries.push(`${projectName} database schema query migration decisions`);
  if (topics.includes('performance')) queries.push(`${projectName} slow performance optimization bottlenecks`);
  if (topics.includes('tooling')) queries.push(`${projectName} cli workflow hooks config preferences`);

  return [...new Set(queries)].slice(0, 4);
};

const runPythonJson = ({ env, python, code, args = [], timeout = 8000 }) => {
  const result = spawnSync(python, ['-c', code, ...args], {
    encoding: 'utf8',
    env,
    timeout
  });

  if (result.status !== 0) {
    return {
      ok: false,
      error: normalizeWhitespace(result.stderr || result.stdout || `Python exited with status ${result.status}`)
    };
  }

  try {
    return { ok: true, value: JSON.parse(result.stdout || '{}') };
  } catch (error) {
    return { ok: false, error: `Failed to parse MemPalace JSON output: ${error.message}` };
  }
};

export const resolveMemPalaceConfig = ({
  env = process.env,
  projectContext = ensureProjectContext()
} = {}) => {
  const enabled = parseBoolean(env[MEMPALACE_ENV_KEYS.enabled]);
  const python = env[MEMPALACE_ENV_KEYS.python]?.trim() || DEFAULT_MEMPALACE_PYTHON;
  const palacePath = env[MEMPALACE_ENV_KEYS.palacePath]?.trim() || path.join(os.homedir(), '.mempalace', 'palace');
  const wing = env[MEMPALACE_ENV_KEYS.wing]?.trim() || projectWingFallback(projectContext);
  const topK = Number(env[MEMPALACE_ENV_KEYS.topK] ?? 4) || 4;
  const runtimeEnv = { ...env, MEMPALACE_PALACE_PATH: palacePath };

  const installation = enabled
    ? runPythonJson({
        env: runtimeEnv,
        python,
        timeout: 5000,
        code: `import importlib.util, json
spec = importlib.util.find_spec("mempalace")
version = None
if spec is not None:
    try:
        import importlib.metadata
        version = importlib.metadata.version("mempalace")
    except Exception:
        version = None
print(json.dumps({"installed": spec is not None, "version": version}))`
      })
    : { ok: true, value: { installed: false, version: null } };

  return {
    enabled,
    python,
    palacePath,
    wing,
    topK,
    envKeys: { ...MEMPALACE_ENV_KEYS },
    readiness: {
      enabled,
      installed: installation.ok ? installation.value.installed === true : false,
      version: installation.ok ? installation.value.version ?? null : null,
      error: installation.ok ? null : installation.error
    }
  };
};

const buildRuntimeEnv = ({ env, config }) => ({
  ...env,
  MEMPALACE_PALACE_PATH: config.palacePath
});

export const getMemPalaceWakeUp = ({
  env = process.env,
  projectContext = ensureProjectContext(),
  wing
} = {}) => {
  const config = resolveMemPalaceConfig({ env, projectContext });
  if (!config.enabled || !config.readiness.installed) {
    return {
      enabled: config.enabled,
      installed: config.readiness.installed,
      text: null,
      warning: config.readiness.error
    };
  }

  const result = runPythonJson({
    env: buildRuntimeEnv({ env, config }),
    python: config.python,
    code: [
      'import json, os, sys',
      'from mempalace.layers import MemoryStack',
      'stack = MemoryStack(palace_path=os.environ.get("MEMPALACE_PALACE_PATH"))',
      'text = stack.wake_up(wing=(sys.argv[1] or None))',
      'print(json.dumps({"text": text}))'
    ].join('; '),
    args: [wing ?? config.wing]
  });

  return {
    enabled: config.enabled,
    installed: config.readiness.installed,
    text: result.ok ? result.value.text ?? null : null,
    warning: result.ok ? null : result.error
  };
};

export const searchMemPalace = ({
  query,
  env = process.env,
  projectContext = ensureProjectContext(),
  wing,
  topK
} = {}) => {
  const config = resolveMemPalaceConfig({ env, projectContext });
  if (!config.enabled || !config.readiness.installed || !normalizeWhitespace(query)) {
    return {
      enabled: config.enabled,
      installed: config.readiness.installed,
      query: normalizeWhitespace(query),
      results: [],
      warning: config.readiness.error
    };
  }

  const result = runPythonJson({
    env: buildRuntimeEnv({ env, config }),
    python: config.python,
    code: [
      'import json, sys',
      'from mempalace.config import MempalaceConfig',
      'from mempalace.searcher import search_memories',
      'cfg = MempalaceConfig()',
      'payload = search_memories(query=sys.argv[1], palace_path=cfg.palace_path, wing=(sys.argv[2] or None), n_results=int(sys.argv[3]))',
      'print(json.dumps(payload))'
    ].join('; '),
    args: [normalizeWhitespace(query), wing ?? config.wing, String(Math.max(1, Math.min(Number(topK ?? config.topK), 8)))]
  });

  return {
    enabled: config.enabled,
    installed: config.readiness.installed,
    query: normalizeWhitespace(query),
    results: result.ok ? result.value.results ?? [] : [],
    warning: result.ok ? null : result.error
  };
};

const dedupeHits = (hits) => {
  const seen = new Set();
  const output = [];

  for (const hit of hits) {
    const key = `${hit.wing}:${hit.room}:${hit.source_file}:${normalizeWhitespace(hit.text).slice(0, 120)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(hit);
  }

  return output;
};

const formatHit = (hit, query) =>
  `- [${query}] ${hit.wing}/${hit.room}${hit.source_file ? ` (${hit.source_file})` : ''} sim=${hit.similarity}: ${limitText(hit.text, 240)}`;

export const buildMemPalaceInjection = ({
  text,
  env = process.env,
  projectContext = ensureProjectContext(),
  topK
} = {}) => {
  const config = resolveMemPalaceConfig({ env, projectContext });
  const normalizedText = normalizeWhitespace(text);
  const inferredTopics = inferTopics(normalizedText);
  const workflowStage = inferMemPalaceWorkflowStage(normalizedText);

  if (!config.enabled) {
    return {
      enabled: false,
      installed: false,
      workflow_stage: workflowStage,
      inferred_topics: inferredTopics,
      queries: [],
      wake_up: null,
      items: [],
      warnings: []
    };
  }

  const wakeUp = getMemPalaceWakeUp({ env, projectContext });
  const queries = buildTopicQueries({ text: normalizedText, topics: inferredTopics, projectContext });
  const searches = queries.map((query) => searchMemPalace({ query, env, projectContext, topK }));
  const warnings = [
    ...(wakeUp.warning ? [wakeUp.warning] : []),
    ...searches.flatMap((search) => (search.warning ? [search.warning] : []))
  ];

  const items = dedupeHits(
    searches.flatMap((search) =>
      search.results.map((result) => ({
        ...result,
        query: search.query
      }))
    )
  ).slice(0, Math.max(2, Math.min(Number(topK ?? config.topK), 6)));

  const lines = [];
  if (wakeUp.text) {
    lines.push('MEMPALACE WAKE-UP:');
    lines.push(limitText(wakeUp.text, 900));
  }
  if (items.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('RELEVANT MEMORY:');
    lines.push(...items.map((item) => formatHit(item, item.query)));
  }
  if (lines.length > 0) {
    lines.push('');
    lines.push('Treat this as advisory memory. Verify with MemPalace MCP search before relying on a detail.');
  }

  return {
    enabled: true,
    installed: config.readiness.installed,
    workflow_stage: workflowStage,
    inferred_topics: inferredTopics,
    queries,
    wake_up: wakeUp.text,
    items,
    warnings: [...new Set(warnings)],
    additional_context: lines.join('\n')
  };
};
