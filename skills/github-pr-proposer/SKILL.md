---
name: github-pr-proposer
description: |
  Reads fix entries from a Notion database, reads the target GitHub repo (read-only),
  and proposes changes as pull requests. Never writes to main — only creates
  koda/fix/* feature branches and opens PRs for human review.
  Triggered manually or from a Heartbeat check.
metadata:
  author: koda
  version: "2.0"
  requires:
    env:
      - GITHUB_TOKEN    # personal access token with repo scope; set in openclaw.json env block
      - NOTION_API_KEY
---

# GitHub PR Proposer

Reads fix entries from a Notion database, reads the target GitHub codebase via the GitHub API, plans a code change, and proposes it as a Pull Request. Never touches `main` — all writes are scoped to `koda/fix/*` branches.

## When to Use

- Manually: "Use the github-pr-proposer skill to check my Notion fix list"
- From a Heartbeat: periodic autonomous sweep of the fix database
- Any time you want Koda to translate a Notion fix entry into a reviewable PR

## Execution Model

All operations use the **GitHub REST API and Notion API directly via Python `urllib`**. There is no local git clone, no `gh` CLI, no filesystem access to the target repository.

- Never run `git clone`, `git checkout`, or any git CLI command on the target repo
- Never search the local filesystem for a directory matching the repo name
- Never use the Bash tool to navigate to or inspect a local copy of the repo
- "Reading the codebase" means calling `GET /repos/{owner}/{repo}/contents/{path}` — not opening a file on disk
- The only local filesystem writes are handoff documents (`~/.openclaw/thoughts/`)

## Phase Structure: Research → Plan → Implement

Every run follows three phases in strict order. **Implementation never starts without a written plan. A plan is never written without completed research.**

| Phase | Session | Output | What stops the session |
|---|---|---|---|
| **R — Research** (Steps 3–4) | Session 1 | `RESEARCH.md` written to thoughts dir | Notion = "Research Complete", session stops |
| **P — Plan** (Step 4.5) | Session 2 | `PLAN.md` written to thoughts dir | Notion = "Planning Complete", session stops |
| **I — Implement** (Steps 6–7) | Session 3 | Code committed to branch | Context < 60%, syntax validated |
| **PR — Open PR** (Steps 8–9) | Session 3 | PR created + Notion updated | Notion = "PR Opened" |

If you find yourself writing code before a `PLAN.md` exists for this entry — stop. Go back to Phase P.

## Safety Constraints

These are non-negotiable and must be followed on every run:

- **Never commit to `main`, `master`, or any protected branch**
- **Never force-push**
- **Never merge PRs** — only open them
- **Never write to a branch that already exists with commits not created by this workflow**
- All writes go to `koda/fix/{slug}` branches only
- If a repo is private or inaccessible, stop and report — do not guess credentials
- If the Notion entry is too vague to make a safe change, open a PR with a detailed question in the body instead of guessing destructively

### Explicit STOP Conditions

- **Rate limit below 100**: Stop before touching anything. Report reset time.
- **Empty Repo field**: Skip that entry. Print page_id. Do not make any GitHub call for it.
- **Branch write fails after retry**: Stop processing that entry. Do not proceed to Steps 7 or 8.
- **Stale SHA on commit**: Delete the orphaned branch immediately. Stop that entry. Report.
- **PR creation fails**: Delete the orphaned branch. Stop. Report branch name so user can inspect.
- **Head equals base**: Stop before branch creation. Do not attempt to create the branch.
- **Never create more than one branch or PR per entry per run**.

---

## Step-by-Step Workflow

### Step 0 — Preflight Safety Check

Check the GitHub rate limit before any write operation. If `remaining < 100`, print the reset time and stop.

```bash
python3 <<'EOF'
import urllib.request, os, json, datetime

req = urllib.request.Request('https://api.github.com/rate_limit')
req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
req.add_header('Accept', 'application/vnd.github+json')
req.add_header('X-GitHub-Api-Version', '2022-11-28')

try:
    print("calling GitHub API...")
    data = json.load(urllib.request.urlopen(req, timeout=15))
except Exception as e:
    print(f"STOP: Could not check GitHub rate limit — {e}")
    raise SystemExit(1)

core = data['resources']['core']
remaining = core['remaining']
reset_time = datetime.datetime.utcfromtimestamp(core['reset']).strftime('%Y-%m-%d %H:%M UTC')

print(f"GitHub rate limit: {remaining}/{core['limit']} remaining (resets {reset_time})")

if remaining < 100:
    print(f"STOP: Rate limit too low. Resets at {reset_time}.")
    raise SystemExit(1)

print("Preflight passed — safe to proceed.")
EOF
```

```python
python3 <<'EOF'
import json, os

config_path = os.path.expanduser("~/.openclaw/openclaw.json")
with open(config_path) as f:
    oc_config = json.load(f)

mc = oc_config.get("model_config", {})
CONTEXT_WINDOW_TOKENS = mc.get("context_window_tokens", 196608)
HANDOFF_THRESHOLD_PCT = mc.get("handoff_threshold_pct", 0.60)
CONTEXT_OVERHEAD_TOKENS = 2000
HANDOFF_THRESHOLD_TOKENS = int(CONTEXT_WINDOW_TOKENS * HANDOFF_THRESHOLD_PCT)
CONTEXT_LIMIT_CHARS = (HANDOFF_THRESHOLD_TOKENS - CONTEXT_OVERHEAD_TOKENS) * 4

print(f"Model: {mc.get('name', 'unknown')}")
print(f"Context window: {CONTEXT_WINDOW_TOKENS} tokens")
print(f"Handoff threshold: {HANDOFF_THRESHOLD_TOKENS} tokens ({int(HANDOFF_THRESHOLD_PCT*100)}%)")
print(f"Char limit before handoff: {CONTEXT_LIMIT_CHARS:,} chars")
EOF
```

**Context Tracker — carry these values through the entire run:**
- `CONTEXT_CHARS = 0` — running total of characters of all file content read
- `CONTEXT_LIMIT_CHARS` — from the script above

Every time you read a file's content in Phase A or C, add `len(file_content)` to `CONTEXT_CHARS`.
After each major phase, estimate: `estimated_tokens = (CONTEXT_CHARS / 4) + 2000`
If `estimated_tokens >= HANDOFF_THRESHOLD_TOKENS`: execute the Handoff Protocol before the next phase.

---

### Step 0.5 — Skill Discovery

Before proceeding, scan the available skills directory at `~/.agents/skills/` and identify which skills are relevant to this run. Read their descriptions. The following skills are known to be useful for PR proposer tasks:

| Skill | When to use |
|---|---|
| `code-analysis` | Phase A (Research) — use to analyze codebase structure and identify patterns before reading individual files |
| `pre-code-checklist` | Phase B (Plan) — run before writing the plan to validate you have enough context |
| `remembering-conversations` | Phase B (Plan) — use if the entry description is vague; search past conversations for context about this repo or task |
| `code-review` | Phase D (Self-review, Step 7.5) — use to review the proposed change against SOLID/DRY standards before opening the PR |
| `pr-workflow` | Phase B (Plan) — use if the change touches multiple files to ensure the PR is scoped correctly |

**Required actions at each phase:**
- Phase A: Invoke `code-analysis` skill to structure codebase exploration before reading individual files
- Phase B: Invoke `pre-code-checklist` skill before writing the plan; invoke `remembering-conversations` if the description is vague or references past work
- Phase D (Step 7.5): Invoke `code-review` skill on the proposed diff before marking the checklist complete

Scan `~/.agents/skills/` at runtime in case new skills have been added. Any skill whose description mentions the current task domain (GitHub, code changes, PRs, TypeScript/Python depending on the repo language) should be considered.

---

### Step 1 — Identify the Notion Database

The target database is **OpenClaw**. The `DATABASE_ID` is already known — skip discovery and use it directly:

```
DATABASE_ID = 2ffcd9598000412f8b21e8d6fa4533c7
```

If you have this saved in memory already, skip this step. If not, save it now:

```
notion_openclaw_database_id: 2ffcd9598000412f8b21e8d6fa4533c7
notion_openclaw_confirmed_by_user: true
```

Proceed directly to Step 2 using `DATABASE_ID = "2ffcd9598000412f8b21e8d6fa4533c7"`.

---

### Step 2 — Query Entries and Route by Status

Query the Notion database for all actionable entries. Process them in priority order — check top-to-bottom and handle the first match.

```bash
python3 <<'EOF'
import urllib.request, os, json

DATABASE_ID = "2ffcd9598000412f8b21e8d6fa4533c7"

ACTIONABLE_STATUSES = [
    "Coding",
    "Planning Complete",
    "Planning",
    "Research Complete",
    "Researching",
    "In Progress",
    "Ready",
]

all_pages = []
for status in ACTIONABLE_STATUSES:
    data = json.dumps({
        "filter": {
            "property": "Status",
            "select": {"equals": status}
        },
        "sorts": [{"property": "Created", "direction": "ascending"}],
        "page_size": 10
    }).encode()

    req = urllib.request.Request(
        f'https://api.notion.com/v1/databases/{DATABASE_ID}/query',
        data=data, method='POST'
    )
    req.add_header('Authorization', f'Bearer {os.environ["NOTION_API_KEY"]}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Notion-Version', '2022-06-28')

    results = json.load(urllib.request.urlopen(req, timeout=15))
    pages = results.get('results', [])
    for page in pages:
        props = page.get('properties', {})
        title_prop = props.get('Name') or props.get('Title') or {}
        title = ''.join(p.get('plain_text', '') for p in title_prop.get('title', []))
        status_val = props.get('Status', {}).get('select', {}) or {}
        status_name = status_val.get('name', 'Unknown')
        repo_prop = props.get('Repo', {})
        repo = ''
        if 'rich_text' in repo_prop:
            repo = ''.join(p.get('plain_text', '') for p in repo_prop['rich_text']).strip()
        elif 'select' in repo_prop and repo_prop['select']:
            repo = repo_prop['select']['name'].strip()
        if repo.startswith('https://github.com/'):
            parts = repo.replace('https://github.com/', '').strip('/').split('/')
            repo = '/'.join(parts[:2]) if len(parts) >= 2 else ''
        branch_prop = props.get('Branch', {})
        branch = ''.join(p.get('plain_text', '') for p in branch_prop.get('rich_text', [])).strip()
        description_prop = props.get('Description', {})
        description = ''.join(
            p.get('plain_text', '') for p in description_prop.get('rich_text', [])
        ).strip()
        all_pages.append({
            'page_id': page['id'],
            'title': title,
            'status': status_name,
            'repo': repo,
            'branch': branch,
            'description': description,
        })
        print(f"FOUND status={status_name!r} page_id={page['id']} title={title!r} repo={repo!r} branch={branch!r}")

if not all_pages:
    print("Nothing to do.")
    raise SystemExit(0)

print(f"Total actionable entries: {len(all_pages)}")
EOF
```

**Priority order for routing (check top-to-bottom, handle first match):**

1. **`Coding`** — Session 3 interrupted mid-implementation
   - Branch exists on GitHub + no open PR → resume from Step 7
   - Branch exists + PR open → resume from Step 9 (update Notion)
   - Branch does not exist → re-create branch from PLAN.md branch field, resume from Step 7

2. **`Planning Complete`** — Session 3 starting fresh
   - Find PLAN.md on disk → proceed to Step 2.6 (validate plan), then Step 2.7 (lock as "Coding")

3. **`Planning`** — Session 2 interrupted
   - If PLAN.md exists on disk → treat as "Planning Complete", proceed to Step 2.6
   - If PLAN.md missing → reset Notion to "Research Complete", stop

4. **`Research Complete`** — Session 2 starting fresh
   - Find RESEARCH.md on disk → proceed to Step 2.5

5. **`Researching`** — Session 1 interrupted (treat as "Ready")
   - Reset Notion to "Ready", re-research from beginning

6. **`In Progress`** — legacy entries; use existing resume logic
   - Branch exists + no open PR → resume from Step 7
   - Branch exists + PR open → resume from Step 9
   - No branch → reset to "Ready", reprocess from beginning

7. **`Ready`** — Session 1 starting fresh
   - Lock as "Researching" (not "In Progress"), proceed to Step 3

**For `Ready` entries:** Compute the branch slug now, lock Notion as "Researching", and record the slug in the Branch field. Do not create the branch on GitHub yet — that happens in Session 3 (Step 6).

**For `Research Complete` / `Planning Complete` / `Coding` entries:** The branch slug is already in the Branch field from when the entry was first locked. Extract it from there.

```bash
python3 <<'EOF'
import urllib.request, os, json

PAGE_ID = "REPLACE"       # page_id from above
BRANCH_SLUG = "REPLACE"   # koda/fix/{slug} — computed from title (max 50 chars, lowercase, hyphens)
SESSION_STATUS = "REPLACE"  # "Researching" for Ready entries

def to_rich_text(s):
    return [{"text": {"content": s}}]

data = json.dumps({
    "properties": {
        "Status": {"select": {"name": SESSION_STATUS}},
        "Branch": {"rich_text": to_rich_text(BRANCH_SLUG)}
    }
}).encode()

req = urllib.request.Request(
    f'https://api.notion.com/v1/pages/{PAGE_ID}',
    data=data, method='PATCH'
)
req.add_header('Authorization', f'Bearer {os.environ["NOTION_API_KEY"]}')
req.add_header('Content-Type', 'application/json')
req.add_header('Notion-Version', '2022-06-28')

try:
    print("calling Notion API...")
    result = json.load(urllib.request.urlopen(req, timeout=15))
    print(f"Locked as {SESSION_STATUS}: {result['id']}  branch_slug={BRANCH_SLUG}")
except urllib.error.HTTPError as e:
    print(f"WARNING: Could not lock entry ({e.code}): {e.read().decode()}")
    print("Proceeding anyway — duplicate run risk is low.")
EOF
```

**Forward per entry: `page_id`, `title`, `repo`, `description`, `branch_slug` (suffix after `koda/fix/`)**

If `description` is non-empty, treat it as additional task context in Phase B. Quote it explicitly in the plan under "Additional context from Notion Description".

**Never write to `Description`. It is read-only.**

Process entries one at a time. Do not start the next entry until the current one is fully complete or explicitly abandoned. page_size is 10 — if you have more than 10 actionable entries, only the 10 oldest per status are returned per run.

---

### Step 2.5 — Locate RESEARCH.md (Research Complete entries only)

```python
python3 <<'EOF'
import os, glob

OWNER_REPO = "REPLACE"     # e.g. "isaiahrivera-myrepo" (slash → hyphen, lowercase)
BRANCH_SLUG = "REPLACE"    # suffix after "koda/fix/" from the Branch field

research_dir = os.path.expanduser(
    f"~/.openclaw/thoughts/shared/research/{OWNER_REPO}"
)
pattern = os.path.join(research_dir, f"*_{BRANCH_SLUG}-research.md")
matches = sorted(glob.glob(pattern))

if not matches:
    print(f"RESEARCH_NOT_FOUND: {pattern}")
    raise SystemExit(1)

research_path = matches[-1]  # most recent if multiple
print(f"RESEARCH_FOUND: {research_path}")
EOF
```

Read the RESEARCH.md in full. Load all data: Language Context Block, file SHAs, current behavior, root cause, conventions, test infrastructure, suggested approach. This document is the **sole input for Step 4.5** — no GitHub API calls are made in Session 2.

**Session Opening Protocol for Session 2:**
1. Read RESEARCH.md in full
2. Estimate opening token cost: `len(research_content) / 4` — if above 20% of context window, log a warning (document should be condensed on future runs)
3. Confirm RESEARCH.md has all required sections: Language Context Block, Files to Act On (with SHAs), Current Behavior, Conventions. If any section is missing: reset Notion to "Ready", log which section is missing, stop.

If RESEARCH.md not found: reset Notion to "Ready", log anomaly, stop.

Lock Notion as "Planning" before proceeding to Step 4.5:

```python
python3 <<'EOF'
import urllib.request, os, json

PAGE_ID = "REPLACE"

data = json.dumps({
    "properties": {
        "Status": {"select": {"name": "Planning"}}
    }
}).encode()

req = urllib.request.Request(
    f'https://api.notion.com/v1/pages/{PAGE_ID}',
    data=data, method='PATCH'
)
req.add_header('Authorization', f'Bearer {os.environ["NOTION_API_KEY"]}')
req.add_header('Content-Type', 'application/json')
req.add_header('Notion-Version', '2022-06-28')

print("calling Notion API...")
result = json.load(urllib.request.urlopen(req, timeout=15))
print(f"Locked as Planning: {result['id']}")
EOF
```

---

### Step 2.6 — Locate and Validate PLAN.md (Planning Complete entries only)

```python
python3 <<'EOF'
import os, glob

OWNER_REPO = "REPLACE"     # e.g. "isaiahrivera-myrepo" (slash → hyphen, lowercase)
BRANCH_SLUG = "REPLACE"    # suffix after "koda/fix/" from the Branch field

plans_dir = os.path.expanduser(
    f"~/.openclaw/thoughts/shared/plans/{OWNER_REPO}"
)
pattern = os.path.join(plans_dir, f"*_{BRANCH_SLUG}-plan.md")
matches = sorted(glob.glob(pattern))

if not matches:
    print(f"PLAN_NOT_FOUND: {pattern}")
    raise SystemExit(1)

plan_path = matches[-1]  # most recent if multiple
print(f"PLAN_FOUND: {plan_path}")

# Read and validate frontmatter
with open(plan_path) as f:
    content = f.read()

import re

status_match = re.search(r'^status:\s*(\S+)', content, re.MULTILINE)
page_id_match = re.search(r'^page_id:\s*(\S+)', content, re.MULTILINE)
completed_match = re.search(r'^plan_session_completed_at:\s*(.+)', content, re.MULTILINE)

plan_status = status_match.group(1) if status_match else None
plan_page_id = page_id_match.group(1) if page_id_match else None
plan_completed_at = completed_match.group(1).strip() if completed_match else None

print(f"plan_status={plan_status}")
print(f"plan_page_id={plan_page_id}")
print(f"plan_completed_at={plan_completed_at}")

# Check for actual diff content (lines starting with - or + that aren't frontmatter)
body = content.split('---', 2)[-1] if content.count('---') >= 2 else content
has_diff_lines = bool(re.search(r'^[+-][^-+]', body, re.MULTILINE))
print(f"has_diff_lines={has_diff_lines}")
EOF
```

**Validation rules:**
- `plan_status == "planning"` (Session 2 crashed after Notion write but before file update): reset Notion to "Research Complete", stop
- `plan_status == "planning_complete"` and `plan_session_completed_at` is non-null: proceed
- `plan_page_id` does not match the Notion `page_id` from Step 2: stop, log both IDs, do not implement
- `has_diff_lines == False` (diff is all prose, no actual `+`/`-` lines): reset Notion to "Ready", delete PLAN.md and RESEARCH.md for this entry, stop

**Session Opening Protocol for Session 3:**
1. Read PLAN.md in full
2. Estimate opening token cost: `len(plan_content) / 4` — if above 20% of context window, log warning
3. Confirm PLAN.md has an actual diff (lines starting with `-` and `+`) before proceeding — if missing, reset to "Ready"

If PLAN.md not found: reset Notion to "Ready", log anomaly, stop.

---

### Step 2.7 — Acquire Implementation Lock (Planning Complete entries only)

```python
python3 <<'EOF'
import urllib.request, os, json, re, datetime

PAGE_ID = "REPLACE"
PLAN_PATH = "REPLACE"  # full path from Step 2.6

# PATCH Notion: Status = "Coding"
data = json.dumps({
    "properties": {
        "Status": {"select": {"name": "Coding"}}
    }
}).encode()

req = urllib.request.Request(
    f'https://api.notion.com/v1/pages/{PAGE_ID}',
    data=data, method='PATCH'
)
req.add_header('Authorization', f'Bearer {os.environ["NOTION_API_KEY"]}')
req.add_header('Content-Type', 'application/json')
req.add_header('Notion-Version', '2022-06-28')

print("calling Notion API...")
result = json.load(urllib.request.urlopen(req, timeout=15))
print(f"Locked as Coding: {result['id']}")

# Update PLAN.md frontmatter
with open(PLAN_PATH) as f:
    content = f.read()

now = datetime.datetime.utcnow().isoformat() + 'Z'
content = re.sub(r'^status: planning_complete$', 'status: implementing', content, flags=re.MULTILINE)
content = re.sub(r'^implementation_session_started_at: ~$', f'implementation_session_started_at: {now}', content, flags=re.MULTILINE)

with open(PLAN_PATH, 'w') as f:
    f.write(content)

print(f"PLAN.md updated: status=implementing, implementation_session_started_at={now}")
EOF
```

**Context Budget Check (before Step 6)**

Before creating the GitHub branch, estimate current context usage:
`estimated_tokens = (CONTEXT_CHARS / 4) + 2000`
PLAN.md and RESEARCH.md reads count toward CONTEXT_CHARS.

If `estimated_tokens >= HANDOFF_THRESHOLD_TOKENS` (60% of context window):
- The plan is too large to implement safely in one session
- Reset Notion to "Ready" — Session 1 should research with narrower scope
- Log the reason and stop

If below threshold: proceed to Step 3.

---

### Step 3 — Identify the Repository

Parse `owner/repo` from the Notion entry's Repo field. If only a bare repo name is present (no `/`), fetch the authenticated GitHub username and prepend it.

```bash
python3 <<'EOF'
import urllib.request, os, json

req = urllib.request.Request('https://api.github.com/user')
req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
req.add_header('Accept', 'application/vnd.github+json')
req.add_header('X-GitHub-Api-Version', '2022-11-28')

print("calling GitHub API...")
user = json.load(urllib.request.urlopen(req))
print(f"github_username={user['login']}")
EOF
```

Compose the full `owner/repo`. Then verify it exists and is accessible:

```bash
python3 <<'EOF'
import urllib.request, os, json

OWNER = "REPLACE"
REPO = "REPLACE"

req = urllib.request.Request(
    f'https://api.github.com/repos/{OWNER}/{REPO}'
)
req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
req.add_header('Accept', 'application/vnd.github+json')
req.add_header('X-GitHub-Api-Version', '2022-11-28')

try:
    print("calling GitHub API...")
    repo = json.load(urllib.request.urlopen(req))
    print(f"default_branch={repo['default_branch']}  private={repo['private']}")
except urllib.error.HTTPError as e:
    print(f"ERROR {e.code}: {e.read().decode()}")
    # Stop here if 404 or 403 — do not proceed
EOF
```

If the repo is inaccessible (404, 403), update the Notion entry status to "Error" and stop.

---

### Step 4 — Research the Codebase (Read-Only) — Session 1 Only

**SESSION GUARD:** If triggered by a "Research Complete", "Planning Complete", or "Coding" entry — skip Step 4 entirely. Research was already written to RESEARCH.md. Proceed to the appropriate session start point (Step 2.5, 2.6, or resume logic).

This step has four required phases. Do not proceed to Step 5 until all four phases are complete.

#### Phase A — Research

1. Read the repository root listing to understand the project structure.

```bash
python3 <<'EOF'
import urllib.request, os, json

OWNER = "REPLACE"
REPO = "REPLACE"
PATH = ""  # root; set to a subdirectory path if needed

req = urllib.request.Request(
    f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{PATH}'
)
req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
req.add_header('Accept', 'application/vnd.github+json')
req.add_header('X-GitHub-Api-Version', '2022-11-28')

print("calling GitHub API...")
contents = json.load(urllib.request.urlopen(req))
for item in contents:
    print(f"{item['type']:6}  {item['name']}")
EOF
```

#### Phase A — Step 1b: Build System and Language Detection

After the root listing, read config files in priority order to identify the language and build system. Stop at the first match:

1. `package.json` → Node/TypeScript/JavaScript
2. `tsconfig.json` → TypeScript (if package.json has typescript dep)
3. `Cargo.toml` → Rust
4. `pyproject.toml` / `setup.py` → Python
5. `build.gradle` / `build.gradle.kts` → Kotlin/JVM
6. `Package.swift` → Swift
7. `pom.xml` → Java/Maven
8. `go.mod` → Go

Extract and explicitly print a **Language Context Block**:

```
LANGUAGE CONTEXT BLOCK
======================
Primary language: [e.g., TypeScript 5.2 / Swift 5.9 / Python 3.11]
Build command: [exact command or "not detected"]
Test command: [exact command or "not detected"]
Type checking: [strict / lenient / none / not detected]
Key constraints:
  - [e.g., "TypeScript strict mode: null checks enforced"]
  - [e.g., "Swift iOS 16 minimum: async/await available"]
======================
```

Do not proceed to "Check for test directories" until this block is written.

2. Check for test directories (`tests/`, `__tests__/`, `spec/`, files matching `*.test.*` or `*.spec.*`). Note whether TDD is expected.

3. Read files directly relevant to the task (follow imports if needed). Content is Base64-encoded:

```bash
python3 <<'EOF'
import urllib.request, os, json, base64

OWNER = "REPLACE"
REPO = "REPLACE"
FILE_PATH = "REPLACE"  # e.g. "src/utils.py"

req = urllib.request.Request(
    f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{FILE_PATH}'
)
req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
req.add_header('Accept', 'application/vnd.github+json')
req.add_header('X-GitHub-Api-Version', '2022-11-28')

print("calling GitHub API...")
file_data = json.load(urllib.request.urlopen(req, timeout=15))

# Guard: not a regular file (directory, submodule, symlink)
if file_data.get('type') != 'file':
    print(f"SKIP {FILE_PATH}: not a regular file (type={file_data.get('type')})")
    raise SystemExit(0)

# Guard: file over 1MB
if file_data.get('size', 0) > 1_000_000:
    print(f"SKIP {FILE_PATH}: file too large ({file_data.get('size')} bytes)")
    raise SystemExit(0)

raw_bytes = base64.b64decode(file_data['content'])

# Guard: binary file (null byte in first 8KB)
if b'\x00' in raw_bytes[:8192]:
    print(f"SKIP {FILE_PATH}: binary file detected")
    raise SystemExit(0)

# Guard: non-UTF-8 encoding
try:
    content = raw_bytes.decode('utf-8')
except UnicodeDecodeError:
    print(f"SKIP {FILE_PATH}: non-UTF-8 encoding")
    raise SystemExit(0)

sha = file_data['sha']  # SAVE THIS — needed for the PUT commit step
print(f"sha={sha}")
print(content)
EOF
```

**Save the `sha` for every file you plan to modify.** The GitHub API requires it when writing.

**Docs directory check:** While reading the root listing, note whether a `docs/` directory exists in the root. Save as `HAS_DOCS_DIR = True/False`. This is used in Step 8.6.

If a file was SKIPped, note it in the PR body under a "Skipped Files" section. Do not attempt to commit it.

4. Note the following from what you read:
   - Existing naming conventions (camelCase, snake_case, etc.)
   - Error handling patterns (exceptions, result types, error codes)
   - Whether the codebase uses typed errors or logging
   - Any relevant imports or dependencies

**Written output required before proceeding to Phase B.** Compose a "Research" section that will appear in the PR body:
- What files are relevant and why
- What patterns and conventions were observed
- What the current behavior is (before the fix)

For vague fix descriptions: read `README.md` first, then narrow down by directory, then by file.

**Do not proceed to Phase B until you understand what the codebase does and how the relevant code is structured.**

**Context Check — Phase A boundary**
Evaluate: `estimated_tokens = (CONTEXT_CHARS / 4) + 2000`
If `>= HANDOFF_THRESHOLD_TOKENS`: execute the Handoff Protocol. Do not start Phase B.
If below threshold: proceed to Session 1 Stop below.

---

**SESSION 1 STOP — RESEARCH COMPLETE**

1. Write RESEARCH.md to `~/.openclaw/thoughts/shared/research/{owner}-{repo}/{timestamp}_{slug}-research.md`

   Use `{timestamp}` = UTC datetime as `YYYY-MM-DD_HH-MM-SS` and `{slug}` = the branch slug (suffix after `koda/fix/`). `{owner}-{repo}` uses a hyphen (not slash).

   **Required structure:**

   ~~~markdown
   ---
   date: {ISO-8601}
   entry: "{notion entry title}"
   page_id: {page_id}
   repo: {owner/repo}
   branch_slug: {slug}
   session: research
   status: complete
   session_completed_at: {ISO-8601}
   ---

   # Research: {notion entry title}

   ## Language Context Block
   Primary language: [version]
   Build command: [exact command]
   Test command: [exact command]
   Type checking: [strict/lenient/none]
   Key constraints:
     - [constraint 1]
     - [constraint 2]

   ## Files to Act On
   {For each file relevant to the fix:}
   - path: {file path}
     sha: {sha from GitHub API}
     what: {1-sentence description of what it does}
     why: {1-sentence description of why it's relevant to the fix}

   ## Current Behavior (Root Cause)
   {3-5 sentences max: what the code does now, what's wrong, why}

   ## Conventions to Follow
   - {naming convention}
   - {error handling pattern}
   - {import style}
   - {up to 5 items}

   ## Test Infrastructure
   {Test directory path, framework name, assertion style — 2-3 lines}

   ## Explicitly Out of Scope
   - {what NOT to change — 2-3 items}

   ## Suggested Approach (for Session 2)
   {1-2 sentences: what Session 2 should plan. Not code — direction only.}
   ~~~

   **Target size:** Under ~2,000 tokens. Raw file contents are NOT included — only distilled findings. If findings are longer, summarize further. Session 2's context must have headroom.

   Create the directory if it does not exist.

2. PATCH Notion: Status = "Research Complete"

   ```python
   python3 <<'EOF'
   import urllib.request, os, json

   PAGE_ID = "REPLACE"

   data = json.dumps({
       "properties": {
           "Status": {"select": {"name": "Research Complete"}}
       }
   }).encode()

   req = urllib.request.Request(
       f'https://api.notion.com/v1/pages/{PAGE_ID}',
       data=data, method='PATCH'
   )
   req.add_header('Authorization', f'Bearer {os.environ["NOTION_API_KEY"]}')
   req.add_header('Content-Type', 'application/json')
   req.add_header('Notion-Version', '2022-06-28')

   print("calling Notion API...")
   result = json.load(urllib.request.urlopen(req, timeout=15))
   print(f"Status set to Research Complete: {result['id']}")
   EOF
   ```

3. Print: `RESEARCH SESSION COMPLETE. Slug: {slug}. Research: {RESEARCH_PATH}. Stopping.`

4. **STOP. Do not proceed to Step 4.5. Do not plan. Do not create a branch. Session 1 is done.**

---

### Step 4.5 — Write the Plan Document (Phase P) — Session 2 Only

**SESSION GUARD:** If triggered by a "Planning Complete" or "Coding" entry — skip Step 4.5 entirely. PLAN.md already exists. Proceed to Step 2.6.

**Session 2 Opening:** Read `RESEARCH_PATH` from disk. This is your only source of truth. Do not make any GitHub API calls. The file SHAs, language context, and current behavior are all in RESEARCH.md. If you need to re-read a specific file to write an accurate diff, fetch it using the SHA from RESEARCH.md via `GET /repos/{owner}/{repo}/contents/{path}` — do not re-browse the repo.

Before writing any code or reasoning about a diff, write a plan document to disk. This document is the single source of truth for what you intend to do and why. It is what a developer reads to understand the proposed change without reading the PR diff.

**Filename:** `{YYYY-MM-DD_HH-MM-SS}_{slug}-plan.md` (UTC timestamp, same slug as the branch)
**Path:** `~/.openclaw/thoughts/shared/plans/{owner}-{repo}/`

Create the directory if it does not exist.

**Required structure:**

~~~markdown
---
date: {ISO-8601}
entry: "{notion entry title}"
page_id: {page_id}
repo: {owner/repo}
branch: {BRANCH_NAME — koda/fix/{slug}}
research_path: {full path to RESEARCH.md}
session: planning
status: planning_complete
plan_session_completed_at: {ISO-8601}
implementation_session_started_at: ~
implementation_session_completed_at: ~
---

# Plan: {notion entry title}

## What I Found (Research Summary)

### Repository
- Language: {from Language Context Block}
- Build command: {from Language Context Block}
- Test command: {from Language Context Block}
- Type checking: {from Language Context Block}

### Files Relevant to This Task
{For each file read in Phase A: path, what it does, why it's relevant}

### Current Behavior
{What the code currently does — specific, not generic}

### Root Cause
{Why the current behavior is wrong or incomplete}

## What I Will Change

### Files to Modify
{Each file: path + what changes and why}

### Exact Diff (line by line)
{Unified diff format. `-` for removed lines, `+` for added lines. Not prose — actual lines.}

### Why This Approach
{Why this approach over alternatives. Name at least one alternative and why it was rejected.}

## What Could Break

{At least two specific, concrete failure modes and how each is handled. Not "runtime errors" — specific scenarios.}

## Edge Cases

{Inputs or states that could produce unexpected results. "None" only if genuinely none.}

## Test Plan

{If repo has tests: which test file will be added/modified, what cases will be covered.}
{If no tests: state why no tests are being added.}

## Out of Scope

{Anything intentionally not changed and why.}
~~~

**After writing this file:**
1. Print: `PLAN WRITTEN: {full path}`
2. Save the path as `PLAN_PATH` — you will reference it in Step 8 (PR body) and Step 9 (Notion feedback)
3. If context threshold check fires here: write a handoff that includes `PLAN_PATH`. The plan document already exists, so the resume path skips Phase P and starts at Phase I.

**Do not proceed to Session 2 Stop until `PLAN_PATH` is confirmed written to disk.**

---

**SESSION 2 STOP — PLANNING COMPLETE**

1. Update PLAN.md frontmatter: `status` → `planning_complete`, `plan_session_completed_at` → now (ISO-8601 UTC)

2. PATCH Notion: Status = "Planning Complete"

   ```python
   python3 <<'EOF'
   import urllib.request, os, json

   PAGE_ID = "REPLACE"

   data = json.dumps({
       "properties": {
           "Status": {"select": {"name": "Planning Complete"}}
       }
   }).encode()

   req = urllib.request.Request(
       f'https://api.notion.com/v1/pages/{PAGE_ID}',
       data=data, method='PATCH'
   )
   req.add_header('Authorization', f'Bearer {os.environ["NOTION_API_KEY"]}')
   req.add_header('Content-Type', 'application/json')
   req.add_header('Notion-Version', '2022-06-28')

   print("calling Notion API...")
   result = json.load(urllib.request.urlopen(req, timeout=15))
   print(f"Status set to Planning Complete: {result['id']}")
   EOF
   ```

3. Print: `PLANNING SESSION COMPLETE. Branch: {BRANCH_NAME}. Plan: {PLAN_PATH}. Stopping.`

4. **STOP. Do not proceed to Step 5. Do not create a branch. Do not write code. Session 2 is done.**

---

Note: Step 5 (Phase B) still runs in Session 3 — it is the in-context reasoning pass that validates the plan document before any GitHub write. The plan document is the output of Session 2; Step 5 is Session 3's quality gate on that output.

---

### Step 5 — Plan the Change (Session 3 Entry Point)

**Session 3 entry point.** When triggered by a "Planning Complete" or "Coding" entry, this step reads the existing PLAN.md from disk (located via Step 2.6) and validates it against the Phase B checklist before any GitHub write. This is not re-planning — do not call GitHub API to re-read files. If the plan is missing required sections or lacks an actual diff (code lines starting with `-`/`+`, not prose): **reset Notion to "Ready"** so Session 1 re-researches from scratch. Delete any partial PLAN.md or RESEARCH.md for this entry.

#### Phase B — Plan

Before writing anything, explicitly reason through each of the following. This reasoning must be written out — do not skip any item.

1. **What file(s) change?** List every file that will be modified.
2. **What is the exact diff?** Write it out line by line — old lines and new lines.
3. **At least one alternative approach.** What else could solve this? Why is the chosen approach better?
4. **Edge cases.** What inputs or states could break this change? How is each handled?
5. **Scope check.** Is the description specific enough to make a safe, scoped change?
6. **Additional context from Notion Description.** If `description` is non-empty, quote it here and state explicitly how it changed or confirmed the approach. If it conflicts with the entry title, flag the conflict in the PR body.

7. **Compilability check against Language Context Block.** Copy the Language Context Block here. For each line of the diff that adds or modifies code, confirm:
   - Null/optional types are handled per the type system (strict null checks, optional chaining, etc.)
   - All new functions have required annotations (return types, parameter types)
   - All new syntax is available in the stated language version
   If you cannot confirm all of these, revise the diff before proceeding.

8. **Import and symbol verification.** For every new symbol in the diff (function calls, class references, type names, constants), state its source:
   - "defined in this file at line X"
   - "imported from [module]"
   - "defined in [file path] — I read that file in Phase A and confirmed it exports this symbol"
   If you cannot state the source, read the file that should define it before proceeding.

9. **Structural completeness check.** Count and state the delimiter balance in the diff:
   - Braces `{` / `}`: [N open, N close]
   - Parens `(` / `)`: [N open, N close]
   - Brackets `[` / `]`: [N open, N close]
   - Python only: every `def`/`class`/`if`/`for`/`while` has a properly indented block
   If counts don't match, fix the diff before proceeding.

10. **Test structure alignment.** State the test file naming pattern, framework, and assertion style observed in Phase A. Name the specific existing test file being modeled. Confirm the new test code copies the structure — same imports, same nesting, same assertion style — not invented patterns.

If the description is too vague to produce a safe diff, still create the branch and PR — but put your question in the PR body rather than making a speculative change. A PR with no code change but a clear question is better than a wrong change.

**Do not proceed to Step 6 until the plan is written and each item above is answered.**

**Context Check — Phase B boundary**
Evaluate: `estimated_tokens = (CONTEXT_CHARS / 4) + 2000`
If `>= HANDOFF_THRESHOLD_TOKENS`: execute the Handoff Protocol. Do not create the branch.
If below threshold: proceed to Step 6.

---

### Step 6 — Create the Feature Branch

Get the SHA of the default branch's HEAD, then create a new branch off it.

```bash
python3 <<'EOF'
import urllib.request, os, json

OWNER = "REPLACE"
REPO = "REPLACE"
DEFAULT_BRANCH = "main"  # or "master" from Step 3
SLUG = "REPLACE-WITH-SLUG"  # e.g. fix-null-check-in-auth

# Guard: branch name must not equal the default branch
BRANCH_NAME = f"koda/fix/{SLUG}"
if BRANCH_NAME == DEFAULT_BRANCH:
    print(f"STOP: computed branch name '{BRANCH_NAME}' equals default branch. Aborting.")
    raise SystemExit(1)

# Get current HEAD SHA
req = urllib.request.Request(
    f'https://api.github.com/repos/{OWNER}/{REPO}/git/ref/heads/{DEFAULT_BRANCH}'
)
req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
req.add_header('Accept', 'application/vnd.github+json')
req.add_header('X-GitHub-Api-Version', '2022-11-28')

print("calling GitHub API...")
ref_data = json.load(urllib.request.urlopen(req, timeout=15))
head_sha = ref_data['object']['sha']
print(f"BRANCH_NAME={BRANCH_NAME}")
print(f"head_sha={head_sha}")
EOF
```

**Save `BRANCH_NAME` and `head_sha` from the output above, then run:**

```bash
python3 <<'EOF'
import urllib.request, os, json, datetime

OWNER = "REPLACE"
REPO = "REPLACE"
BRANCH_NAME = "REPLACE"  # koda/fix/{slug} from block above
HEAD_SHA = "REPLACE"     # head_sha from block above

def create_branch(name, sha):
    data = json.dumps({
        "ref": f"refs/heads/{name}",
        "sha": sha
    }).encode()
    req = urllib.request.Request(
        f'https://api.github.com/repos/{OWNER}/{REPO}/git/refs',
        data=data, method='POST'
    )
    req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('Content-Type', 'application/json')
    req.add_header('X-GitHub-Api-Version', '2022-11-28')
    print("calling GitHub API...")
    return urllib.request.urlopen(req, timeout=15)

ACTIVE_BRANCH = BRANCH_NAME
try:
    result = json.load(create_branch(ACTIVE_BRANCH, HEAD_SHA))
    print(f"branch created: {result['ref']}")
except urllib.error.HTTPError as e:
    if e.code == 409:
        # Retry with timestamp suffix to avoid same-second collision
        ts = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        ACTIVE_BRANCH = f"{BRANCH_NAME}-{ts}"
        print(f"Branch exists (409). Retrying with suffix: {ACTIVE_BRANCH}")
        try:
            result = json.load(create_branch(ACTIVE_BRANCH, HEAD_SHA))
            print(f"branch created: {result['ref']}")
        except urllib.error.HTTPError as e2:
            if e2.code == 409:
                print(f"STOP: Branch still conflicts on retry ({ACTIVE_BRANCH}).")
                print(f"Manual cleanup: https://github.com/{OWNER}/{REPO}/branches")
                raise SystemExit(1)
            raise
    else:
        raise

print(f"ACTIVE_BRANCH={ACTIVE_BRANCH}")
EOF
```

Branch naming: `koda/fix/{slugified-notion-title}` — lowercase, hyphens only, max 50 chars for the slug portion.

If branch creation returns 409, the script retries with a `{YYYYMMDD_HHMMSS}` suffix. If the retry also fails, the skill stops. The `ACTIVE_BRANCH` printed value is the canonical name to use in Steps 7 and 8.

---

### Step 7 — Commit the Change

#### Phase C — Implement

**Phase I Gate:** Before writing any file content, confirm `PLAN_PATH` is set and the file exists. If `PLAN_PATH` is not set or the file does not exist on disk, stop. Return to Step 4.5 and write the plan first. Do not skip this gate.

**Step C.1 — Read one existing test file in full.**
Pick the test file closest to the file being changed (e.g., if changing `src/auth/tokenValidator.ts`, look for `src/auth/tokenValidator.test.ts`). Read it using the Phase A file-reading script.

Extract and record:
- Import style (e.g., `import { describe, it, expect } from 'vitest'`)
- Test block structure (describe/it nesting, naming conventions)
- Assertion style (`expect(x).toBe(y)` vs `assert x == y` vs `XCTAssertEqual`)
- Mocking/fixture pattern
- Setup/teardown pattern

If repo has NO test directory: skip C.1–C.3 and proceed directly to C.4.

**Step C.2 — Write test content by copying the structure of the file you just read.**
Do not invent structure. Same imports (adjusted for the module being tested), same nesting, same assertion style. State: "I am modeling this test after [path/to/existing/test/file]."

**Step C.3 — Run Step 7.3 validation on the test file content before committing it.**

**Step C.4 — Commit test file first, then implementation file.**
- Test commit: `test: add tests for [module name]`
- Impl commit: `fix: [what was fixed]`

If repo has NO test directory: write implementation only. Do not create test infrastructure — out of scope.

Write the modified file to the new branch. Content must be Base64-encoded. The `sha` is from Step 4.

```bash
python3 <<'EOF'
import urllib.request, os, json, base64

OWNER = "REPLACE"
REPO = "REPLACE"
BRANCH_NAME = "REPLACE"  # use ACTIVE_BRANCH from Step 6
FILE_PATH = "REPLACE"    # same path as read in Step 4
FILE_SHA = "REPLACE"     # sha from Step 4 GET response
COMMIT_MESSAGE = "fix: REPLACE with concise description"

NEW_CONTENT = """REPLACE WITH FULL FILE CONTENT"""

def delete_branch(owner, repo, branch):
    """Best-effort branch cleanup. Does not raise on failure."""
    try:
        req = urllib.request.Request(
            f'https://api.github.com/repos/{owner}/{repo}/git/refs/heads/{branch}',
            method='DELETE'
        )
        req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
        req.add_header('Accept', 'application/vnd.github+json')
        req.add_header('X-GitHub-Api-Version', '2022-11-28')
        urllib.request.urlopen(req, timeout=15)
        print(f"Orphaned branch deleted: {branch}")
    except Exception as cleanup_err:
        print(f"WARNING: Could not delete branch {branch} — clean up manually.")
        print(f"  Manual link: https://github.com/{owner}/{repo}/branches")
        print(f"  Error: {cleanup_err}")

encoded = base64.b64encode(NEW_CONTENT.encode('utf-8')).decode('utf-8')

data = json.dumps({
    "message": COMMIT_MESSAGE,
    "content": encoded,
    "sha": FILE_SHA,
    "branch": BRANCH_NAME
}).encode()

req = urllib.request.Request(
    f'https://api.github.com/repos/{OWNER}/{REPO}/contents/{FILE_PATH}',
    data=data, method='PUT'
)
req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
req.add_header('Accept', 'application/vnd.github+json')
req.add_header('Content-Type', 'application/json')
req.add_header('X-GitHub-Api-Version', '2022-11-28')

try:
    print("calling GitHub API...")
    result = json.load(urllib.request.urlopen(req, timeout=15))
    print(f"committed: {result['commit']['sha']}")
except urllib.error.HTTPError as e:
    if e.code == 409:
        print(f"STOP: Stale SHA — {FILE_PATH} was modified between read and write.")
        print(f"Deleting orphaned branch {BRANCH_NAME} ...")
        delete_branch(OWNER, REPO, BRANCH_NAME)
        raise SystemExit(1)
    else:
        print(f"STOP: Commit failed ({e.code}): {e.read().decode()}")
        delete_branch(OWNER, REPO, BRANCH_NAME)
        raise SystemExit(1)
EOF
```

For a PR with no code change (vague description), skip this step — the branch stays empty. The PR body will contain the question.

---

### Step 7.3 — Pre-Commit Syntax Validation

Run this BEFORE the PUT request — validate `NEW_CONTENT` before it is committed. Run for each file being committed.

```python
python3 <<'EOF'
import sys, re

LANGUAGE = "REPLACE"      # python | typescript | swift | kotlin | rust | go | java | other
FILE_PATH = "REPLACE"
NEW_CONTENT = """REPLACE"""  # same content as Step 7 PUT

def validate(language, content):
    errors, warnings = [], []

    if language == "python":
        import ast
        try:
            ast.parse(content)
        except SyntaxError as e:
            errors.append(f"SyntaxError at line {e.lineno}: {e.msg}")
        return errors, warnings

    brace_langs = {"typescript","swift","kotlin","rust","go","java","javascript","c","cpp"}
    if language in brace_langs:
        ob, cb = content.count('{'), content.count('}')
        op, cp = content.count('('), content.count(')')
        obr, cbr = content.count('['), content.count(']')
        if ob != cb: warnings.append(f"Brace imbalance: {ob} '{{' vs {cb} '}}'")
        if op != cp: warnings.append(f"Paren imbalance: {op} '(' vs {cp} ')'")
        if obr != cbr: warnings.append(f"Bracket imbalance: {obr} '[' vs {cbr} ']'")
        stripped = content.rstrip()
        if stripped and not stripped.endswith(('}', ';', ')', ']')):
            warnings.append(f"File ends with {stripped[-1]!r} — possible truncation")
        if language == "typescript":
            anys = re.findall(r':\s*any\b', content)
            if anys: warnings.append(f"{len(anys)} usage(s) of ': any' — verify intentional")
    else:
        warnings.append(f"No validation for language '{language}' — skipping")

    return errors, warnings

errors, warnings = validate(LANGUAGE, NEW_CONTENT)
for w in warnings: print(f"WARNING: {w}")
if errors:
    print("BLOCK: Fix errors before committing.")
    for e in errors: print(f"  ERROR: {e}")
    sys.exit(1)
else:
    print(f"PASS: {FILE_PATH}")
EOF
```

**Decision rules:**
- `BLOCK` → stop. Fix content and re-run. If unfixable, open a question PR with empty branch instead.
- `WARNING` → reason through each warning explicitly. If not a false positive, fix before committing.
- `PASS` → proceed to PUT.

---

**Context Check — Phase C boundary**
Evaluate: `estimated_tokens = (CONTEXT_CHARS / 4) + 2000`
If `>= HANDOFF_THRESHOLD_TOKENS`: execute the Handoff Protocol. Record in the handoff that the branch and commits exist so the resume path skips Steps 6 and 7.
If below threshold: proceed to Step 7.5.

---

### Step 7.5 — Self-Review (Phase D)

Before opening the PR, write out all four declarations with specific content. "Yes" or a checkbox is not acceptable — each declaration requires actual detail.

**Declaration 1 — Language and syntax rules:**
"This code is written in [language + version]. The syntax rules I applied are: [list 3-5 specific rules, e.g., 'TypeScript strict mode: return types required on all functions', 'Python 3.11: match statements available']."

**Declaration 2 — Symbol provenance:**
"Every symbol I use in the diff is accounted for:" then list each new symbol and its source: defined at line X / imported from 'module' / confirmed in [file path] which I read in Phase A.

If any symbol's source is unknown → stop. Read the file. Do not commit until all symbols are accounted for.

**Declaration 3 — What could go wrong:**
"The things that could break this change are:" then list at least two specific, concrete failure modes. NOT "the code could fail at runtime." Example: "if `user.profile` is null, line 47 throws because I access `.name` without a null check — handled by [X]."

**Declaration 4 — Diff correctness attestation:**
- Syntax validation result from Step 7.3: [PASS / PASS WITH WARNINGS: {describe each} / BLOCK — fixed: {what}]
- Brace/paren/bracket balance: [confirmed counts or "N/A for Python"]
- "The full file has [Z] lines. The content is complete — not truncated."
- "After this commit, the file will [describe intended runtime behavior in one sentence]."

**Do not proceed to Step 8 until all four declarations contain specific content.**

---

### Step 8 — Open the Pull Request

```bash
python3 <<'EOF'
import urllib.request, os, json

OWNER = "REPLACE"
REPO = "REPLACE"
BRANCH_NAME = "REPLACE"  # use ACTIVE_BRANCH from Step 6
DEFAULT_BRANCH = "main"
NOTION_PAGE_ID = "REPLACE"
NOTION_PAGE_URL = f"https://notion.so/{NOTION_PAGE_ID.replace('-', '')}"
SKIPPED_FILES = []  # populate with any file paths skipped in Step 4
PLAN_PATH = "REPLACE"  # full path from Step 4.5
PLAN_LINK = f"Plan document: `{PLAN_PATH}`"

FIX_TITLE = "REPLACE with the Notion entry title"

# All variables below are required — never leave as REPLACE
FIX_SUMMARY = "REPLACE"          # 1-2 sentence plain English summary of the change
APPROACH_RATIONALE = "REPLACE"   # why this approach; alternatives considered and rejected
CHANGED_FILES_LIST = "REPLACE"   # bullet list: `path/to/file` — what changed and why
EDGE_CASES = "REPLACE"           # bullet list of edge cases and how each is handled; "None identified" only if genuinely true
UNCHANGED_SCOPE = "REPLACE"      # anything intentionally left alone and why

# Final guard: head must not equal base
if BRANCH_NAME == DEFAULT_BRANCH:
    print(f"STOP: head branch '{BRANCH_NAME}' equals base branch. Cannot open PR.")
    raise SystemExit(1)

def delete_branch(owner, repo, branch):
    """Best-effort branch cleanup. Does not raise on failure."""
    try:
        req = urllib.request.Request(
            f'https://api.github.com/repos/{owner}/{repo}/git/refs/heads/{branch}',
            method='DELETE'
        )
        req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
        req.add_header('Accept', 'application/vnd.github+json')
        req.add_header('X-GitHub-Api-Version', '2022-11-28')
        urllib.request.urlopen(req, timeout=15)
        print(f"Orphaned branch deleted: {branch}")
    except Exception as cleanup_err:
        print(f"WARNING: Could not delete branch {branch} — clean up manually.")
        print(f"  Manual link: https://github.com/{owner}/{repo}/branches")
        print(f"  Error: {cleanup_err}")

skipped_section = ""
if SKIPPED_FILES:
    skipped_list = "\n".join(f"- `{f}`" for f in SKIPPED_FILES)
    skipped_section = f"\n## Skipped Files\n\nThe following files were skipped (binary, non-UTF-8, or >1MB):\n\n{skipped_list}\n"

body = f"""## What this PR does

{FIX_SUMMARY}

## Why this approach

{APPROACH_RATIONALE}

## What I changed

{CHANGED_FILES_LIST}

## Edge cases considered

{EDGE_CASES}

## What I did NOT change (and why)

{UNCHANGED_SCOPE}

## Plan

{PLAN_LINK}

The plan document contains the full research findings, rationale, and diff reasoning. Read it for context on why this change was made.

## Self-review checklist

- [x] Change is scoped to the task only
- [x] No silent failures
- [x] Follows existing repo conventions
- [x] Tests added/updated if applicable
- [x] No secrets or sensitive data exposed

## Source

Notion task: {NOTION_PAGE_URL}{skipped_section}

---

> Opened via OpenClaw. Review the diff before merging — never auto-merged.
"""

data = json.dumps({
    "title": f"fix: {FIX_TITLE}",
    "body": body,
    "head": BRANCH_NAME,
    "base": DEFAULT_BRANCH
}).encode()

req = urllib.request.Request(
    f'https://api.github.com/repos/{OWNER}/{REPO}/pulls',
    data=data, method='POST'
)
req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
req.add_header('Accept', 'application/vnd.github+json')
req.add_header('Content-Type', 'application/json')
req.add_header('X-GitHub-Api-Version', '2022-11-28')

try:
    print("calling GitHub API...")
    pr = json.load(urllib.request.urlopen(req, timeout=15))
    pr_url = pr['html_url']
    print(f"PR OPENED: {pr_url}")
    print(f"PR_URL={pr_url}")
except urllib.error.HTTPError as e:
    print(f"STOP: PR creation failed ({e.code}): {e.read().decode()}")
    print(f"Deleting orphaned branch {BRANCH_NAME} ...")
    delete_branch(OWNER, REPO, BRANCH_NAME)
    raise SystemExit(1)
EOF
```

---

### Step 8.5 — Poll CI Status

After the PR is created, extract `pr['head']['sha']` from the Step 8 response and poll check-runs for up to 3 minutes (6 polls × 30 seconds):

```python
python3 <<'EOF'
import urllib.request, os, json, time

OWNER = "REPLACE"
REPO = "REPLACE"
HEAD_SHA = "REPLACE"  # pr['head']['sha'] from Step 8 response

def get_check_runs(owner, repo, sha):
    req = urllib.request.Request(
        f'https://api.github.com/repos/{owner}/{repo}/commits/{sha}/check-runs'
    )
    req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('X-GitHub-Api-Version', '2022-11-28')
    return json.load(urllib.request.urlopen(req, timeout=15))

CI_STATUS = "no-ci-detected"
CI_DETAILS = "No check-runs found within 3 minutes."

for attempt in range(6):
    try:
        data = get_check_runs(OWNER, REPO, HEAD_SHA)
        runs = data.get('check_runs', [])
        if not runs:
            print(f"Poll {attempt+1}/6: no check-runs yet. Waiting 30s...")
            time.sleep(30)
            continue
        # Summarize
        statuses = [r['status'] for r in runs]
        conclusions = [r['conclusion'] for r in runs if r['conclusion']]
        all_done = all(s == 'completed' for s in statuses)
        if all_done:
            failed = [r for r in runs if r['conclusion'] not in ('success', 'neutral', 'skipped', None)]
            if failed:
                CI_STATUS = "failed"
                CI_DETAILS = "; ".join(f"{r['name']}: {r['conclusion']}" for r in failed)
            else:
                CI_STATUS = "passed"
                CI_DETAILS = f"All {len(runs)} check(s) passed."
            break
        else:
            print(f"Poll {attempt+1}/6: {len(runs)} runs, not all complete. Waiting 30s...")
            time.sleep(30)
    except Exception as e:
        CI_STATUS = "check-error"
        CI_DETAILS = str(e)
        break
else:
    CI_STATUS = "timeout"
    CI_DETAILS = f"Checks still running after 3 minutes. Check GitHub for status."

print(f"CI_STATUS={CI_STATUS}")
print(f"CI_DETAILS={CI_DETAILS}")
EOF
```

Carry `CI_STATUS` and `CI_DETAILS` into Step 9 Notion feedback.

---

### Step 8.6 — Write Docs Summary (conditional)

**Only execute this step if `HAS_DOCS_DIR = True` (set in Phase A).**

If `docs/` does not exist in the repo root, skip this step entirely. Do not create a `docs/` directory — adding one to a repo that has none is out of scope.

If `docs/` exists, write a stripped-down change summary to the branch using the same PUT `/contents` endpoint from Step 7:

- **Path:** `docs/koda/{slug}.md` (same slug as the branch)
- **Branch:** `ACTIVE_BRANCH`
- **Commit message:** `docs: add change summary for {slug}`

**Content template:**

```markdown
# Change Summary: {notion entry title}

*Generated by Koda — {ISO-8601 date}*

## What Changed

{2-3 sentences: which files changed and what was modified}

## Why

{Why this approach was chosen over alternatives}

## Edge Cases

{Concrete failure modes handled, or "None identified"}

## Out of Scope

{What was intentionally not changed and why}

## References

- PR: {PR_URL}
- Notion: {NOTION_PAGE_URL}
- Plan document: `{PLAN_PATH}`
```

This file requires no SHA (it is new). Use `FILE_SHA = ""` and omit the `sha` field from the PUT body when creating a new file.

---

### Step 9 — Update the Notion Entry

Mark the entry "PR Opened", record the PR URL, and write a Feedback summary. Use the page_id from Step 2.

```python
python3 <<'EOF'
import urllib.request, os, json

PAGE_ID = "REPLACE"
PR_URL = "REPLACE"  # use PR_URL from Step 8
PLAN_PATH = "REPLACE"  # full path from Step 4.5
CI_STATUS = "REPLACE"  # from Step 8.5: passed | failed | no-ci-detected | timeout | check-error
CI_DETAILS = "REPLACE"  # from Step 8.5

WHAT_WAS_DONE = "REPLACE"           # factual summary of files changed and what changed
WHY_THIS_APPROACH = "REPLACE"       # rationale; mention alternatives considered
EDGE_CASES_FOUND = "REPLACE"        # edge cases found and how each is handled; "None identified" only if genuinely true
QUESTIONS_OR_BLOCKERS = "REPLACE"   # open questions or blockers; "None" if clear
PHASES_COMPLETED = "REPLACE"        # e.g. "A (research), B (plan), C (implement), D (self-review)"

feedback_text = (
    f"Phases: {PHASES_COMPLETED}. "
    f"Done: {WHAT_WAS_DONE} "
    f"Approach: {WHY_THIS_APPROACH} "
    f"Edge cases: {EDGE_CASES_FOUND} "
    f"Questions: {QUESTIONS_OR_BLOCKERS} "
    f"Plan: {PLAN_PATH} "
    f"CI: {CI_STATUS}. Details: {CI_DETAILS}"
)

def to_rich_text(text):
    """Chunk into 2000-char objects (Notion API limit per text object)."""
    chunks = [text[i:i+2000] for i in range(0, len(text), 2000)]
    return [{"text": {"content": chunk}} for chunk in chunks]

data = json.dumps({
    "properties": {
        "Status": {"select": {"name": "PR Opened"}},
        "PR URL": {"url": PR_URL},
        "Feedback": {"rich_text": to_rich_text(feedback_text)}
    }
}).encode()

req = urllib.request.Request(
    f'https://api.notion.com/v1/pages/{PAGE_ID}',
    data=data, method='PATCH'
)
req.add_header('Authorization', f'Bearer {os.environ["NOTION_API_KEY"]}')
req.add_header('Content-Type', 'application/json')
req.add_header('Notion-Version', '2022-06-28')

try:
    print("calling Notion API...")
    result = json.load(urllib.request.urlopen(req, timeout=15))
    print(f"Notion updated: {result['id']}")
    print(f"  Status: PR Opened | PR URL: {PR_URL}")
    print(f"  Feedback written ({len(feedback_text)} chars)")
except urllib.error.HTTPError as e:
    print(f"WARNING: Notion update failed ({e.code}): {e.read().decode()}")
    print(f"Manual recovery: page_id={PAGE_ID} | PR URL={PR_URL}")
    print(f"Feedback content: {feedback_text}")
EOF
```

**What to write in Feedback:** factual summary of what changed and in which files, rationale for the chosen approach (mention alternatives), edge cases found, any open questions or blockers, which phases completed. Do not duplicate the PR body verbatim — Feedback is Notion-level context for you, not GitHub documentation. **Never write to `Description`.**

**After PATCH Notion to "PR Opened", finalize PLAN.md frontmatter:**

```python
python3 <<'EOF'
import re, datetime

PLAN_PATH = "REPLACE"  # full path from Step 2.6 / Step 4.5

with open(PLAN_PATH) as f:
    content = f.read()

now = datetime.datetime.utcnow().isoformat() + 'Z'
content = re.sub(r'^status: implementing$', 'status: done', content, flags=re.MULTILINE)
content = re.sub(r'^implementation_session_completed_at: ~$',
                 f'implementation_session_completed_at: {now}', content, flags=re.MULTILINE)

with open(PLAN_PATH, 'w') as f:
    f.write(content)

print(f"PLAN.md finalized: status=done, implementation_session_completed_at={now}")
EOF
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Repo not found (404) | Update Notion status to "Error", add note, stop |
| Repo forbidden (403) | Update Notion status to "Error", add note, stop |
| Branch already exists (409) | Retry with `{YYYYMMDD_HHMMSS}` suffix; if second attempt also 409, stop and print manual cleanup link |
| Stale SHA (409 on PUT /contents) | Delete branch, abort entry, report file and branch name |
| PR creation failure | Delete orphaned branch, do not create PR, print branch name for manual inspection |
| Rate limit below 100 | Stop before any write operation, report reset time |
| Binary or non-UTF-8 file | Skip that file, note it in the PR body under "Skipped Files" |
| File over 1MB | Skip that file, note it in the PR body under "Skipped Files" |
| Empty Repo field | Skip that entry, print page_id; do not make any GitHub call |
| Full GitHub URL in Repo field | Auto-parse `owner/repo` from URL path; no user action needed |
| Notion update fails (Step 9) | Print PR URL and page_id for manual fix; do not undo the PR |
| Head equals base | Stop before branch creation; do not attempt to create the branch |
| Fix description is too vague | Create branch, open PR with clarifying question in body, mark Notion "PR Opened" |
| Multiple databases match search | List them all, ask user to confirm which one to use |
| Context >= threshold after a phase | Write handoff, add resume task to HEARTBEAT.md, stop |
| "Research Complete" but RESEARCH.md not found | Reset to "Ready", log anomaly, stop |
| "Planning Complete" but PLAN.md not found | Reset to "Ready", log anomaly, stop |
| PLAN.md has no actual diff (prose only) | Reset to "Ready", delete PLAN.md and RESEARCH.md for this entry, stop |
| PLAN.md page_id doesn't match Notion page_id | Stop, log both IDs, do not implement |
| "Coding" but branch doesn't exist on GitHub | Re-create branch from PLAN.md branch field, resume from Step 7 |
| Context >= 60% at Session 3 start | Reset to "Ready", log reason (plan too large), stop |
| RESEARCH.md frontmatter status = "complete" but session = "research" still set in PLAN.md | Treat as Planning Complete, proceed normally |

---

## Notion Database Schema Requirements

The target database is **OpenClaw** (`database_id: 2ffcd9598000412f8b21e8d6fa4533c7`).

| Field | Type | Permission |
|-------|------|------------|
| Name | title | Read |
| Repo | text (rich_text) | Read |
| Status | select | Write |
| Description | text (rich_text) | **Read-only. Never write.** |
| Feedback | text (rich_text) | Write |
| PR URL | url | Write |
| Branch | rich_text | Write |

**Field permissions summary:**
- Read: Name, Repo, Description
- Write: Status, Feedback, PR URL, Branch
- Never write: Description

Status values: **Ready** | **Researching** | **Research Complete** | **Planning** | **Planning Complete** | **Coding** | **PR Opened** | **Done** | **Error**

Transition sequence: `Ready → Researching → Research Complete → Planning → Planning Complete → Coding → PR Opened`

Legacy `In Progress` entries: handled by existing resume logic until they complete naturally. New entries never use "In Progress".

**Note:** These select options must exist in the Notion database. Add `Researching`, `Research Complete`, `Planning`, `Planning Complete`, and `Coding` manually via the Notion UI if not already present.

---

## Memory

The OpenClaw database ID is fixed — save this on first use:

```
notion_openclaw_database_id: 2ffcd9598000412f8b21e8d6fa4533c7
notion_openclaw_confirmed_by_user: true
```

On every subsequent run, skip Step 1 entirely and use `DATABASE_ID = "2ffcd9598000412f8b21e8d6fa4533c7"` directly in Step 2.

---

## Verification Checklist

After each run, confirm:

- [ ] Step 0 preflight passed (rate limit >= 100) before any writes
- [ ] Notion entry was "Ready" before run, "PR Opened" after
- [ ] A `koda/fix/*` branch exists in the GitHub repo
- [ ] PR targets `main` (or the repo's default branch), not a feature branch
- [ ] PR body contains all sections: What, Why, Changed Files, Edge Cases, Unchanged Scope, Checklist, Source
- [ ] `main` branch is untouched — no direct commits
- [ ] No PR was merged
- [ ] No orphaned branches exist (check repo's branch list if any step failed)
- [ ] If any files were skipped (binary/large), they are listed in the PR body
- [ ] `Description` field unchanged after run — it is read-only
- [ ] `Feedback` field populated with: what was done, approach rationale, edge cases, questions
- [ ] Session 1 stopped after writing RESEARCH.md — did NOT write PLAN.md or create a branch
- [ ] Session 2 read RESEARCH.md and made no GitHub API calls — used SHAs from research file
- [ ] Session 2 stopped after writing PLAN.md — did NOT create a branch
- [ ] Session 3 context was below 60% threshold before creating the branch
- [ ] Session 3 validated plan before any GitHub write — did NOT re-research
- [ ] Notion status sequence: Ready → Researching → Research Complete → Planning → Planning Complete → Coding → PR Opened

---

## What This Skill Does Not Do

- Auto-merge PRs
- Integrate with CI/CD
- Handle multi-repo changes atomically
- Push to the remote (uses direct GitHub API; no `gh` CLI required)
- Run tests before proposing

---

## Handoff Protocol

Execute this protocol whenever a context check fires (`estimated_tokens >= HANDOFF_THRESHOLD_TOKENS`). Do not skip steps or proceed to the next phase after triggering this protocol.

### Writing a Handoff

1. **Filename:** `{YYYY-MM-DD_HH-MM-SS}_pr-proposer-handoff.md` (UTC timestamp)
2. **Path:** `/Users/isaiahrivera/.openclaw/thoughts/shared/handoffs/general/`
3. **File structure:**

```
---
date: {ISO-8601}
researcher: koda
topic: "PR Proposer Handoff — {entry title}"
tags: [pr-proposer, handoff, {owner}, {repo}]
status: in_progress
type: handoff
---

# Handoff: PR Proposer — {entry title}

## Task Summary
Goal: {entry title}
Notion page_id: {page_id}
Repo: {owner/repo}
Phase just completed: Phase {A/B/C}
Resume from: Phase {next phase}

## Critical References
- Notion page_id: {page_id}
- Target repo: {owner/repo}
- Branch: {ACTIVE_BRANCH or "not yet created"}
- Default branch: {default_branch}

## Research Findings (Phase A)
{Full written output from Phase A. Leave empty if not yet completed.}

### File SHAs
{path/to/file: sha={sha} size={bytes} — one line per file read}

## Plan (Phase B)
{Full written plan. Leave empty if not yet completed.}

## Implementation Status (Phase C)
Files committed: {path — committed to {branch}}
Files pending: {path — not yet committed}

## Learnings
{Anything unusual not captured above.}

## Action Items
- [ ] Resume from Phase {X}

## Resume Instructions
1. Use the github-pr-proposer skill — resume from handoff at {full path}
2. Skip phases already completed
3. Use SHAs from "File SHAs" — only re-read if SHA is missing
4. Use ACTIVE_BRANCH from above — do not create a new branch
5. Reset CONTEXT_CHARS = 0 (fresh context window)
6. Pick up from Phase {next phase}
```

4. **Write a resume task to HEARTBEAT.md:**

```python
python3 <<'EOF'
import os, datetime

heartbeat_path = os.path.expanduser("~/.openclaw/workspace/HEARTBEAT.md")
handoff_path = "REPLACE_WITH_FULL_HANDOFF_PATH"

resume_task = (
    f"\n## PR Proposer Resume (added {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')})\n"
    f"A PR proposer run was paused due to context limits. Resume it:\n"
    f"- Use the github-pr-proposer skill — resume from handoff at {handoff_path}\n"
    f"- Once resumed and completed, remove this section from HEARTBEAT.md\n"
)

with open(heartbeat_path, 'a') as f:
    f.write(resume_task)

print(f"Resume task added to HEARTBEAT.md")
print(f"Next heartbeat will auto-resume the run.")
EOF
```

5. Print: `HANDOFF WRITTEN. Next heartbeat will resume from: {handoff_path}`
6. **Stop. Do not proceed to the next phase.**

### Resuming from a Handoff

When invoked with "resume from handoff at [path]":

1. Read the handoff file
2. Extract: `page_id`, `repo`, `owner`, `default_branch`, `ACTIVE_BRANCH`, all file SHAs, plan, phase just completed
3. Determine next phase from "Resume from"
4. Skip all completed phases
5. Use SHAs from handoff; only re-read a file if SHA is absent
6. Use `ACTIVE_BRANCH`; never create a new branch if one exists in the handoff
7. Reset `CONTEXT_CHARS = 0`
8. Remove the resume task from `HEARTBEAT.md` once the run completes successfully

**Guard:** If `ACTIVE_BRANCH` is in handoff but Phase C shows no commits, verify branch still exists: `GET /repos/{owner}/{repo}/git/ref/heads/{branch}`. If 404, create a fresh branch with the same slug.
