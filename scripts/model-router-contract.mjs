// Model Router Contract — enums, default maps, normalizers, signal/floor definitions.
// Pattern: memory-sidecar-contract.mjs (frozen enums, normalizer functions, exported constants).

export const MODEL_TIERS = Object.freeze(['fast', 'balanced', 'deep']);

export const ROUTER_CATEGORIES = Object.freeze([
  'visual-engineering',
  'ultrabrain',
  'deep',
  'artistry',
  'quick',
  'unspecified-low',
  'unspecified-high',
  'writing'
]);

export const INTENT_KINDS = Object.freeze([
  'explanation',
  'investigation',
  'implementation',
  'fix',
  'open-ended'
]);

export const PROVIDERS = Object.freeze([
  'claude-code', 'opencode', 'codex-cli', 'antigravity', 'generic'
]);

export const BUDGET_MODES = Object.freeze(['normal', 'economy', 'minimum']);

export const TIER_PRECEDENCE = Object.freeze({ fast: 0, balanced: 1, deep: 2 });

export const CATEGORY_TIER_HINTS = Object.freeze({
  'visual-engineering': 'balanced',
  ultrabrain: 'deep',
  deep: 'deep',
  artistry: 'balanced',
  quick: 'fast',
  'unspecified-low': 'fast',
  'unspecified-high': 'balanced',
  writing: 'balanced'
});

export const DEFAULT_CATEGORY_CONFIGS = Object.freeze({
  'visual-engineering': Object.freeze({
    tierHint: 'balanced',
    fallbackModels: Object.freeze(['deep', 'fast'])
  }),
  ultrabrain: Object.freeze({
    tierHint: 'deep',
    fallbackModels: Object.freeze(['balanced'])
  }),
  deep: Object.freeze({
    tierHint: 'deep',
    fallbackModels: Object.freeze(['balanced', 'fast'])
  }),
  artistry: Object.freeze({
    tierHint: 'balanced',
    fallbackModels: Object.freeze(['deep', 'fast'])
  }),
  quick: Object.freeze({
    tierHint: 'fast',
    fallbackModels: Object.freeze(['balanced'])
  }),
  'unspecified-low': Object.freeze({
    tierHint: 'fast',
    fallbackModels: Object.freeze(['balanced'])
  }),
  'unspecified-high': Object.freeze({
    tierHint: 'balanced',
    fallbackModels: Object.freeze(['deep', 'fast'])
  }),
  writing: Object.freeze({
    tierHint: 'balanced',
    fallbackModels: Object.freeze(['fast'])
  })
});

// --- Default provider model maps (embedded — updates with git pull) ---

export const DEFAULT_PROVIDER_MAPS = Object.freeze({
  'claude-code': Object.freeze({
    fast:     Object.freeze({ model: 'claude-haiku-4-5-20251001',  alias: 'haiku' }),
    balanced: Object.freeze({ model: 'claude-sonnet-4-6',          alias: 'sonnet' }),
    deep:     Object.freeze({ model: 'claude-opus-4-6',            alias: 'opus' })
  }),
  opencode: Object.freeze({
    fast:     Object.freeze({ model: 'anthropic/claude-haiku-4-5-20251001', alias: null }),
    balanced: Object.freeze({ model: 'anthropic/claude-sonnet-4-6',        alias: null }),
    deep:     Object.freeze({ model: 'anthropic/claude-opus-4-6',          alias: null })
  }),
  'codex-cli': Object.freeze({
    fast:     Object.freeze({ model: 'gpt-5.4-nano',  alias: null }),
    balanced: Object.freeze({ model: 'gpt-5.4-mini',  alias: null }),
    deep:     Object.freeze({ model: 'gpt-5.4',       alias: null })
  }),
  antigravity: Object.freeze({
    fast:     Object.freeze({ model: 'gemini-3.1-flash-lite-preview', alias: null }),
    balanced: Object.freeze({ model: 'gemini-3-flash-preview',       alias: null }),
    deep:     Object.freeze({ model: 'gemini-3.1-pro-preview',       alias: null })
  }),
  generic: Object.freeze({
    fast:     Object.freeze({ model: 'fast',     alias: null }),
    balanced: Object.freeze({ model: 'balanced', alias: null }),
    deep:     Object.freeze({ model: 'deep',     alias: null })
  })
});

// --- Complexity signals ---

export const DAMPENER_PATTERNS = Object.freeze([
  /\bquick\b/i, /\bsimple\b/i, /\bjust\b/i, /\bminor\b/i,
  /\btrivial\b/i, /\bsmall fix\b/i, /\btypo\b/i,
  /\bformatting\b/i, /\blint\b/i
]);

export const BALANCED_SIGNAL_PATTERNS = Object.freeze([
  /\btest(?:s|ing)?\b/i, /\bbug\s*fix\b/i, /\brefactor\b/i,
  /\bcode review\b/i, /\badd (?:a )?(?:function|method)\b/i,
  /\bendpoint\b/i, /\bimplement\b/i, /\bconfig change\b/i,
  /\bupdate\b/i, /\bmigration\b/i
]);

export const DEEP_SIGNAL_PATTERNS = Object.freeze([
  /\barchitecture\b/i, /\bdesign\b/i, /\bsystem design\b/i,
  /\bsecurity review\b/i, /\bsecurity audit\b/i,
  /\bperformance optimi[sz]ation\b/i, /\bnovel algorithm\b/i,
  /\bcross-system\b/i, /\bmulti-file refactor\b/i,
  /\bdebug\b/i, /\bplanning\b/i, /\bresearch\b/i,
  /\bcritique\b/i, /\banalyze codebase\b/i
]);

// --- Signal floors (safety-critical routing) ---

export const SIGNAL_FLOORS = Object.freeze([
  { pattern: /\bsecurity review\b/i,            floor: 'balanced' },
  { pattern: /\bsecurity audit\b/i,             floor: 'balanced' },
  { pattern: /\barchitecture\b/i,               floor: 'balanced' },
  { pattern: /\bsystem design\b/i,              floor: 'balanced' },
  { pattern: /\bperformance optimi[sz]ation\b/i, floor: 'balanced' }
]);

// --- Scoring thresholds ---

export const SCORE_THRESHOLDS = Object.freeze({
  // score <= 0  → fast
  // score 1-3   → balanced
  // score >= 4  → deep
  fastMax: 0,
  balancedMin: 1,
  balancedMax: 3,
  deepMin: 4
});

// --- Confidence values ---

export const CONFIDENCE = Object.freeze({
  forced: 1.0,
  clear: 0.9,
  boundary: 0.7,
  noSignals: 0.5
});

// --- Normalizers ---

export const normalizeRouterInput = (input) => {
  const taskDescription = (input?.taskDescription ?? '').trim();
  if (!taskDescription) {
    throw new Error('normalizeRouterInput requires taskDescription');
  }

  const normalizedCategory = ROUTER_CATEGORIES.includes(input.category) ? input.category : null;
  const normalizedIntentKind = INTENT_KINDS.includes(input.intentKind ?? input.intent_kind)
    ? (input.intentKind ?? input.intent_kind)
    : null;

  return {
    taskDescription,
    taskType: input.taskType ?? null,
    fileCount: input.fileCount != null ? Number(input.fileCount) : null,
    workflowTier: input.workflowTier != null ? Number(input.workflowTier) : null,
    provider: input.provider ?? null,
    budgetMode: BUDGET_MODES.includes(input.budgetMode) ? input.budgetMode : 'normal',
    contextRemaining: input.contextRemaining != null ? Number(input.contextRemaining) : null,
    tierFloor: MODEL_TIERS.includes(input.tierFloor) ? input.tierFloor : null,
    tierOverride: MODEL_TIERS.includes(input.tierOverride) ? input.tierOverride : null,
    category: normalizedCategory,
    intentKind: normalizedIntentKind
  };
};

export const normalizeRouterOutput = (output) => ({
  category: output.category,
  intent_kind: output.intent_kind,
  tier_hint: output.tier_hint,
  primary_model: output.primary_model,
  fallback_candidates: [...(output.fallback_candidates ?? [])],
  provenance: output.provenance ?? null,
  attempted_models: [...(output.attempted_models ?? [])],
  tier: output.tier,
  model: output.model ?? output.primary_model,
  alias: output.alias ?? null,
  provider: output.provider,
  confidence: Number(output.confidence),
  reason: output.reason,
  budgetAdjusted: output.budgetAdjusted === true,
  floorApplied: output.floorApplied === true,
  signals: [...(output.signals ?? [])],
  overridden: output.overridden === true,
  score: Number(output.score)
});
