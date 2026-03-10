#!/usr/bin/env node
const apiBase = 'https://api.notion.com/v1';
const apiVersion = '2025-09-03';

const emit = (payload, exitCode = 0) => {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
};

const fail = (message, extra = {}) => emit({ ok: false, error: message, ...extra }, 1);

const parseArgs = (argv) => {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    parsed[arg.slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
};

const notionFetch = async (pathname, init = {}) => {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    throw new Error('NOTION_API_KEY is required');
  }

  const response = await fetch(`${apiBase}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': apiVersion,
      ...(init.headers ?? {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = body.message ?? `Notion API request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
};

const selectOldestActionable = async (args) => {
  const dataSourceId = args['data-source-id'];
  if (!dataSourceId) {
    throw new Error('Missing required --data-source-id argument');
  }

  const statuses = (args.statuses ?? 'Ready,Researching,Planning,Coding')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return notionFetch(`/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        or: statuses.map((status) => ({
          property: 'Status',
          status: { equals: status }
        }))
      },
      sorts: [
        {
          property: 'Date',
          direction: 'ascending'
        },
        {
          property: 'Updated At',
          direction: 'ascending'
        }
      ],
      page_size: 1
    })
  });
};

const getItem = async (args) => {
  if (!args['page-id']) {
    throw new Error('Missing required --page-id argument');
  }
  return notionFetch(`/pages/${args['page-id']}`);
};

const buildProperties = (args) => {
  if (!args.properties) {
    throw new Error('Missing required --properties argument');
  }

  try {
    return JSON.parse(args.properties);
  } catch (error) {
    throw new Error(`Invalid JSON in --properties: ${error.message}`);
  }
};

const updateFields = async (args) => {
  if (!args['page-id']) {
    throw new Error('Missing required --page-id argument');
  }

  return notionFetch(`/pages/${args['page-id']}`, {
    method: 'PATCH',
    body: JSON.stringify({
      properties: buildProperties(args)
    })
  });
};

const setStatus = async (args) => {
  if (!args.status) {
    throw new Error('Missing required --status argument');
  }

  args.properties = JSON.stringify({
    Status: {
      status: {
        name: args.status
      }
    }
  });

  return updateFields(args);
};

const appendFeedback = async (args) => {
  if (!args['page-id']) {
    throw new Error('Missing required --page-id argument');
  }
  if (!args.message) {
    throw new Error('Missing required --message argument');
  }

  return notionFetch(`/comments`, {
    method: 'POST',
    body: JSON.stringify({
      parent: {
        page_id: args['page-id']
      },
      rich_text: [
        {
          type: 'text',
          text: {
            content: args.message
          }
        }
      ]
    })
  });
};

const actions = {
  'select-oldest-actionable': selectOldestActionable,
  'get-item': getItem,
  'update-fields': updateFields,
  'set-status': setStatus,
  'append-feedback': appendFeedback
};

const main = async () => {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));
  const action = actions[command];

  if (!action) {
    fail('Usage: node notion.mjs <select-oldest-actionable|get-item|update-fields|set-status|append-feedback> [--flags]');
    return;
  }

  try {
    const result = await action(args);
    emit({
      ok: true,
      command,
      result
    });
  } catch (error) {
    fail(error.message, { command });
  }
};

await main();
