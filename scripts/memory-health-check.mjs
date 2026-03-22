import {
  resolveMemorySidecarBackend,
  resolveMemorySidecarConfig
} from './memory-sidecar-adapter.mjs';

const buildResult = ({ ok, status, reason = null }) => ({
  ok,
  status,
  ...(reason ? { reason } : {})
});

export const getMemoryHealth = ({ env = process.env, backend } = {}) => {
  const config = resolveMemorySidecarConfig({ env });

  if (!config.enabled) {
    return {
      exitCode: 0,
      result: buildResult({
        ok: true,
        status: 'healthy',
        reason: 'memory disabled'
      })
    };
  }

  if (config.backend === 'mem0-lancedb' && config.readiness?.overall !== true) {
    return {
      exitCode: 2,
      result: buildResult({
        ok: false,
        status: 'fatal',
        reason: 'missing required mem0-lancedb configuration'
      })
    };
  }

  if (config.backend === 'mem0' && config.credentials.apiKeyPresent !== true) {
    return {
      exitCode: 2,
      result: buildResult({
        ok: false,
        status: 'fatal',
        reason: 'missing AGENTS_MEMORY_API_KEY'
      })
    };
  }

  try {
    const resolvedBackend = resolveMemorySidecarBackend({ config, backend });
    if (!resolvedBackend) {
      return {
        exitCode: 2,
        result: buildResult({
          ok: false,
          status: 'fatal',
          reason: `backend ${config.backend} failed to initialize`
        })
      };
    }

    if (
      config.backend === 'mem0-lancedb'
      && config.localMemory.lanceDb.pathResolution !== 'explicit-env'
    ) {
      return {
        exitCode: 1,
        result: buildResult({
          ok: false,
          status: 'degraded',
          reason: 'AGENTS_MEMORY_LANCEDB_PATH not set explicitly; using derived path'
        })
      };
    }

    return {
      exitCode: 0,
      result: buildResult({
        ok: true,
        status: 'healthy'
      })
    };
  } catch (error) {
    return {
      exitCode: 2,
      result: buildResult({
        ok: false,
        status: 'fatal',
        reason: error.message
      })
    };
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const { exitCode, result } = getMemoryHealth();
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = exitCode;
}
