// Model Router — contextual model selection for subagent tasks.
// Pattern: workflow-router-tools.mjs (regex signals → scoring → tier → JSON output).
// Library first, CLI second. Target: <5ms for route() call.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MODEL_TIERS,
  ROUTER_CATEGORIES,
  INTENT_KINDS,
  PROVIDERS,
  TIER_PRECEDENCE,
  DEFAULT_PROVIDER_MAPS,
  DEFAULT_CATEGORY_CONFIGS,
  CATEGORY_TIER_HINTS,
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

const loadRouterConfig = () => {
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

    return config;
  } catch {
    return null;
  }
};

// --- Resolve provider map ---

const getProviderMap = (provider) => {
  const config = loadRouterConfig();
  if (config?.providerMaps?.[provider]) {
    return config.providerMaps[provider];
  }
  return DEFAULT_PROVIDER_MAPS[provider] ?? DEFAULT_PROVIDER_MAPS.generic;
};

const getCategoryConfig = (provider, category) => {
  const config = loadRouterConfig();
  const base = DEFAULT_CATEGORY_CONFIGS[category] ?? DEFAULT_CATEGORY_CONFIGS['unspecified-high'];
  const globalOverride = config?.categories?.[category] ?? {};
  const providerOverride = config?.providerCategories?.[provider]?.[category] ?? {};
  return {
    ...base,
    ...globalOverride,
    ...providerOverride,
    fallbackModels: [
      ...(base.fallbackModels ?? []),
      ...(globalOverride.fallbackModels ?? []),
      ...(providerOverride.fallbackModels ?? [])
    ]
  };
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

const INTENT_PATTERNS = Object.freeze({
  explanation: [/\bexplain\b/i, /\bsummarize\b/i, /\bdocument\b/i, /\bwrite(?: up)?\b/i],
  investigation: [/\binvestigat(?:e|ion)\b/i, /\bresearch\b/i, /\banaly[sz]e\b/i, /\bdebug\b/i],
  implementation: [/\bimplement\b/i, /\bbuild\b/i, /\bcreate\b/i, /\badd\b/i, /\bwire\b/i],
  fix: [/\bfix\b/i, /\brepair\b/i, /\bbug\b/i, /\bregression\b/i, /\bbroken\b/i],
  'open-ended': []
});

const CATEGORY_PATTERNS = Object.freeze({
  'visual-engineering': [/\bui\b/i, /\bux\b/i, /\bfrontend\b/i, /\bcss\b/i, /\bcomponent\b/i, /\blayout\b/i],
  ultrabrain: [/\barchitecture\b/i, /\bsystem design\b/i, /\bresearch\b/i, /\bplan(?:ning)?\b/i, /\bnovel algorithm\b/i],
  deep: [/\bdebug\b/i, /\bsecurity\b/i, /\bperformance\b/i, /\bmigration\b/i, /\brefactor\b/i],
  artistry: [/\bart\b/i, /\billustration\b/i, /\banimation\b/i, /\bbrand\b/i, /\bcreative\b/i],
  quick: [/\bquick\b/i, /\bsimple\b/i, /\bminor\b/i, /\btypo\b/i, /\bread\b/i, /\bsearch\b/i],
  writing: [/\bwrite\b/i, /\bdocs?\b/i, /\bcopy\b/i, /\brewrite\b/i, /\bexplain\b/i]
});

export const inferIntentKind = (input) => {
  if (input.intentKind) {
    return {
      intentKind: input.intentKind,
      source: 'explicit'
    };
  }

  for (const intentKind of INTENT_KINDS) {
    const patterns = INTENT_PATTERNS[intentKind] ?? [];
    if (patterns.some((pattern) => pattern.test(input.taskDescription))) {
      return { intentKind, source: 'inferred' };
    }
  }

  return {
    intentKind: 'open-ended',
    source: 'default'
  };
};

export const inferCategory = (input, classification, intent) => {
  if (input.category) {
    return {
      category: input.category,
      source: 'explicit'
    };
  }

  for (const category of ROUTER_CATEGORIES) {
    const patterns = CATEGORY_PATTERNS[category] ?? [];
    if (patterns.some((pattern) => pattern.test(input.taskDescription))) {
      return { category, source: 'inferred-pattern' };
    }
  }

  if (intent.intentKind === 'explanation') {
    return { category: 'writing', source: 'inferred-intent' };
  }

  if (intent.intentKind === 'implementation' && classification.tier === 'fast') {
    return { category: 'quick', source: 'inferred-tier' };
  }

  if (classification.tier === 'fast') {
    return { category: 'unspecified-low', source: 'inferred-tier' };
  }

  if (classification.tier === 'deep') {
    return { category: 'deep', source: 'inferred-tier' };
  }

  return { category: 'unspecified-high', source: 'default' };
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

const normalizeFallbackCandidate = (entry, provider) => {
  const providerMap = getProviderMap(provider);
  if (typeof entry === 'string') {
    if (MODEL_TIERS.includes(entry)) {
      const resolved = providerMap[entry] ?? DEFAULT_PROVIDER_MAPS.generic[entry];
      return {
        tier_hint: entry,
        model: resolved?.model ?? null,
        alias: resolved?.alias ?? null,
        provider,
        available: Boolean(resolved?.model),
        source: 'tier-fallback'
      };
    }

    return {
      tier_hint: null,
      model: entry,
      alias: null,
      provider,
      available: true,
      source: 'direct-fallback'
    };
  }

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const targetProvider = entry.provider ?? provider;
  const providerMatches = targetProvider === provider || targetProvider === 'generic';
  const resolvedProvider = targetProvider === 'generic' ? provider : targetProvider;
  const resolvedByTier = entry.tier && MODEL_TIERS.includes(entry.tier)
    ? (getProviderMap(resolvedProvider)[entry.tier] ?? DEFAULT_PROVIDER_MAPS.generic[entry.tier])
    : null;
  const model = entry.model ?? resolvedByTier?.model ?? null;
  const alias = entry.alias ?? resolvedByTier?.alias ?? null;

  return {
    tier_hint: MODEL_TIERS.includes(entry.tier) ? entry.tier : null,
    model,
    alias,
    provider: resolvedProvider,
    available: providerMatches && Boolean(model),
    source: entry.model ? 'object-model' : 'object-tier',
    variant: entry.variant ?? null,
    reasoningEffort: entry.reasoningEffort ?? null,
    temperature: entry.temperature ?? null,
    top_p: entry.top_p ?? null,
    maxTokens: entry.maxTokens ?? null,
    thinking: entry.thinking ?? null
  };
};

const buildFallbackCandidates = (provider, category, primaryModel) => {
  const categoryConfig = getCategoryConfig(provider, category);
  const seen = new Set([primaryModel]);
  const results = [];

  for (const entry of categoryConfig.fallbackModels ?? []) {
    const candidate = normalizeFallbackCandidate(entry, provider);
    if (!candidate?.model || seen.has(candidate.model)) continue;
    seen.add(candidate.model);
    results.push(candidate);
  }

  return results;
};

// --- Main route function ---

export const route = (rawInput) => {
  const input = normalizeRouterInput(rawInput);
  const provider = input.provider ?? detectProvider();
  const intent = inferIntentKind(input);

  // Check for tier override first
  if (input.tierOverride) {
    // Floor still applies over override
    const { tier: overrideTier, floorApplied } = applyFloors(
      input.tierOverride, input.taskDescription, input.tierFloor
    );
    const categoryDecision = inferCategory(input, { tier: overrideTier }, intent);
    const { model, alias } = resolveModel(overrideTier, provider);
    const fallbackCandidates = buildFallbackCandidates(provider, categoryDecision.category, model);

    return normalizeRouterOutput({
      category: categoryDecision.category,
      intent_kind: intent.intentKind,
      tier_hint: overrideTier,
      primary_model: model,
      fallback_candidates: fallbackCandidates,
      provenance: {
        strategy: 'category-first',
        category_source: categoryDecision.source,
        intent_source: intent.source,
        primary_source: floorApplied ? 'override-with-floor' : 'override',
        fallback_source: 'category-defaults'
      },
      attempted_models: [model, ...fallbackCandidates.filter((item) => item.available).map((item) => item.model)],
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
  const categoryDecision = inferCategory(input, classification, intent);
  const categoryConfig = getCategoryConfig(provider, categoryDecision.category);
  let tier = categoryConfig.tierHint ?? CATEGORY_TIER_HINTS[categoryDecision.category] ?? classification.tier;
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
  const fallbackCandidates = buildFallbackCandidates(provider, categoryDecision.category, model);

  // 5. Build reason
  const parts = [];
  parts.push(`category ${categoryDecision.category}`);
  if (classification.signals.length === 0) {
    parts.push('No complexity signals matched, defaulting to balanced');
  } else {
    parts.push(`Score ${classification.score} from ${classification.signals.length} signal(s)`);
  }
  if (budgetAdjusted) parts.push('budget-adjusted');
  if (floorApplied) parts.push('floor-applied');

  return normalizeRouterOutput({
    category: categoryDecision.category,
    intent_kind: intent.intentKind,
    tier_hint: categoryConfig.tierHint ?? CATEGORY_TIER_HINTS[categoryDecision.category] ?? classification.tier,
    primary_model: model,
    fallback_candidates: fallbackCandidates,
    provenance: {
      strategy: 'category-first',
      category_source: categoryDecision.source,
      intent_source: intent.source,
      primary_source: categoryDecision.source === 'explicit' ? 'explicit-category' : 'inferred-category',
      fallback_source: 'category-defaults'
    },
    attempted_models: [model, ...fallbackCandidates.filter((item) => item.available).map((item) => item.model)],
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
          category: args.category ?? undefined,
          intentKind: args.intent ?? undefined,
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
