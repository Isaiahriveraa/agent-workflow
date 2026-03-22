import fs from 'node:fs';
import path from 'node:path';

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'artifact';

const writeJsonArtifact = ({ directory, prefix, payload }) => {
  const iso = new Date().toISOString();
  const stamp = iso.replace(/[:.]/g, '-');
  const slug = slugify(`${prefix}-${payload.event ?? payload.subjectType ?? payload.action ?? 'entry'}`);
  const artifactPath = path.join(directory, `${stamp}-${slug}.json`);

  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify({
    ...payload,
    recorded_at: iso
  }, null, 2)}\n`);

  return artifactPath;
};

export const writeTraceArtifact = ({ projectContext, event, result }) =>
  writeJsonArtifact({
    directory: projectContext.thoughtPaths.traces,
    prefix: 'trace',
    payload: {
      kind: 'trace',
      event: event.event,
      provider: event.provider,
      sessionId: event.sessionId,
      turnId: event.turnId,
      runtimeMode: event.runtimeMode,
      scope: event.scope,
      subject: event.subject,
      metadata: event.metadata,
      result
    }
  });

export const writeEvalArtifact = ({ projectContext, verdict }) =>
  writeJsonArtifact({
    directory: projectContext.thoughtPaths.evaluations,
    prefix: 'eval',
    payload: {
      kind: 'evaluation',
      ...verdict
    }
  });

export const writeStrategyArtifact = ({ projectContext, decision, event }) =>
  writeJsonArtifact({
    directory: projectContext.thoughtPaths.strategies,
    prefix: 'strategy',
    payload: {
      kind: 'strategy',
      event: event.event,
      ...decision
    }
  });
