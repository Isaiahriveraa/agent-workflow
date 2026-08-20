#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HOME = process.env.HOME || process.env.USERPROFILE
// Single source of truth: scripts/plan-server-path prints the plan server root
const PLAN_SERVER_DIR = execFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scripts', 'plan-server-path'), { encoding: 'utf8' }).trim()
const DEFAULT_PORT = 3456

function getProjectDir(project) {
  return join(PLAN_SERVER_DIR, 'projects', project)
}

function usage() {
  console.log(`Usage:
  plan-server.mjs "Plan this feature"
  echo "Plan this feature" | plan-server.mjs --title "Feature Plan"

Options:
  --title <text>       Plan title. Defaults from the prompt.
  --project <name>     Project name. Auto-detected from git/cwd when using default. Default: general.
  --tag <tag>          Add a tag. Can be repeated.
  --status <status>    draft, review, approved, in-progress, complete. Default: draft.
  --question <text>    Add an open question. Can be repeated.
  --port <number>      Server port. Default: 3456.
  --open               Open the created plan URL in the browser.
  --no-server          Write the file only; do not start/check the server.
  --help               Show this help.
`)
}

function parseArgs(argv) {
  const opts = {
    project: 'general',
    tags: [],
    questions: [],
    status: 'draft',
    port: DEFAULT_PORT,
    open: false,
    server: true,
    promptParts: [],
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === '--help' || arg === '-h') opts.help = true
    else if (arg === '--title') opts.title = argv[++i]
    else if (arg === '--project') opts.project = argv[++i]
    else if (arg === '--tag') opts.tags.push(argv[++i])
    else if (arg === '--status') opts.status = argv[++i]
    else if (arg === '--question') opts.questions.push(argv[++i])
    else if (arg === '--port') opts.port = Number(argv[++i])
    else if (arg === '--open') opts.open = true
    else if (arg === '--no-server') opts.server = false
    else opts.promptParts.push(arg)
  }

  return opts
}

function readStdinIfPiped() {
  if (process.stdin.isTTY) return ''
  try {
    return readFileSync(0, 'utf8').trim()
  } catch {
    return ''
  }
}

function slugify(value, fallback = 'plan') {
  const slug = String(value)
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)

  return slug || fallback
}

function titleCaseFromPrompt(prompt) {
  const text = prompt.split('\n')[0].trim().replace(/[.?!:]+$/g, '')
  return text
    .split(/\s+/)
    .slice(0, 9)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Implementation Plan'
}

function localTimestamp() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  const tzMin = -d.getTimezoneOffset()
  const tzSign = tzMin >= 0 ? '+' : '-'
  const tzAbs = Math.abs(tzMin)
  const offset = `${tzSign}${pad(Math.floor(tzAbs / 60))}${pad(tzAbs % 60)}`
  const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${offset}`
  const slug = iso.slice(0, 19).replaceAll(':', '-').replace('T', '_')
  return { iso, slug, date: iso.slice(0, 10) }
}

function git(args, fallback) {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || fallback
  } catch {
    return fallback
  }
}

function gitContext() {
  const root = git(['rev-parse', '--show-toplevel'], '')
  return {
    branch: git(['branch', '--show-current'], 'no-branch'),
    commit: git(['rev-parse', '--short', 'HEAD'], 'no-commit'),
    repo: root ? basename(root) : basename(process.cwd()),
    root,
    author: git(['config', 'user.name'], 'unknown'),
  }
}

function autoDetectProject() {
  const projectsDir = join(PLAN_SERVER_DIR, 'projects')
  if (!existsSync(projectsDir)) return null
  const cwd = process.cwd()

  // 1. Check if cwd is inside a plan server project dir
  const projects = readdirSync(projectsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)
  for (const name of projects) {
    const projectPath = join(projectsDir, name)
    if (cwd.startsWith(projectPath + '/') || cwd === projectPath) {
      return name
    }
  }

  // 2. Walk up from git top-level checking parent dir names against projects
  const root = git(['rev-parse', '--show-toplevel'], '')
  if (root) {
    let walk = root
    while (walk !== '/') {
      const name = basename(walk)
      if (name && projects.includes(name)) {
        return name
      }
      walk = dirname(walk)
    }
  }

  // 3. Check AGENTS_PROJECT_SLUG env var
  if (process.env.AGENTS_PROJECT_SLUG && projects.includes(process.env.AGENTS_PROJECT_SLUG)) {
    return process.env.AGENTS_PROJECT_SLUG
  }

  return null
}

function yamlString(value) {
  return JSON.stringify(String(value))
}

function yamlList(values) {
  const clean = values.map(value => slugify(value)).filter(Boolean)
  return `[${clean.join(', ')}]`
}

function mdxEscape(text) {
  return String(text).replaceAll('<--', '-').replaceAll('{', '&#123;').replaceAll('}', '&#125;')
}

function buildMdx({ prompt, title, project, tags, status, questions }) {
  const now = localTimestamp()
  const ctx = gitContext()
  const summary = prompt.split('\n').map(line => line.trim()).filter(Boolean).join(' ').slice(0, 180)
  const openQuestions = questions.length
    ? questions
    : [
        'What edge cases should the implementation handle first?',
        'What existing files or flows must stay unchanged?',
        'What verification proves this plan is complete?',
      ]

  return {
    id: `${now.slug}_${slugify(title)}`,
    content: `---
title: ${yamlString(title)}
status: ${status}
created: ${now.iso}
project: ${yamlString(project)}
tags: ${yamlList(tags.length ? tags : ['plan'])}
repo: ${yamlString(ctx.repo)}
author: ${yamlString(ctx.author)}
branch: ${yamlString(ctx.branch)}
commit: ${yamlString(ctx.commit)}
summary: ${yamlString(summary || title)}
---

## Summary

${mdxEscape(prompt)}

## Implementation Steps

<Steps>
Investigate the relevant code paths and confirm existing conventions.

Implement the smallest complete change that satisfies the plan.

Run the verification commands that prove the behavior works.
</Steps>

## File Changes

<FileTree>
src/
  update-the-relevant-files-here
tests/
  add-or-update-focused-tests-here
</FileTree>

## Open Questions

${openQuestions.map(question => `- ${mdxEscape(question)}`).join('\n')}

## Verification

- Build, lint, typecheck, or test command to run:
- Manual route or workflow to click through:
`,
  }
}

async function apiOk(port) {
  try {
    const response = await fetch(`http://localhost:${port}/api/plans`)
    return response.ok
  } catch {
    return false
  }
}

async function ensureServer(port) {
  if (await apiOk(port)) return 'already-running'

  const logPath = join(PLAN_SERVER_DIR, '.plan-server.log')
  const out = openSync(logPath, 'a')
  const child = spawn(process.execPath, ['server.js'], {
    cwd: PLAN_SERVER_DIR,
    detached: true,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', out, out],
  })

  for (let i = 0; i < 20; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 400))
    if (await apiOk(port)) return 'started'
  }

  return `failed-see-${logPath}`
}

function openBrowser(url) {
  try {
    execFileSync('open', [url], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    usage()
    return
  }

  const prompt = [opts.promptParts.join(' '), readStdinIfPiped()].filter(Boolean).join('\n\n').trim()
  if (!prompt) {
    usage()
    process.exitCode = 2
    return
  }

  if (!existsSync(PLAN_SERVER_DIR)) {
    throw new Error(`Plan server directory not found: ${PLAN_SERVER_DIR}`)
  }

  const project = (opts.project === 'general' ? (autoDetectProject() || 'general') : opts.project)
  const projectDir = getProjectDir(project)
  const plansDir = join(projectDir, 'plans')
  mkdirSync(plansDir, { recursive: true })

  const title = opts.title || titleCaseFromPrompt(prompt)
  const plan = buildMdx({
    prompt,
    title,
    project,
    tags: opts.tags,
    status: opts.status,
    questions: opts.questions,
  })

  const filePath = join(plansDir, `${plan.id}.mdx`)
  writeFileSync(filePath, plan.content, 'utf8')

  const serverState = opts.server ? await ensureServer(opts.port) : 'skipped'
  const url = `http://localhost:${opts.port}/project/${project}/plan/${plan.id}`
  const opened = opts.open ? openBrowser(url) : false

  console.log(JSON.stringify({
    file: filePath,
    id: plan.id,
    project,
    url,
    allPlans: `http://localhost:${opts.port}/`,
    server: serverState,
    opened,
  }, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
