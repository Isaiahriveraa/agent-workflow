---
name: github-pr-proposer
description: |
  Reads fix entries from a Notion database, reads the target GitHub repo (read-only),
  and proposes changes as pull requests. Never writes to main — only creates
  koda/fix/* feature branches and opens PRs for human review.
  Triggered manually or from a Heartbeat check.
metadata:
  author: koda
  version: "1.4"
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
    # Guard: skip entries with empty Repo field
    if not repo:
        print(f"SKIP page_id={page['id']} : Repo field is empty")
        continue
    print(f"page_id={page['id']}  title={title!r}  repo={repo!r}")
EOF
```

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

---

### Step 5 — Plan the Change

#### Phase B — Plan

Before writing anything, explicitly reason through each of the following. This reasoning must be written out — do not skip any item.

1. **What file(s) change?** List every file that will be modified.
2. **What is the exact diff?** Write it out line by line — old lines and new lines.
3. **At least one alternative approach.** What else could solve this? Why is the chosen approach better?
4. **Edge cases.** What inputs or states could break this change? How is each handled?
5. **Scope check.** Is the description specific enough to make a safe, scoped change?

If the description is too vague to produce a safe diff, still create the branch and PR — but put your question in the PR body rather than making a speculative change. A PR with no code change but a clear question is better than a wrong change.

**Do not proceed to Step 6 until the plan is written and each item above is answered.**

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

Mark the entry "PR Opened" and record the PR URL. Use the page_id from Step 2.

The URL property below assumes a field named "PR URL" of type `url`. Adjust property names to match your actual database schema.

```bash
python <<'EOF'
import urllib.request, os, json

PAGE_ID = "REPLACE"
PR_URL = "REPLACE"  # use PR_URL from Step 8

data = json.dumps({
    "properties": {
        "Status": {"select": {"name": "PR Opened"}},
        "PR URL": {"url": PR_URL}
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
    print(f"Notion entry updated: {result['id']}")
except urllib.error.HTTPError as e:
    # The PR already exists — this is best-effort. Do not undo the PR.
    print(f"WARNING: Notion update failed ({e.code}): {e.read().decode()}")
    print(f"Manual recovery needed:")
    print(f"  Notion page_id: {PAGE_ID}")
    print(f"  PR URL: {PR_URL}")
    print(f"  Set Status → 'PR Opened' and paste the PR URL manually.")
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

---

## Notion Database Schema Requirements

The target database is **OpenClaw** (`database_id: 2ffcd9598000412f8b21e8d6fa4533c7`).

| Field | Type | Notes |
|-------|------|-------|
| Name | title | The fix description |
| Repo | text (rich_text) | e.g. `isaiahrivera/my-project` or full GitHub URL |
| Status | select | Options: Ready, In Progress, PR Opened, Done, Error |
| Description | text (rich_text) | Optional extended description of the fix |

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

---

## What This Skill Does Not Do

- Auto-merge PRs
- Integrate with CI/CD
- Handle multi-repo changes atomically
- Push to the remote (uses direct GitHub API; no `gh` CLI required)
- Run tests before proposing
