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

const requireToken = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }
  return token;
};

const normalizeRepo = (repo) => {
  const match = repo?.trim().match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) {
    throw new Error(`Invalid repo format: ${repo}`);
  }

  return {
    owner: match[1],
    name: match[2],
    slug: `${match[1]}/${match[2]}`
  };
};

const githubFetch = async (pathname) => {
  const token = requireToken();
  const response = await fetch(`${apiBase}${pathname}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
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

const repoAccess = async (args) => {
  const repo = normalizeRepo(args.repo);
  const data = await githubFetch(`/repos/${repo.owner}/${repo.name}`);
  return {
    repo: repo.slug,
    private: data.private,
    defaultBranch: data.default_branch,
    cloneUrl: data.clone_url,
    permissions: data.permissions ?? null
  };
};

const defaultBranch = async (args) => {
  const data = await repoAccess(args);
  return {
    repo: data.repo,
    defaultBranch: data.defaultBranch
  };
};

const cloneUrl = async (args) => {
  const repo = normalizeRepo(args.repo);
  return {
    repo: repo.slug,
    cloneUrl: `https://github.com/${repo.owner}/${repo.name}.git`
  };
};

const actions = {
  'normalize-repo': async (args) => normalizeRepo(args.repo),
  'repo-access': repoAccess,
  'default-branch': defaultBranch,
  'clone-url': cloneUrl
};

const main = async () => {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));
  const action = actions[command];

  if (!action) {
    fail('Usage: node github-read.mjs <normalize-repo|repo-access|default-branch|clone-url> --repo owner/name');
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
