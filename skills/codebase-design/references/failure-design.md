# Failure design

Reduce the work callers do on failures without hiding facts they need. For each reachable case, ask what actually happened, which layer can act, and what it can promise afterward.

- **Ordinary outcome:** define the operation so the special case satisfies the same promise. An authorized removal that promises absence can succeed when the object is already absent. That is a contract choice, not a reason to ignore a failure.
- **Complete recovery:** handle a failure inside the owner when it can safely deliver the original promise. Do not retry a write that could have completed unless the operation can rule out duplicate effects. If recovery is incomplete, report what is known.
- **Shared response:** put repeated handling at the boundary that owns the response. For example, several routes can share a handler for missing required input. Do not erase distinctions that matter to recovery, debugging, or the caller's next action.
- **Failure or uncertainty that matters:** preserve enough context for a caller or operator to act. Denied access, corruption, conflicting writes, and uncertain completion are not success. A timeout does not prove that no write took place.

For a removal that promises absence, test both an existing object and one already absent. At the same boundary, verify that denial and an uncertain write do not return success. Do not blanket-catch, retry, or crash to make the interface look simpler.
