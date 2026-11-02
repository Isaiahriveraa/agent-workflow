# Test cleanup without losing guarantees

Use this procedure for tests inside the selected diff, including tests added by
the hardener. Follow required caller/test updates, not a repository-wide sweep.
Only an authorized writer edits. In an authorized cleanup run, code-judgment and
complexity-reviser directly clean the selected tests without per-test proposals or
approval. The user's explicit automatic-cleanup authorization covers scoped test
and assertion removal; it is not standing permission outside that scope. Explicit
read-only, proposal-only, `--review-only`, `--no-revise`, and implementation ownership
restrictions still apply. Reviewers remain independent and read-only; when the main
agent owns the files, it performs the authorized cleanup itself.

Activate automatic mode when the user explicitly requests automatic test cleanup
for a selected diff or named test scope. Pass that authorization and the resolved
scope to the writer; neither selecting a finding nor `--fix` alone grants it.
Do not request a separate proposal or approval for each test inside that scope.

## Keep tests coupled to behavior

Exercise user interactions, observable outcomes, and meaningful public contracts
through the interface callers use. Prefer accessible roles, names, labels, keyboard
behavior, and ARIA state for UI tests. Avoid pins on CSS tokens, internal state,
private helpers, helper call order, or exact production copy unless an explicit
contract makes that detail meaningful. Exact fixture strings can prove supplied
data renders unchanged; structural accessibility assertions can prove semantics.
Do not replace one implementation pin with another or copy production logic into
test expectations. A behavior-preserving implementation refactor should stay green.

For each candidate, name the product guarantee and a plausible defect it catches.
Ask both questions: would a behavior-preserving refactor keep it green, and would
a plausible behavioral defect make it fail? Inspect the implementation, callers,
acceptance criteria, and surviving coverage rather than judging assertion syntax.

Determine a disposition from file/test evidence, apply safe cleanup directly, then
report **Keep / Rewrite / Delete** retrospectively, not as an approval checklist:

| Disposition | Evidence required |
|---|---|
| **Keep** | A distinct observable guarantee, or uncertainty about losing one. Name the defect it catches. |
| **Rewrite** | A real guarantee is pinned to an incidental detail. Name the lost guarantee and the replacement test, boundary, and defect it must catch. Keep the old protection until the replacement runs and proves that guarantee. |
| **Delete** | No distinct guarantee is lost: show the assertion is tautological, checks an obsolete implementation detail, or duplicates named surviving coverage at equivalent strength. State explicitly what is lost, even when it is only an obsolete constraint. |

A query for `resource-academic` followed by an assertion of that identical test ID
adds no guarantee beyond the successful query. Remove only the redundant assertion;
keep the query if its presence check still serves a requirement. Absence checks for
obsolete `.card--open` or `.card-content` tokens can be deleted when no migration or
compatibility contract requires them. No deletion quota: keeping everything may be
correct when every test protects a distinct guarantee.

Do not classify all text, markup, classes, styles, or snapshots as disposable.
Exact fixture text can prove data renders unchanged; accessible names, label/control
relationships, roles, keyboard behavior, and ARIA state are observable contracts.
A class/position assertion may be the only weak protection for real geometry.
Rewrite it as browser coverage for overlap, alignment, or hit targets where needed;
without runnable equivalent coverage, **Keep** it and report the gap. Do not swap a
geometry guarantee for a visibility or click assertion that cannot catch displacement.

Before removing protection, establish the lost guarantee or named equivalent
surviving/replacement coverage. The retrospective report records that evidence and
checks actually run. Do not pause for a per-test proposal or deletion approval when
the selected automatic cleanup is already authorized. Without that authorization,
leave proposed deletions intact pending the user's task-scoped deletion approval
and the writer's implementation authorization. Parent acceptance cannot replace
the user's deletion approval. Report the pending proposal, not an applied deletion.
Keep and report blocked when unique
coverage is uncertain or no safe equivalent replacement can run. Product behavior
changes, unrelated architecture revisions, security-sensitive actions, destructive
Git operations, and new dependencies retain their existing gates. Never delete,
skip, weaken, or loosen a test to conceal a failure, remove a reproduced bug, or
claim a green baseline.

Run baseline checks before cleanup and affected checks afterward. For rewrites,
demonstrate the replacement survives an equivalent refactor and detects the named
defect (a controlled mutation or recorded reproduction when practical). Report
what ran and any limits; green alone does not prove equivalent protection. Preserve
unrelated user changes and existing failures; undo only your own failing batch.
