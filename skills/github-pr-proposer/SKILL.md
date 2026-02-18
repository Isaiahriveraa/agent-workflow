---
name: github-pr-proposer
description: |
  Reads fix entries from a Notion database, reads the target GitHub repo (read-only),
  and proposes changes as pull requests. Never writes to main — only creates
  koda/fix/* feature branches and opens PRs for human review.
  Triggered manually or from a Heartbeat check.
metadata:
  author: koda
  version: "1.5"
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
python <<'EOF'
import urllib.request, os, json, datetime

req = urllib.request.Request('https://api.github.com/rate_limit')
req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
req.add_header('Accept', 'application/vnd.github+json')
req.add_header('X-GitHub-Api-Version', '2022-11-28')

try:
    data = json.load(urllib.request.urlopen(req, timeout=30))
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
python <<'EOF'
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

### Step 2 — Query for Ready Entries

Fetch entries with status "Ready" (skip "PR Opened", "Done", "In Progress", "Error").

```bash
python <<'EOF'
import urllib.request, os, json

DATABASE_ID = "2ffcd9598000412f8b21e8d6fa4533c7"

data = json.dumps({
    "filter": {
        "property": "Status",
        "select": {"equals": "Ready"}
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

results = json.load(urllib.request.urlopen(req, timeout=30))
pages = results.get('results', [])

print(f"Found {len(pages)} entries with status 'Ready'")

if not pages:
    print("Nothing to do.")
    raise SystemExit(0)

for page in pages:
    props = page.get('properties', {})
    # Extract title (the fix description)
    title_prop = props.get('Name') or props.get('Title') or {}
    title_parts = title_prop.get('title', [])
    title = ''.join(p.get('plain_text', '') for p in title_parts)
    # Extract and normalize repo field
    repo_prop = props.get('Repo', {})
    repo = ''
    if 'rich_text' in repo_prop:
        repo = ''.join(p.get('plain_text', '') for p in repo_prop['rich_text']).strip()
    elif 'select' in repo_prop and repo_prop['select']:
        repo = repo_prop['select']['name'].strip()
    # Normalize full GitHub URLs to owner/repo
    if repo.startswith('https://github.com/'):
        parts = repo.replace('https://github.com/', '').strip('/').split('/')
        repo = '/'.join(parts[:2]) if len(parts) >= 2 else ''
    # Extract Description — READ-ONLY, never written back
    description_prop = props.get('Description', {})
    description = ''.join(
        p.get('plain_text', '')
        for p in description_prop.get('rich_text', [])
    ).strip()

    if description:
        print(f"  description={description!r}")

    # Guard: skip entries with empty Repo field
    if not repo:
        print(f"SKIP page_id={page['id']} : Repo field is empty")
        continue
    print(f"page_id={page['id']}  title={title!r}  repo={repo!r}")
EOF
```

**Forward per entry: `page_id`, `title`, `repo`, `description`**

If `description` is non-empty, treat it as additional task context in Phase B. Quote it explicitly in the plan under "Additional context from Notion Description".

**Never write to `Description`. It is read-only.**

Process entries one at a time. Do not start the next entry until the current one is fully complete or explicitly abandoned. page_size is 10 — if you have more than 10 "Not started" entries, only the 10 oldest are returned per run.

---

### Step 3 — Identify the Repository

Parse `owner/repo` from the Notion entry's Repo field. If only a bare repo name is present (no `/`), fetch the authenticated GitHub username and prepend it.

```bash
python <<'EOF'
import urllib.request, os, json

req = urllib.request.Request('https://api.github.com/user')
req.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
req.add_header('Accept', 'application/vnd.github+json')
req.add_header('X-GitHub-Api-Version', '2022-11-28')

user = json.load(urllib.request.urlopen(req))
print(f"github_username={user['login']}")
EOF
```

Compose the full `owner/repo`. Then verify it exists and is accessible:

```bash
python <<'EOF'
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
    repo = json.load(urllib.request.urlopen(req))
    print(f"default_branch={repo['default_branch']}  private={repo['private']}")
except urllib.error.HTTPError as e:
    print(f"ERROR {e.code}: {e.read().decode()}")
    # Stop here if 404 or 403 — do not proceed
EOF
```

If the repo is inaccessible (404, 403), update the Notion entry status to "Error" and stop.

---

### Step 4 — Research the Codebase (Read-Only)

This step has four required phases. Do not proceed to Step 5 until all four phases are complete.

#### Phase A — Research

1. Read the repository root listing to understand the project structure.

```bash
python <<'EOF'
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

contents = json.load(urllib.request.urlopen(req))
for item in contents:
    print(f"{item['type']:6}  {item['name']}")
EOF
```

2. Check for test directories (`tests/`, `__tests__/`, `spec/`, files matching `*.test.*` or `*.spec.*`). Note whether TDD is expected.

3. Read files directly relevant to the task (follow imports if needed). Content is Base64-encoded:

```bash
python <<'EOF'
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

file_data = json.load(urllib.request.urlopen(req, timeout=30))

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
If below threshold: proceed to Step 5.

---

### Step 5 — Plan the Change

#### Phase B — Plan

Before writing anything, explicitly reason through each of the following. This reasoning must be written out — do not skip any item.

1. **What file(s) change?** List every file that will be modified.
2. **What is the exact diff?** Write it out line by line — old lines and new lines.
3. **At least one alternative approach.** What else could solve this? Why is the chosen approach better?
4. **Edge cases.** What inputs or states could break this change? How is each handled?
5. **Scope check.** Is the description specific enough to make a safe, scoped change?
6. **Additional context from Notion Description.** If `description` is non-empty, quote it here and state explicitly how it changed or confirmed the approach. If it conflicts with the entry title, flag the conflict in the PR body.

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
python <<'EOF'
import urllib.request, os, json, datetime

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

ref_data = json.load(urllib.request.urlopen(req, timeout=30))
head_sha = ref_data['object']['sha']
print(f"head_sha={head_sha}")

def create_branch(name, sha):
    data = json.dumps({
        "ref": f"refs/heads/{name}",
        "sha": sha
    }).encode()
    req2 = urllib.request.Request(
        f'https://api.github.com/repos/{OWNER}/{REPO}/git/refs',
        data=data, method='POST'
    )
    req2.add_header('Authorization', f'Bearer {os.environ["GITHUB_TOKEN"]}')
    req2.add_header('Accept', 'application/vnd.github+json')
    req2.add_header('Content-Type', 'application/json')
    req2.add_header('X-GitHub-Api-Version', '2022-11-28')
    return urllib.request.urlopen(req2, timeout=30)

ACTIVE_BRANCH = BRANCH_NAME
try:
    result = json.load(create_branch(ACTIVE_BRANCH, head_sha))
    print(f"branch created: {result['ref']}")
except urllib.error.HTTPError as e:
    if e.code == 409:
        # Retry with timestamp suffix to avoid same-second collision
        ts = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        ACTIVE_BRANCH = f"{BRANCH_NAME}-{ts}"
        print(f"Branch exists (409). Retrying with suffix: {ACTIVE_BRANCH}")
        try:
            result = json.load(create_branch(ACTIVE_BRANCH, head_sha))
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

If the repo has a test directory (identified in Phase A), write tests first before modifying the implementation. Follow the naming conventions and patterns observed in Phase A research.

Write the modified file to the new branch. Content must be Base64-encoded. The `sha` is from Step 4.

```bash
python <<'EOF'
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
        urllib.request.urlopen(req, timeout=30)
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
    result = json.load(urllib.request.urlopen(req, timeout=30))
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

**Context Check — Phase C boundary**
Evaluate: `estimated_tokens = (CONTEXT_CHARS / 4) + 2000`
If `>= HANDOFF_THRESHOLD_TOKENS`: execute the Handoff Protocol. Record in the handoff that the branch and commits exist so the resume path skips Steps 6 and 7.
If below threshold: proceed to Step 7.5.

---

### Step 7.5 — Self-Review (Phase D)

Before opening the PR, verify every item in this checklist. If any item fails, fix it before proceeding to Step 8.

- [ ] Change does exactly what the task asked — nothing more, nothing less
- [ ] No security issues (injections, exposed secrets, unvalidated input at boundaries)
- [ ] Input is validated at the boundary if applicable
- [ ] Error handling is explicit — no silent failures
- [ ] Implementation follows the patterns found in Phase A research
- [ ] Tests added or updated if the repo has a test structure
- [ ] No hardcoded secrets or environment-specific values

**Do not proceed to Step 8 until all items pass.**

---

### Step 8 — Open the Pull Request

```bash
python <<'EOF'
import urllib.request, os, json

OWNER = "REPLACE"
REPO = "REPLACE"
BRANCH_NAME = "REPLACE"  # use ACTIVE_BRANCH from Step 6
DEFAULT_BRANCH = "main"
NOTION_PAGE_ID = "REPLACE"
NOTION_PAGE_URL = f"https://notion.so/{NOTION_PAGE_ID.replace('-', '')}"
SKIPPED_FILES = []  # populate with any file paths skipped in Step 4

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
        urllib.request.urlopen(req, timeout=30)
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

## Self-review checklist

- [x] Change is scoped to the task only
- [x] No silent failures
- [x] Follows existing repo conventions
- [x] Tests added/updated if applicable
- [x] No secrets or sensitive data exposed

## Source

Notion task: {NOTION_PAGE_URL}{skipped_section}

---

> Proposed by Koda. Review the diff before merging. Koda never merges PRs.
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
    pr = json.load(urllib.request.urlopen(req, timeout=30))
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

### Step 9 — Update the Notion Entry

Mark the entry "PR Opened", record the PR URL, and write a Feedback summary. Use the page_id from Step 2.

```python
python <<'EOF'
import urllib.request, os, json

PAGE_ID = "REPLACE"
PR_URL = "REPLACE"  # use PR_URL from Step 8

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
    f"Questions: {QUESTIONS_OR_BLOCKERS}"
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
    result = json.load(urllib.request.urlopen(req, timeout=30))
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

**Field permissions summary:**
- Read: Name, Repo, Description
- Write: Status, Feedback, PR URL
- Never write: Description

Status values Koda processes: **Ready** only. Skips: In Progress, PR Opened, Done, Error.

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
python <<'EOF'
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
