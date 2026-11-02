---
type: llm
focus: trace
weight: 1
---

The worker directly edits the fixture without seeking per-test proposals or approval, removes redundant ID and obsolete class constraints, and reports Keep / Rewrite / Delete retrospectively. The production renderer stays unchanged. Surviving tests pass when the test ID is removed, attributes are reordered, or obsolete classes return; they fail for a wrong supplied title, wrong destination, missing resource, or loss of link semantics. The report names preserved guarantees and any blocked coverage uncertainty instead of using green alone as evidence.
