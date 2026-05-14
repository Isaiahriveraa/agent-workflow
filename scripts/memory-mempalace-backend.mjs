/**
 * memory-mempalace-backend.mjs
 *
 * MemPalace-backed implementation of the memory sidecar backend interface.
 * Replaces mem0-lancedb as the canonical memory backend.
 *
 * Backend interface:
 *   search(query)   → { items: [...] }
 *   record(event)   → { ...record } (writes observations for mempalace to mine)
 *
 * MemPalace is a 4-layer memory stack (L0 identity, L1 essential story,
 * L2 on-demand retrieval, L3 semantic search) backed by ChromaDB + knowledge graph.
 * Unlike mem0, it requires no API keys, mines files from disk, and returns
 * verbatim content rather than LLM-summarized memories.
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

import { searchMemPalace, resolveMemPalaceConfig } from './mempalace-bridge.mjs';
import { ensureProjectContext } from './project-context.mjs';
import { MEMORY_CONTRACT_LIMITS, MEMORY_KINDS, MEMORY_WORKFLOW_STAGES } from './memory-sidecar-contract.mjs';

// ── Constants ────────────────────────────────────────────

const OBSERVATIONS_DIR = path.join(os.homedir(), '.agents', '.agents-memory', 'observations');

// ── Helpers ──────────────────────────────────────────────

const now = () => new Date().toISOString();

const shortId = () => Math.random().toString(36).slice(2, 10);

const normalizeText = (text) =>
  String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Map a mempalace search result to the standard memory record format.
 * mempalace returns: { text, source_file, similarity, metadata: { wing, room, ... } }
 * We map to the mem0-style record that consumers expect.
 */
const mapSearchResult = (result, query) => {
  const memText = normalizeText(result.text ?? '');
  if (!memText || memText.length < 10) return null;

  // mempalace similarity scores range from negative to positive (~-0.1 to 0.1).
  // Normalize to 0-1 for the confidence field.
  const rawSim = typeof result.similarity === 'number' ? result.similarity : 0;
  const confidence = Math.max(0, Math.min(1, (rawSim + 0.2) / 0.4));

  return {
    id: result.id ?? `mp_${shortId()}`,
    memory_kind: 'observation',
    workflow_stage: query.workflow_stage ?? 'implement-plan',
    project_id: query.project_id ?? 'unknown',
    scope: 'project',
    summary: memText.slice(0, 300),
    source_artifact: result.source_file ?? 'mempalace',
    confidence,
    match_reason: `mempalace semantic match (score=${rawSim.toFixed(3)})`,
    created_at: now(),
    idempotency_key: `mp_${shortId()}`,
    metadata: {
      project_match: true,
      filters_passed: ['scope:project'],
      mempalace_wing: result.wing ?? null,
      mempalace_room: result.room ?? null,
      mempalace_source_file: result.source_file ?? null,
      similarity: rawSim,
    },
  };
};

const writeObservationFile = (events) => {
  fs.mkdirSync(OBSERVATIONS_DIR, { recursive: true });
  const filePath = path.join(OBSERVATIONS_DIR, `${Date.now()}_${shortId()}.jsonl`);
  const lines = events.map((e) => JSON.stringify(e)).join('\n');
  fs.writeFileSync(filePath, lines + '\n', 'utf8');
  return filePath;
};

// ── Backend ──────────────────────────────────────────────

export const createMemPalaceMemoryBackend = ({ config } = {}) => {
  const projectContext = ensureProjectContext();

  return {
    /**
     * Search mempalace for relevant memories.
     * Uses mempalace's L3 semantic search (ChromaDB) via searchMemPalace().
     * Falls back to wake-up context if no query text is available.
     */
    async search(query) {
      const queryText = normalizeText(query?.query_text ?? '');

      if (!queryText) {
        return { items: [], total_considered: 0 };
      }

      const result = searchMemPalace({
        query: queryText,
        wing: config?.wing,
        topK: query.top_k ?? MEMORY_CONTRACT_LIMITS.maxRecallItems,
        projectContext,
      });

      // searchMemPalace returns { enabled, installed, query, results: [...], warning }
      const rawItems = Array.isArray(result?.results) ? result.results : [];
      const items = rawItems
        .map((r) => mapSearchResult(r, query))
        .filter(Boolean)
        .slice(0, Math.min(
          Number(query.top_k) || MEMORY_CONTRACT_LIMITS.maxRecallItems,
          MEMORY_CONTRACT_LIMITS.maxRecallItems
        ));

      return {
        items,
        total_considered: rawItems.length,
      };
    },

    /**
     * Record a memory observation.
     * MemPalace doesn't have a native "record event" API — it mines files from disk.
     * So we write observations to a JSONL file that can be mined into the palace
     * via `mempalace mine`.
     *
     * The observation won't be immediately searchable; it becomes available
     * after the next `mempalace mine` run.
     */
    async record(event) {
      const filePath = writeObservationFile([event]);

      return {
        id: event.id ?? `obs_${shortId()}`,
        memory_kind: event.memory_kind ?? 'observation',
        workflow_stage: event.workflow_stage ?? 'implement-plan',
        project_id: event.project_id ?? 'unknown',
        scope: event.scope ?? 'project',
        summary: normalizeText(event.text ?? event.memory ?? '').slice(0, 300),
        source_artifact: filePath,
        confidence: event.confidence ?? 0.5,
        match_reason: 'recorded for future mempalace mining',
        created_at: now(),
        idempotency_key: event.idempotency_key ?? `${shortId()}`,
        metadata: {
          project_match: true,
          filters_passed: ['scope:project'],
          observation_file: filePath,
        },
      };
    },
  };
};
