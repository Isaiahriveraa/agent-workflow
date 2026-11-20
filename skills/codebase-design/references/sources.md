# Sources and interpretation

These are practitioner models for judgment, not experimentally proven universal laws. The skill's five-step loop and backend checklist are a local synthesis. The Ousterhout references below use the book's chapters. The other entries draw on papers, author talks and essays, and publisher material. Do not attribute our entire workflow to any one author.

| Source | What it supports | Limit or local interpretation |
|---|---|---|
| John Ousterhout, *A Philosophy of Software Design*; Stanford lectures on [complexity](https://web.stanford.edu/~ouster/cgi-bin/cs190-winter18/lecture.php?topic=complexity), [module design](https://web.stanford.edu/~ouster/cgi-bin/cs190-winter18/lecture.php?topic=modularDesign), and [exceptions](https://web.stanford.edu/~ouster/cgi-bin/cs190-winter18/lecture.php?topic=exceptions) | Change amplification, cognitive load, unknown unknowns; deep modules, information hiding, comparing designs, reducing caller burden | We evaluate depth as knowledge hidden, not a code-size ratio. Simplifying ordinary cases does not authorize concealing real failures. |
| David Parnas, [On the Criteria To Be Used in Decomposing Systems into Modules](https://wstomv.win.tue.nl/edu/2ip30/references/criteria_for_modularization.pdf) | Organize modules around difficult or likely-to-change decisions, rather than processing steps | Applying the criterion to backend ownership and schema design is our synthesis, not a database recipe from the paper. |
| Sandi Metz, [The Wrong Abstraction](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction); [*99 Bottles of OOP* sample](https://sandimetz.com/99bottles-sample-js) | Prefer understandable duplication over the wrong abstraction; let real variation inform design | Rule of Three is a heuristic for extracting repeated behavior, not a ban on a first-use boundary with a present purpose. |
| Kent Beck's simple-design rules, [explained by Martin Fowler](https://martinfowler.com/bliki/BeckDesignRules.html) | Tests and expressed intent matter alongside duplication and element count | These goals require judgment; fewer methods or classes do not automatically mean simpler design. |
| Martin Fowler, [Preparatory Refactoring](https://martinfowler.com/articles/preparatory-refactoring-example.html) | Make a difficult change easier through a targeted behavior-preserving refactor | Not permission for an unrelated redesign before every feature. |
| Michael Feathers, *Working Effectively with Legacy Code*, [publisher excerpt on seams](https://www.informit.com/articles/article.aspx?p=359417&seqNum=2) | Seams enable altering behavior without editing at that point; safe legacy change and characterization | Our use includes testing/isolation with one production adapter; no two-adapter gate follows from the definition. |
| Eric Evans, [Domain-Driven Design resources](https://www.domainlanguage.com/ddd/) | Business meaning, invariants, and ownership | Use the modeling questions without imposing a full DDD architecture on CRUD. |
| Martin Kleppmann, [*Designing Data-Intensive Applications*](https://dataintensive.net/); [testing isolation](https://martin.kleppmann.com/2014/11/25/hermitage-testing-the-i-in-acid.html) | Data guarantees and isolation must match the actual invariant and be tested against real behavior | Not every application is distributed; concurrency and failure questions are risk-triggered. |
| Martin Fowler and Pramod Sadalage, [Evolutionary Database Design](https://martinfowler.com/articles/evodb.html); Scott Ambler and Pramod Sadalage, [*Refactoring Databases*](https://scottambler.com/refactoring-databases/) | Incremental schema/data evolution, migrations, compatibility, and verification | *Refactoring Databases* is by Ambler and Sadalage, not Fowler. Our rollout/recovery checklist combines this guidance with the task's operational risks. |
| Alistair Cockburn, [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) | Isolate application behavior from external technologies through ports and adapters | Optional integration lens, not a required folder structure or an interface around everything. |

## Ousterhout chapter guide

| Guidance | Chapters and sections |
| --- | --- |
| [Software Design](../../../references/software-design.md) | Chs. 1–3 on complexity and strategic work; chs. 16–18 on improving existing code, consistency, and obvious code. §1.1 treats red flags as signs to investigate, with exceptions. |
| [Information hiding](information-hiding.md) | §§5.1–5.3 on hiding, leakage, and splitting by execution order; chs. 7 and 9 on layers and when to combine code; §13.7 on documenting cross-module decisions. |
| [Interface design](interface-design.md) | Chs. 4, 6, 8, and 11 on depth, general-purpose shapes, pulling complexity down, and comparing designs; §§13.3–13.5 and ch. 15 on precise contracts and writing comments first. |
| [Failure design](failure-design.md) | §§10.3, 10.6–10.7, and 10.10 distinguish ordinary outcomes, recovery inside an owner, shared handling, and failures that must stay visible. |

Use ch. 20 with existing performance guidance when there is a real cost or budget. It does not add a profiling step to routine plans.

## TDD is a local policy

Ch. 19 distinguishes design from test-by-test implementation. Ousterhout [disagrees with TDD](https://github.com/johnousterhout/aposd-vs-clean-code/blob/main/README.md#tdd-summary). This hub keeps its failing-test-first rule and vertical ticket slices. Design the needed abstraction before implementing it one behavior at a time.
