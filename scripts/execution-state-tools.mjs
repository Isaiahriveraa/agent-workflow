import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureProjectContext } from './project-context.mjs';

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'session';

const project = ensureProjectContext();
const runtimeDir = path.join(project.projectDir, 'runtime', 'execution');
const activeStatePath = path.join(runtimeDir, 'active.json');
const notesRoot = path.join(runtimeDir, 'notepads');
const TERMINAL_STATUSES = new Set(['completed', 'stopped']);
const ACTIVE_STATUSES = new Set(['active', 'paused']);
const DEFAULT_NOTE_FILES = ['learnings.md', 'decisions.md', 'issues.md', 'verification.md', 'problems.md'];
const STALE_EXECUTION_MS = 6 * 60 * 60 * 1000;

const parseArgs = (args) => {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith('--')) continue;
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[current.slice(2)] = true;
      continue;
    }
    parsed[current.slice(2)] = next;
    index += 1;
  }
  return parsed;
};

const nowIso = () => new Date().toISOString();

const ensureExecutionDirs = () => {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.mkdirSync(notesRoot, { recursive: true });
};

const fail = (message, details = {}) => {
  const error = new Error(message);
  error.details = details;
  throw error;
};

const toAbsolutePath = (value, label) => {
  if (value == null || String(value).trim() === '') {
    fail(`${label} is required`);
  }
  return path.resolve(String(value));
};

const normalizeListArg = (value) =>
  value
    ? String(value)
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean)
    : [];

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

const parseHeadingTrail = (content, upToLine) => {
  const lines = content.split('\n');
  const headings = [];

  for (let index = 0; index < Math.min(lines.length, upToLine); index += 1) {
    const match = lines[index].match(/^(#{2,6})\s+(.*)$/);
    if (!match) continue;

    const depth = match[1].length;
    const title = match[2].trim();
    while (headings.length > 0 && headings[headings.length - 1].depth >= depth) {
      headings.pop();
    }
    headings.push({ depth, title });
  }

  return headings.map((heading) => heading.title);
};

const parsePlanTasks = (planPath) => {
  if (!fs.existsSync(planPath)) {
    fail(`Plan file does not exist: ${planPath}`);
  }

  const content = readFile(planPath);
  const lines = content.split('\n');
  const tasks = [];
  const hasCheckboxTasks = lines.some((line) => /^(\s*)- \[( |x)\]\s+/.test(line));

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const checkboxMatch = line.match(/^(\s*)- \[( |x)\]\s+(.*)$/i);
    if (checkboxMatch) {
      const label = checkboxMatch[3].trim();
      const headingTrail = parseHeadingTrail(content, index + 1);
      const scope = headingTrail.length > 0 ? headingTrail.join(' / ') : path.basename(planPath);
      tasks.push({
        key: `${slugify(`${scope}-${label}`)}-line-${index + 1}`,
        label,
        completed: checkboxMatch[2].toLowerCase() === 'x',
        line: index + 1,
        scope
      });
      continue;
    }

    if (hasCheckboxTasks) continue;

    const stepMatch = line.match(/^###\s+(Step\s+.+)$/);
    if (!stepMatch) continue;
    const label = stepMatch[1].trim();
    const headingTrail = parseHeadingTrail(content, index + 1);
    const scope = headingTrail.length > 0 ? headingTrail.join(' / ') : path.basename(planPath);
    tasks.push({
      key: `${slugify(`${scope}-${label}`)}-line-${index + 1}`,
      label,
      completed: false,
      line: index + 1,
      scope
    });
  }

  return tasks;
};

const ensureNotesDir = (planPath) => {
  ensureExecutionDirs();
  const planSlug = slugify(path.basename(planPath, path.extname(planPath)));
  const dir = path.join(notesRoot, planSlug);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of DEFAULT_NOTE_FILES) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, `# ${file.replace(/\.md$/, '').replace(/-/g, ' ')}\n`);
    }
  }
  return dir;
};

const readStateFile = () => {
  if (!fs.existsSync(activeStatePath)) return null;
  const parsed = JSON.parse(readFile(activeStatePath));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail(`Malformed execution state: ${activeStatePath}`);
  }
  return parsed;
};

const assertKnownTask = (state, taskKey) => {
  const knownKeys = new Set((state.task_catalog ?? []).map((task) => task.key));
  if (!knownKeys.has(taskKey)) {
    fail(`Unknown task key: ${taskKey}`, { taskKey });
  }
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const computeCurrentTaskKey = (state) => {
  const completed = new Set(state.completed_task_keys ?? []);
  const catalog = state.task_catalog ?? [];
  const nextTask = catalog.find((task) => !completed.has(task.key));
  return nextTask?.key ?? null;
};

const normalizeState = (state) => {
  const normalized = {
    ...state,
    schema: 'execution-state.v1',
    updated_at: nowIso(),
    session_ids: unique(state.session_ids ?? []),
    completed_task_keys: unique(state.completed_task_keys ?? []),
    task_sessions: state.task_sessions && typeof state.task_sessions === 'object' && !Array.isArray(state.task_sessions)
      ? state.task_sessions
      : {}
  };

  const currentTaskIsUsable = normalized.current_task_key
    && !normalized.completed_task_keys.includes(normalized.current_task_key);
  normalized.current_task_key = currentTaskIsUsable
    ? normalized.current_task_key
    : computeCurrentTaskKey(normalized);
  return normalized;
};

const writeState = (state) => {
  ensureExecutionDirs();
  const normalized = normalizeState(state);
  fs.writeFileSync(activeStatePath, JSON.stringify(normalized, null, 2) + '\n');
  return normalized;
};

const createState = ({
  planPath,
  sessionId,
  agent,
  worktreePath
}) => {
  const existing = readStateFile();
  if (existing && ACTIVE_STATUSES.has(existing.status)) {
    fail('Conflicting active execution already exists', {
      active_plan: existing.active_plan,
      status: existing.status,
      execution_path: activeStatePath
    });
  }

  const tasks = parsePlanTasks(planPath);
  const startedAt = nowIso();
  const notesDir = ensureNotesDir(planPath);
  const state = {
    schema: 'execution-state.v1',
    active_plan: planPath,
    plan_name: path.basename(planPath, path.extname(planPath)),
    started_at: startedAt,
    updated_at: startedAt,
    status: 'active',
    session_ids: sessionId ? [sessionId] : [],
    current_task_key: null,
    completed_task_keys: tasks.filter((task) => task.completed).map((task) => task.key),
    task_sessions: {},
    worktree_path: worktreePath ? path.resolve(worktreePath) : undefined,
    agent: agent ?? undefined,
    notes_dir: notesDir,
    last_checkpoint_at: undefined,
    stop_reason: undefined,
    task_catalog: tasks
  };

  return writeState(state);
};

const updateActiveState = (mutate) => {
  const current = readStateFile();
  if (!current) {
    fail(`No active execution state found at ${activeStatePath}`);
  }

  const next = mutate({ ...current });
  return writeState(next);
};

export const getExecutionStatePath = () => activeStatePath;

export const readActiveExecutionState = () => {
  const state = readStateFile();
  if (!state) return null;
  return { path: activeStatePath, state };
};

export const buildExecutionGuidance = (execution = readActiveExecutionState()) => {
  if (!execution?.state) {
    return {
      present: false,
      status: 'missing',
      remaining_task_count: 0,
      completed_task_count: 0,
      current_task: null,
      next_tasks: [],
      reminder: null,
      cleanup: null
    };
  }

  const state = execution.state;
  const completed = new Set(state.completed_task_keys ?? []);
  const catalog = state.task_catalog ?? [];
  const currentTaskFromCatalog = catalog.find((task) => task.key === state.current_task_key) ?? null;
  const syntheticCurrentTask = state.current_task_key
    ? {
        key: state.current_task_key,
        label: state.current_task_key,
        scope: state.active_plan ? path.basename(state.active_plan) : 'execution state'
      }
    : null;
  const currentTask = currentTaskFromCatalog ?? syntheticCurrentTask;
  const remainingTasks = catalog.length > 0
    ? catalog.filter((task) => !completed.has(task.key))
    : (
      ACTIVE_STATUSES.has(state.status) && currentTask
        ? [currentTask]
        : []
    );
  const updatedAt = state.updated_at ? new Date(state.updated_at).getTime() : null;
  const stale = Boolean(
    updatedAt
    && ACTIVE_STATUSES.has(state.status)
    && (Date.now() - updatedAt) > STALE_EXECUTION_MS
  );

  let reminder = null;
  if (state.status === 'active' && remainingTasks.length > 0) {
    reminder = `Execution is active with ${remainingTasks.length} remaining task(s). Continue the current task before starting unrelated work.`;
  } else if (state.status === 'paused' && remainingTasks.length > 0) {
    reminder = `Execution is paused with ${remainingTasks.length} remaining task(s). Resume it deliberately or clear it before starting something new.`;
  } else if (TERMINAL_STATUSES.has(state.status) && remainingTasks.length > 0) {
    reminder = `Execution is ${state.status} but ${remainingTasks.length} task(s) still appear incomplete in the tracked plan.`;
  }

  let cleanup = null;
  if (stale) {
    cleanup = {
      recommended_command: '/stop-work',
      reason: 'Execution state is stale and should be paused, stopped, resumed, or cleared before more continuation logic runs.'
    };
  } else if (TERMINAL_STATUSES.has(state.status)) {
    cleanup = {
      recommended_command: '/stop-work',
      reason: 'Execution state is terminal, so ordinary continuation flows should clear or replace it explicitly.'
    };
  }

  const visibleCurrentTask = TERMINAL_STATUSES.has(state.status) ? null : currentTask;

  return {
    present: true,
    status: state.status,
    stale,
    remaining_task_count: remainingTasks.length,
    completed_task_count: completed.size,
    current_task: visibleCurrentTask
      ? {
          key: visibleCurrentTask.key,
          label: visibleCurrentTask.label,
          scope: visibleCurrentTask.scope
        }
      : null,
    next_tasks: remainingTasks.slice(0, 3).map((task) => ({
      key: task.key,
      label: task.label,
      scope: task.scope
    })),
    reminder,
    cleanup
  };
};

const createCommand = (args) => {
  const planPath = toAbsolutePath(args.plan, 'plan path');
  return {
    action: 'create',
    execution_path: activeStatePath,
    state: createState({
      planPath,
      sessionId: args['session-id'],
      agent: args.agent,
      worktreePath: args.worktree
    })
  };
};

const readCommand = () => {
  const active = readActiveExecutionState();
  return {
    action: 'read',
    execution_path: activeStatePath,
    exists: Boolean(active),
    state: active?.state ?? null
  };
};

const adviseCommand = () => ({
  action: 'advise',
  execution_path: activeStatePath,
  guidance: buildExecutionGuidance()
});

const resumeCommand = (args) => {
  const active = readStateFile();
  if (!active) {
    fail(`No active execution state found at ${activeStatePath}`);
  }

  const state = updateActiveState((draft) => {
    if (TERMINAL_STATUSES.has(draft.status)) {
      fail(`Cannot resume terminal execution state: ${draft.status}`);
    }
    draft.status = 'active';
    draft.stop_reason = undefined;
    draft.session_ids = unique([...draft.session_ids, args['session-id']]);
    if (args.worktree) draft.worktree_path = path.resolve(args.worktree);
    if (args.agent) draft.agent = args.agent;
    return draft;
  });

  return {
    action: 'resume',
    execution_path: activeStatePath,
    state
  };
};

const updateProgressCommand = (args) => {
  const completeKeys = normalizeListArg(args.complete);
  const reopenKeys = normalizeListArg(args.reopen);
  const currentTaskKey = args['current-task'];

  const state = updateActiveState((draft) => {
    for (const taskKey of [...completeKeys, ...reopenKeys, currentTaskKey].filter(Boolean)) {
      assertKnownTask(draft, taskKey);
    }

    const completed = new Set(draft.completed_task_keys ?? []);
    for (const taskKey of completeKeys) completed.add(taskKey);
    for (const taskKey of reopenKeys) completed.delete(taskKey);
    draft.completed_task_keys = [...completed];
    draft.task_catalog = (draft.task_catalog ?? []).map((task) => ({
      ...task,
      completed: completed.has(task.key)
    }));
    draft.current_task_key = currentTaskKey ?? computeCurrentTaskKey({
      ...draft,
      completed_task_keys: draft.completed_task_keys
    });
    return draft;
  });

  return {
    action: 'update-progress',
    execution_path: activeStatePath,
    state
  };
};

const upsertTaskSessionCommand = (args) => {
  const taskKey = args['task-key'];
  if (!taskKey) fail('task key is required');

  const state = updateActiveState((draft) => {
    assertKnownTask(draft, taskKey);
    draft.task_sessions = {
      ...(draft.task_sessions ?? {}),
      [taskKey]: {
        task_key: taskKey,
        session_id: args['session-id'] ?? null,
        agent: args.agent ?? null,
        category: args.category ?? null,
        updated_at: nowIso()
      }
    };
    return draft;
  });

  return {
    action: 'upsert-task-session',
    execution_path: activeStatePath,
    state
  };
};

const markStoppedState = (status, stopReason) => (args) => ({
  action: status,
  execution_path: activeStatePath,
  state: updateActiveState((draft) => {
    draft.status = status;
    draft.stop_reason = args.reason ?? stopReason;
    if (args['last-checkpoint-at']) draft.last_checkpoint_at = args['last-checkpoint-at'];
    return draft;
  })
});

const clearCommand = () => {
  const active = readStateFile();
  if (!active) {
    return {
      action: 'clear',
      execution_path: activeStatePath,
      cleared: false,
      state: null
    };
  }

  fs.rmSync(activeStatePath, { force: true });
  return {
    action: 'clear',
    execution_path: activeStatePath,
    cleared: true,
    state: active
  };
};

const run = (commandName, commandArgs) => {
  switch (commandName) {
    case 'create':
      return createCommand(commandArgs);
    case 'read':
      return readCommand();
    case 'advise':
      return adviseCommand();
    case 'resume':
      return resumeCommand(commandArgs);
    case 'update-progress':
      return updateProgressCommand(commandArgs);
    case 'upsert-task-session':
      return upsertTaskSessionCommand(commandArgs);
    case 'pause':
      return markStoppedState('paused', 'paused')(commandArgs);
    case 'complete':
      return markStoppedState('completed', 'completed')(commandArgs);
    case 'stop':
      return markStoppedState('stopped', 'stopped')(commandArgs);
    case 'clear':
      return clearCommand();
    default:
      fail(
        'Usage: node scripts/execution-state-tools.mjs <create|read|advise|resume|update-progress|upsert-task-session|pause|complete|stop|clear> [--key value]'
      );
  }
};

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  try {
    console.log(JSON.stringify(run(command, args), null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      details: error.details ?? null
    }, null, 2));
    process.exitCode = 1;
  }
}
