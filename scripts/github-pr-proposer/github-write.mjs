#!/usr/bin/env node
const apiBase = 'https://api.github.com';

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

const requireRepo = (value) => {
  const match = value?.trim().match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) {
    throw new Error(`Invalid repo format: ${value}`);
  }
  return {
    owner: match[1],
    name: match[2],
    slug: `${match[1]}/${match[2]}`
  };
};

const githubFetch = async (pathname, init = {}) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const response = await fetch(`${apiBase}${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = body.message ?? `GitHub API request failed with status ${response.status}`;
    throw new Error(message);
  }
  return body;
};

const createPr = async (args) => {
  const repo = requireRepo(args.repo);
  if (!args.title || !args.head || !args.base) {
    throw new Error('Missing required --title, --head, or --base argument');
  }

  return githubFetch(`/repos/${repo.owner}/${repo.name}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: args.title,
      head: args.head,
      base: args.base,
      body: args.body ?? '',
      draft: args.draft === 'true'
    })
  });
};

const getPrByHead = async (args) => {
  const repo = requireRepo(args.repo);
  if (!args.head) {
    throw new Error('Missing required --head argument');
  }

  const pulls = await githubFetch(`/repos/${repo.owner}/${repo.name}/pulls?state=open&head=${encodeURIComponent(args.head)}`);
  return {
    repo: repo.slug,
    head: args.head,
    pullRequests: pulls
  };
};

const actions = {
  'create-pr': createPr,
  'get-pr-by-head': getPrByHead
};

const main = async () => {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));
  const action = actions[command];

  if (!action) {
    fail('Usage: node github-write.mjs <create-pr|get-pr-by-head> [--flags]');
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
