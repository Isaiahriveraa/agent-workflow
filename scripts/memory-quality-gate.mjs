import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDefaultEnvFiles } from './env-file-tools.mjs';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

loadDefaultEnvFiles({ cwd: root });

// ---------------------------------------------------------------------------
// LLM availability check — cached at module load
// ---------------------------------------------------------------------------

const LLM_AVAILABLE = Boolean(process.env.AGENTS_MEMORY_OSS_LLM_API_KEY?.trim());

const LLM_BASE_URL = (process.env.AGENTS_MEMORY_OSS_LLM_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
const LLM_API_KEY = process.env.AGENTS_MEMORY_OSS_LLM_API_KEY || '';
const LLM_MODEL = process.env.AGENTS_MEMORY_OSS_LLM_MODEL || 'qwen/qwen3.5-flash-02-23';

const WRITE_THRESHOLD = 3.0;
const DEDUP_COSINE_THRESHOLD = 0.92;
const LLM_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Shared LLM caller
// ---------------------------------------------------------------------------

const stripLlmWrapper = (text) => {
  // Strip <think>...</think> reasoning blocks (Qwen-style)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<\/think>/g, '');
  // Strip markdown code fences
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  cleaned = fenced ? fenced[1].trim() : cleaned.trim();
  return cleaned;
};

async function callLlm(messages) {
  if (!LLM_AVAILABLE) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        temperature: 0.1,
        max_tokens: 200
      }),
      signal: controller.signal
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const cleaned = stripLlmWrapper(content);
    return JSON.parse(cleaned);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Write gate — evaluates whether a lesson is worth storing
// ---------------------------------------------------------------------------

const WRITE_GATE_PROMPT = `You are a quality evaluator for a developer lesson-learning system. Given a candidate lesson, score it on 4 dimensions (1-5 each):
- Reusability: Will this help in a future session? (1=one-off fix, 5=broadly applicable)
- Novelty: Is this non-obvious / not derivable from reading the code? (1=obvious, 5=surprising insight)
- Durability: Is this a stable truth, not likely to change soon? (1=ephemeral, 5=long-lived principle)
- Specificity: Is the rule concrete enough to act on? (1=vague platitude, 5=precise actionable rule)

Return ONLY valid JSON (no markdown wrapping):
{"reusability": N, "novelty": N, "durability": N, "specificity": N, "overall": N, "pass": BOOL, "reason": "one sentence"}

The "overall" field is the average of the 4 scores. "pass" is true if overall >= 3.0.`;

export async function evaluateWriteWorthiness({ what, why, rule, context }) {
  if (!LLM_AVAILABLE) {
    return { pass: true, score: 0, reason: 'LLM unavailable — fail-open', gated: false };
  }

  const result = await callLlm([
    { role: 'system', content: WRITE_GATE_PROMPT },
    {
      role: 'user',
      content: `What happened: ${what}\nWhy it matters: ${why}\nRule to remember: ${rule}${context ? `\nContext: ${context}` : ''}`
    }
  ]);

  if (!result || typeof result.pass !== 'boolean' || typeof result.overall !== 'number') {
    return { pass: true, score: 0, reason: 'LLM response malformed — fail-open', gated: false };
  }

  return {
    pass: result.overall >= WRITE_THRESHOLD,
    score: result.overall,
    reason: result.reason || '',
    gated: true,
    dimensions: {
      reusability: result.reusability,
      novelty: result.novelty,
      durability: result.durability,
      specificity: result.specificity
    }
  };
}

// ---------------------------------------------------------------------------
// Read gate — evaluates whether a recalled memory is applicable
// ---------------------------------------------------------------------------

const READ_GATE_PROMPT = `You are a relevance evaluator for a developer memory recall system. Given a task description and a recalled lesson, determine if the lesson is directly applicable.

Return ONLY valid JSON (no markdown wrapping):
{"applicable": BOOL, "confidence": N, "reason": "one sentence"}

"confidence" is 0.0-1.0. "applicable" should be true only if the lesson could save time or prevent a known mistake for this specific task.`;

export async function evaluateRecallRelevance({ memory, taskDescription, workflowStage }) {
  if (!LLM_AVAILABLE) {
    return { applicable: true, confidence: 0, reason: 'LLM unavailable — fail-open' };
  }

  const result = await callLlm([
    { role: 'system', content: READ_GATE_PROMPT },
    {
      role: 'user',
      content: `Task: ${taskDescription}\nWorkflow stage: ${workflowStage}\nRecalled lesson: ${memory}`
    }
  ]);

  if (!result || typeof result.applicable !== 'boolean') {
    return { applicable: true, confidence: 0, reason: 'LLM response malformed — fail-open' };
  }

  return {
    applicable: result.applicable,
    confidence: result.confidence ?? 0,
    reason: result.reason || ''
  };
}

// ---------------------------------------------------------------------------
// Cosine dedup check
// ---------------------------------------------------------------------------

export async function checkNovelty({ summary, projectContext, adapter }) {
  try {
    const result = await adapter.getRelevantMemories(
      {
        workflowStage: 'create-plan',
        queryText: summary,
        cwd: projectContext?.projectRoot || process.cwd()
      },
      { projectContext }
    );

    const items = result.items || [];
    for (const item of items) {
      const similarity = item.score ?? item.similarity ?? 0;
      if (!Number.isFinite(similarity)) continue;
      if (similarity > DEDUP_COSINE_THRESHOLD) {
        return { isDuplicate: true, existingMemory: item };
      }
    }

    return { isDuplicate: false, existingMemory: null };
  } catch {
    return { isDuplicate: false, existingMemory: null };
  }
}

// ---------------------------------------------------------------------------
// CLI test interface
// ---------------------------------------------------------------------------

const runCli = async () => {
  const argv = process.argv.slice(2);
  const command = argv[0];

  const parseArgs = (args) => {
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        parsed[args[i].slice(2)] = args[i + 1] || '';
        i++;
      }
    }
    return parsed;
  };

  if (command === 'test-write') {
    const args = parseArgs(argv.slice(1));
    const verdict = await evaluateWriteWorthiness({
      what: args.what || '',
      why: args.why || '',
      rule: args.rule || '',
      context: args.context || ''
    });
    console.log(JSON.stringify(verdict, null, 2));
    return;
  }

  if (command === 'test-read') {
    const args = parseArgs(argv.slice(1));
    const verdict = await evaluateRecallRelevance({
      memory: args.memory || '',
      taskDescription: args.task || '',
      workflowStage: args.stage || 'create-plan'
    });
    console.log(JSON.stringify(verdict, null, 2));
    return;
  }

  console.error('Usage:');
  console.error('  node memory-quality-gate.mjs test-write --what "..." --why "..." --rule "..."');
  console.error('  node memory-quality-gate.mjs test-read --memory "..." --task "..." [--stage "..."]');
  process.exitCode = 1;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
