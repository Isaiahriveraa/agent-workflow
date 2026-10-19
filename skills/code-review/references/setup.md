# Review Setup

Read from `../SKILL.md` for every mode before selecting a runner. Paths to helpers and templates are relative to the skill root, not this reference directory.

### Step 1: Resolve Scope

Determine the repository root and default branch using repository-native Git commands.

Use the bundled helper for scope resolution:
```bash
node "${SKILL_DIR}/_helpers/review-range.mjs" "<scope-spec>"
```

The helper resolves the scope and ALSO writes the following files to `.git/`:
- `.git/code-review.patch` — diff with -U20 context (or -U10 if patch >~1MB)
- `.git/code-review.changed-files` — one file path per line
- `.git/code-review.baseline.txt` — empty (populated in Step 2)
- `.git/code-review.context.txt` — empty (populated in Step 2)

Read the helper output to confirm the resolved scope.

Scope-to-patchname mapping (the helper handles this):
| Input | Patch source |
|---|---|
| empty | merge-base of current branch and default branch through `HEAD` |
| `working` | `git diff` |
| `staged` | `git diff --cached` |
| `modified` | `git diff HEAD` |
| `commit` | `git show HEAD` |
| hash | that commit, including its own changes |
| `A..B` | explicit range |
| branch | checked-out branch versus default branch |

If no files changed, print:
```text
No changes in the selected review scope.
```
Then stop.

### Step 2: Gather Minimal Context

Write `.git/code-review.context.txt` containing only:
```text
review scope
changed-file list
directly relevant repository rules from AGENTS.md or local guidance
task acceptance criteria, when explicitly available
commands used for baseline checks
```

Do not include:
- implementation reasoning
- a completion summary
- explanations of design choices
- previous assistant messages about the implementation
- reviewer findings
- proposed fixes
- statements that the code is probably correct

#### Baseline Checks

Detect existing project commands from repository configuration. Do not invent a new toolchain.

Run the cheapest relevant checks in this order:
1. parser, formatter, or format check
2. compiler or type checker
3. tests directly associated with changed code
4. linter
5. broader tests only when repository guidance or change scope justifies them

Record each command, exit status, and concise failure output in `.git/code-review.baseline.txt`.

A failing command is evidence, but not automatically a review finding. The review must establish that the selected diff caused or exposed the failure.
