/**
 * Providers — Cross-provider model routing
 *
 * Detects which CLI is running and returns provider-specific model IDs for a
 * given agent type and model profile.
 */

const AGENT_TIERS = Object.freeze({
  orchestrator: [
    'gsd-planner',
    'gsd-executor',
    'gsd-roadmapper',
    'gsd-phase-researcher',
    'gsd-project-researcher',
    'gsd-research-synthesizer',
    'gsd-debugger',
  ],
  subagent: [
    'gsd-codebase-mapper',
    'gsd-verifier',
    'gsd-plan-checker',
    'gsd-integration-checker',
    'gsd-nyquist-auditor',
  ],
  'ui-researcher': [
    'gsd-ui-researcher',
  ],
  'ui-auditor': [
    'gsd-ui-checker',
    'gsd-ui-auditor',
  ],
});

const VALID_PROVIDERS = Object.freeze(['anthropic', 'codex', 'opencode', 'gemini']);
const VALID_PROFILES = Object.freeze(['quality', 'balanced', 'budget', 'free', 'inherit']);

const PROVIDER_TIERS = Object.freeze({
  anthropic: {
    orchestrator: {
      quality: 'sonnet',
      balanced: 'sonnet',
      budget: 'sonnet',
      free: 'sonnet',
    },
    subagent: {
      quality: 'sonnet',
      balanced: 'haiku',
      budget: 'haiku',
      free: 'haiku',
    },
    'ui-researcher': {
      quality: 'sonnet',
      balanced: 'haiku',
      budget: 'haiku',
      free: 'haiku',
    },
    'ui-auditor': {
      quality: 'sonnet',
      balanced: 'haiku',
      budget: 'haiku',
      free: 'haiku',
    },
  },
  codex: {
    orchestrator: {
      quality: 'gpt-5.3-codex',
      balanced: 'gpt-5.3-codex',
      budget: 'gpt-5.3-codex',
      free: 'gpt-5.3-codex',
    },
    subagent: {
      quality: 'gpt-5.3-codex',
      balanced: 'gpt-5.3-codex',
      budget: 'gpt-5.3-codex',
      free: 'gpt-5.3-codex',
    },
    'ui-researcher': {
      quality: 'gpt-5.3-codex',
      balanced: 'gpt-5.3-codex',
      budget: 'gpt-5.3-codex',
      free: 'gpt-5.3-codex',
    },
    'ui-auditor': {
      quality: 'gpt-5.3-codex',
      balanced: 'gpt-5.3-codex',
      budget: 'gpt-5.3-codex',
      free: 'gpt-5.3-codex',
    },
  },
  opencode: {
    orchestrator: {
      quality: 'openrouter/openai/gpt-5.4',
      balanced: 'opencode/minimax-m2.5-free',
      budget: 'opencode/minimax-m2.5-free',
      free: 'opencode/minimax-m2.5-free',
    },
    subagent: {
      quality: 'openrouter/openai/gpt-5-mini',
      balanced: 'opencode/minimax-m2.5-free',
      budget: 'opencode/minimax-m2.5-free',
      free: 'opencode/minimax-m2.5-free',
    },
    'ui-researcher': {
      quality: 'openrouter/openai/gpt-5.4',
      balanced: 'opencode/minimax-m2.5-free',
      budget: 'opencode/minimax-m2.5-free',
      free: 'opencode/minimax-m2.5-free',
    },
    'ui-auditor': {
      quality: 'openrouter/openai/gpt-5-mini',
      balanced: 'opencode/minimax-m2.5-free',
      budget: 'opencode/minimax-m2.5-free',
      free: 'opencode/minimax-m2.5-free',
    },
  },
  gemini: {
    orchestrator: {
      quality: 'gemini-2.5-pro',
      balanced: 'gemini-2.5-pro',
      budget: 'gemini-2.5-flash',
      free: 'gemini-2.5-flash-lite',
    },
    subagent: {
      quality: 'gemini-2.5-flash',
      balanced: 'gemini-2.5-flash',
      budget: 'gemini-2.5-flash-lite',
      free: 'gemini-2.5-flash-lite',
    },
    'ui-researcher': {
      quality: 'gemini-2.5-pro',
      balanced: 'gemini-2.5-flash',
      budget: 'gemini-2.5-flash',
      free: 'gemini-2.5-flash-lite',
    },
    'ui-auditor': {
      quality: 'gemini-2.5-flash',
      balanced: 'gemini-2.5-flash',
      budget: 'gemini-2.5-flash-lite',
      free: 'gemini-2.5-flash-lite',
    },
  },
});

function detectProvider(env = process.env) {
  if (env.CLAUDECODE) return 'anthropic';
  if (env.CODEX_HOME) return 'codex';
  if (env.OPENCODE_CONFIG_DIR || env.OPENCODE_CONFIG) return 'opencode';
  if (env.GEMINI_CONFIG_DIR) return 'gemini';
  return 'anthropic';
}

function getAgentTier(agentType) {
  for (const [tier, agents] of Object.entries(AGENT_TIERS)) {
    if (agents.includes(agentType)) {
      return tier;
    }
  }
  return 'subagent';
}

function normalizeProfile(profile) {
  const normalized = String(profile || 'balanced').trim().toLowerCase();
  if (normalized === 'inherit') return 'inherit';
  return VALID_PROFILES.includes(normalized) ? normalized : 'balanced';
}

function resolveModelForAgent(agentType, profile, providerOverride, env = process.env) {
  const normalizedProfile = normalizeProfile(profile);
  if (normalizedProfile === 'inherit') return 'inherit';

  const provider = VALID_PROVIDERS.includes(providerOverride)
    ? providerOverride
    : detectProvider(env);
  const tier = getAgentTier(agentType);
  const providerMap = PROVIDER_TIERS[provider] || PROVIDER_TIERS.anthropic;
  const tierMap = providerMap[tier] || providerMap.subagent;

  return tierMap[normalizedProfile] || tierMap.balanced || PROVIDER_TIERS.anthropic.subagent.balanced;
}

module.exports = {
  AGENT_TIERS,
  PROVIDER_TIERS,
  VALID_PROFILES,
  VALID_PROVIDERS,
  detectProvider,
  getAgentTier,
  resolveModelForAgent,
};
