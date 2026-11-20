# Information hiding

Keep a change-prone decision behind an interface that lets callers work without knowing it. Changing who knows the decision matters more than changing where the code lives.

1. **Trace one fact.** Pick the rule, encoding, protocol, or sequence in question. Find who reads it, who writes it, and where the logic assumes it. A private field does not hide a format if callers still construct that format.
2. **Change that fact on paper.** Name the modules and callers that would have to change. Look for dependencies between implementations even when their signatures reveal nothing. Distinguish those dependencies from promises callers legitimately rely on.
3. **Compare owners.** Can an existing owner hide the fact? If not, compare moving the decision behind operations that hide it with combining code that already needs the same knowledge. Passing the same detail through a new layer leaves the leak in place.

For example, an import and an export can offer stable public operations while both knowing the same timestamp encoding. Ask what changes if the encoding changes. A file-format owner can parse and format timestamps for both without making either know the encoding. If an external partner depends on that format, it remains an explicit contract with the partner.

Group steps by shared knowledge only where it helps. Keep responsibilities separate when they change for different reasons. A short adapter or dispatcher can earn its place by translating a contract or selecting an operation. If removing a wrapper spreads its policy to callers, the wrapper was doing useful work.

When a decision must span modules, document it where someone changing it will look first. Point to that explanation from the other modules rather than copying the rule.
