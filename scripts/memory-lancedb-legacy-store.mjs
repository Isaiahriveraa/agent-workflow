import { createRequire } from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);

// Lazy-load optional dependencies — these may not be installed
// (they're only needed when the mem0-lancedb backend is active).
let _Document = null;
let _connect = null;

const ensureLazyDeps = () => {
  if (_Document && _connect) return true;
  try {
    _Document = require('@langchain/core/documents').Document;
    _connect = require('@lancedb/lancedb').connect;
    return true;
  } catch {
    return false;
  }
};

const escapeSqlString = (value) => `'${String(value ?? '').replace(/'/g, "''")}'`;

const normalizeDistanceScore = (distance) => {
  const numeric = Number(distance ?? 1);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, 1 - numeric);
};

const buildPayload = (row) => {
  if (typeof row.payload_json === 'string' && row.payload_json.length > 0) {
    try {
      return JSON.parse(row.payload_json);
    } catch {
      return {};
    }
  }

  return {};
};

const buildRow = ({ vector, document, id }) => {
  const payload = { ...(document?.metadata ?? {}) };

  return {
    vector,
    _mem0_id: id ?? payload._mem0_id ?? crypto.randomUUID(),
    idempotency_key: payload.idempotency_key ?? null,
    payload_json: JSON.stringify(payload)
  };
};

export class LanceDbLangChainStore {
  constructor({ dbPath, tableName }) {
    this.dbPath = dbPath;
    this.tableName = tableName;
    this.connectionPromise = null;
    this.tablePromise = null;
  }

  async getConnection() {
    if (!this.connectionPromise) {
      fs.mkdirSync(this.dbPath, { recursive: true });
      if (!ensureLazyDeps()) {
        this.connectionPromise = Promise.reject(new Error('LanceDB dependencies not installed'));
        return this.connectionPromise;
      }
      this.connectionPromise = _connect(this.dbPath);
    }

    return this.connectionPromise;
  }

  async openTable() {
    if (this.tablePromise) {
      return this.tablePromise;
    }

    this.tablePromise = (async () => {
      try {
        const connection = await this.getConnection();
        return await connection.openTable(this.tableName);
      } catch {
        return null;
      }
    })();

    return this.tablePromise;
  }

  async ensureTable(rows) {
    const existing = await this.openTable();
    if (existing) {
      return {
        table: existing,
        created: false
      };
    }

    this.tablePromise = (async () => {
      const connection = await this.getConnection();
      return connection.createTable(this.tableName, rows);
    })();

    return {
      table: await this.tablePromise,
      created: true
    };
  }

  async addVectors(vectors, documents, options = {}) {
    const rows = vectors.map((vector, index) =>
      buildRow({
        vector,
        document: documents[index],
        id: options?.ids?.[index]
      }));

    const { table, created } = await this.ensureTable(rows);
    if (created) {
      return;
    }

    await table.add(rows);
  }

  async similaritySearchVectorWithScore(query, limit) {
    const table = await this.openTable();
    if (!table) {
      return [];
    }

    const rows = await table
      .search(query)
      .distanceType('cosine')
      .limit(limit)
      .toArray();

    if (!ensureLazyDeps()) return [];
    return rows.map((row) => [
      new _Document({
        pageContent: '',
        metadata: buildPayload(row)
      }),
      normalizeDistanceScore(row._distance)
    ]);
  }

  async delete(options = {}) {
    const memoryId = options?.filter?._mem0_id;
    if (!memoryId) {
      return;
    }

    await this.deleteByMemoryId(memoryId);
  }

  async findMemoryIdsByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) {
      return [];
    }

    const table = await this.openTable();
    if (!table) {
      return [];
    }

    const rows = await table
      .query()
      .where(`idempotency_key = ${escapeSqlString(idempotencyKey)}`)
      .limit(32)
      .toArray();

    return rows
      .map((row) => row._mem0_id)
      .filter(Boolean);
  }

  async deleteByMemoryId(memoryId) {
    const table = await this.openTable();
    if (!table) {
      return;
    }

    await table.delete(`_mem0_id = ${escapeSqlString(memoryId)}`);
  }
}
