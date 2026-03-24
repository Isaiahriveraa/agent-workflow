// Model Router — contextual model selection for subagent tasks.
// Pattern: workflow-router-tools.mjs (regex signals → scoring → tier → JSON output).
// Library first, CLI second. Target: <5ms for route() call.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MODEL_TIERS,
  PROVIDERS,
  BUDGET_MODES,
  TIER_PRECEDENCE,
  DEFAULT_PROVIDER_MAPS,
  DAMPENER_PATTERNS,
  BALANCED_SIGNAL_PATTERNS,
  DEEP_SIGNAL_PATTERNS,
  SIGNAL_FLOORS,
  SCORE_THRESHOLDS,
  CONFIDENCE,
  normalizeRouterInput,
  normalizeRouterOutput
} from './model-router-contract.mjs';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- Provider detection ---

export const detectProvider = (env = process.env) => {
  if (env.AGENTS_MODEL_ROUTER_PROVIDER && PROVIDERS.includes(env.AGENTS_MODEL_ROUTER_PROVIDER)) {
    return env.AGENTS_MODEL_ROUTER_PROVIDER;
  }
  if (env.CLAUDE_CODE_VERSION || Object.keys(env).some((k) => k.startsWith('_CLAUDE_'))) {
    return 'claude-code';
  }
  if (env.OPENCODE) {
    return 'opencode';
  }
  if (env.CODEX_HOME || (env._ && env._.includes('codex'))) {
    return 'codex-cli';
  }
  if (env.GEMINI_API_KEY && env.ANTIGRAVITY) {
    return 'antigravity';
  }
  return 'generic';
};

// --- Config override loading ---

const loadConfigOverrides = () => {
  const configPath = path.join(root, 'config', 'model-router.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);

    if (config.lastUpdated) {
      const age = Date.now() - new Date(config.lastUpdated).getTime();
      const ninetyDays = 90 * 24 * 60 * 60 * 1000;
      if (age > ninetyDays) {
        config._staleWarning = `Config file last updated ${config.lastUpdated} (>90 days ago)`;
      }
    }

    return config.providerMaps ?? null;
  } catch {
    return null;
  }
};

// --- Resolve provider map ---

const getProviderMap = (provider) => {
  const overrides = loadConfigOverrides();
  if (overrides && overrides[provider]) {
    return overrides[provider];
  }
  return DEFAULT_PROVIDER_MAPS[provider] ?? DEFAULT_PROVIDER_MAPS.generic;
};

// --- Complexity classification ---

export const classifyComplexity = (input) => {
  const { taskDescription, fileCount, workflowTier } = input;
  const signals = [];
  let score = 0;

  // Deep signals (+2 each)
  for (const pattern of DEEP_SIGNAL_PATTERNS) {
    if (pattern.test(taskDescription)) {
      const label = pattern.source.replace(/\\b/g, '').replace(/\(\?:.*?\)/g, '…');
      signals.push(`deep:${label}`);
      score += 2;
    }
  }

  // Balanced signals (+1 each)
  for (const pattern of BALANCED_SIGNAL_PATTERNS) {
    if (pattern.test(taskDescription)) {
      const label = pattern.source.replace(/\\b/g, '').replace(/\(\?:.*?\)/g, '…');
      signals.push(`balanced:${label}`);
      score += 1;
    }
  }

  // Dampeners (-1, applied once regardless of how many match)
  const hasDampener = DAMPENER_PATTERNS.some((p) => p.test(taskDescription));
  if (hasDampener) {
    signals.push('dampener');
    score -= 1;
  }

  // Context amplifiers
  if (fileCount != null && fileCount >= 3) {
    signals.push('amplifier:3+files');
    score += 1;
  }
  if (workflowTier === 3) {
    signals.push('amplifier:workflow-tier-3');
    score += 1;
  }

  // Derive tier from score
  let tier;
  if (score <= SCORE_THRESHOLDS.fastMax) {
    tier = 'fast';
  } else if (score <= SCORE_THRESHOLDS.balancedMax) {
    tier = 'balanced';
  } else {
    tier = 'deep';
  }

  // Confidence
  let confidence;
  if (signals.length === 0) {
    confidence = CONFIDENCE.noSignals;
    tier = 'balanced'; // default when no signals
  } else if (
    score === SCORE_THRESHOLDS.fastMax ||
    score === SCORE_THRESHOLDS.balancedMin ||
    score === SCORE_THRESHOLDS.balancedMax ||
    score === SCORE_THRESHOLDS.deepMin
  ) {
    confidence = CONFIDENCE.boundary;
  } else {
    confidence = CONFIDENCE.clear;
  }

  return { tier, score, signals, confidence };
};

// --- Signal floors ---

export const applyFloors = (tier, taskDescription, explicitFloor) => {
  let effectiveFloor = null;

  // Check signal-based floors
  for (const { pattern, floor } of SIGNAL_FLOORS) {
    if (pattern.test(taskDescription)) {
      if (!effectiveFloor || TIER_PRECEDENCE[floor] > TIER_PRECEDENCE[effectiveFloor]) {
        effectiveFloor = floor;
      }
    }
  }

  // Check explicit floor (env var or input param)
  if (explicitFloor && MODEL_TIERS.includes(explicitFloor)) {
    if (!effectiveFloor || TIER_PRECEDENCE[explicitFloor] > TIER_PRECEDENCE[effectiveFloor]) {
      effectiveFloor = explicitFloor;
    }
  }

  if (effectiveFloor && TIER_PRECEDENCE[effectiveFloor] > TIER_PRECEDENCE[tier]) {
    return { tier: effectiveFloor, floorApplied: true };
  }

  return { tier, floorApplied: false };
};

// --- Budget constraints ---

export const applyBudget = (tier, budgetMode, contextRemaining) => {
  // Context-based budget
  if (contextRemaining != null) {
    if (contextRemaining < 30) {
      return { tier: 'fast', budgetAdjusted: TIER_PRECEDENCE[tier] > TIER_PRECEDENCE.fast };
    }
    if (contextRemaining < 50 && TIER_PRECEDENCE[tier] > TIER_PRECEDENCE.balanced) {
      return { tier: 'balanced', budgetAdjusted: true };
    }
  }

  // Env-based budget mode
  if (budgetMode === 'minimum') {
    return { tier: 'fast', budgetAdjusted: TIER_PRECEDENCE[tier] > TIER_PRECEDENCE.fast };
  }
  if (budgetMode === 'economy' && TIER_PRECEDENCE[tier] > TIER_PRECEDENCE.balanced) {
    return { tier: 'balanced', budgetAdjusted: true };
  }

  return { tier, budgetAdjusted: false };
};

// --- Model resolution ---

export const resolveModel = (tier, provider) => {
  const map = getProviderMap(provider);
  const entry = map[tier] ?? DEFAULT_PROVIDER_MAPS.generic[tier];
  return {
    model: entry.model,
    alias: entry.alias ?? null
  };
};

// --- Main route function ---

export const route = (rawInput) => {
  const input = normalizeRouterInput(rawInput);
  const provider = input.provider ?? detectProvider();

  // Check for tier override first
  if (input.tierOverride) {
    // Floor still applies over override
    const { tier: overrideTier, floorApplied } = applyFloors(
      input.tierOverride, input.taskDescription, input.tierFloor
    );
    const { model, alias } = resolveModel(overrideTier, provider);

    return normalizeRouterOutput({
      tier: overrideTier,
      model,
      alias,
      provider,
      confidence: CONFIDENCE.forced,
      reason: floorApplied
        ? `Override to ${input.tierOverride}, raised to ${overrideTier} by floor`
        : `Override forced tier: ${overrideTier}`,
      budgetAdjusted: false,
      floorApplied,
      signals: ['override'],
      overridden: true,
      score: 0
    });
  }

  // 1. Classify complexity
  const classification = classifyComplexity(input);
  let { tier } = classification;
  let { confidence } = classification;
  let floorApplied = false;
  let budgetAdjusted = false;

  // 2. Apply budget constraints
  const budgetResult = applyBudget(tier, input.budgetMode, input.contextRemaining);
  tier = budgetResult.tier;
  budgetAdjusted = budgetResult.budgetAdjusted;

  // 3. Apply floors (floor > budget > classification)
  const floorResult = applyFloors(tier, input.taskDescription, input.tierFloor);
  tier = floorResult.tier;
  floorApplied = floorResult.floorApplied;
  if (floorApplied) confidence = CONFIDENCE.forced;

  // 4. Resolve model
  const { model, alias } = resolveModel(tier, provider);

  // 5. Build reason
  const parts = [];
  if (classification.signals.length === 0) {
    parts.push('No complexity signals matched, defaulting to balanced');
  } else {
    parts.push(`Score ${classification.score} from ${classification.signals.length} signal(s)`);
  }
  if (budgetAdjusted) parts.push('budget-adjusted');
  if (floorApplied) parts.push('floor-applied');

  return normalizeRouterOutput({
    tier,
    model,
    alias,
    provider,
    confidence,
    reason: parts.join('; '),
    budgetAdjusted,
    floorApplied,
    signals: classification.signals,
    overridden: floorApplied,
    score: classification.score
  });
};

// --- CLI interface ---

const parseCliArgs = (args) => {
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const value = args[i + 1];
    parsed[key] = value;
    i += 1;
  }
  return parsed;
};

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  const command = process.argv[2];
  const args = parseCliArgs(process.argv.slice(3));

  try {
    switch (command) {
      case 'route': {
        const input = {
          taskDescription: args.input ?? '',
          provider: args.provider ?? undefined,
          budgetMode: args.budget ?? undefined,
          contextRemaining: args.context != null ? Number(args.context) : undefined,
          tierFloor: args.floor ?? undefined,
          tierOverride: args.override ?? undefined,
          fileCount: args.files != null ? Number(args.files) : undefined,
          workflowTier: args['workflow-tier'] != null ? Number(args['workflow-tier']) : undefined
        };
        console.log(JSON.stringify(route(input), null, 2));
        break;
      }
      case 'detect-provider': {
        console.log(JSON.stringify({ provider: detectProvider() }));
        break;
      }
      case 'classify': {
        const input = normalizeRouterInput({
          taskDescription: args.input ?? '',
          fileCount: args.files != null ? Number(args.files) : undefined,
          workflowTier: args['workflow-tier'] != null ? Number(args['workflow-tier']) : undefined
        });
        console.log(JSON.stringify(classifyComplexity(input), null, 2));
        break;
      }
      default:
        console.error('Usage: node scripts/model-router.mjs <route|detect-provider|classify> [--key value]');
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
