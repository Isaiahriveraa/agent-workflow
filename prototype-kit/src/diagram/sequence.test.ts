import assert from "node:assert/strict";
import test from "node:test";
import { computeLayout, type DiagramParticipant, type DiagramStep, type SequenceLine } from "./sequence.ts";

function participantRecord(count: number): Record<string, DiagramParticipant> {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => [`p${index}`, { name: `Participant ${index}`, sub: `file-${index}.js` }]),
  );
}

function chain(count: number, ids: readonly string[]): DiagramStep[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `step-${index}`,
    from: ids[index % ids.length],
    to: ids[(index + 1) % ids.length],
    label: `Step ${index} crosses a boundary`,
    built: index % 2 === 0,
  }));
}

/** A label is rendered as its lines joined by a single space; wrapping must never alter the words. */
const joined = (lines: readonly SequenceLine[]): string => lines.map((line) => line.text).join(" ");
const normalised = (text: string): string => text.replace(/\s+/g, " ").trim();

test("lays out eight lanes and seventeen steps from the data alone", () => {
  const participants = participantRecord(8);
  const ids = Object.keys(participants);
  const layout = computeLayout(participants, chain(17, ids));

  assert.equal(layout.lanes.length, 8);
  assert.equal(layout.hops.length, 17);
  assert.equal(layout.empty, null);
  assert.deepEqual(layout.errors, []);
  assert.ok(layout.width > 0 && layout.height > 0);
  assert.ok(layout.hops.every((hop) => typeof hop.fromX === "number" && typeof hop.toX === "number"));
  assert.ok(layout.height > computeLayout(participants, chain(4, ids)).height);

  const wider = computeLayout(participantRecord(9), chain(17, [...ids, "p8"]));
  assert.ok(wider.width > layout.width);
});

test("carries the lane anatomy from the participant record", () => {
  const participants = participantRecord(4);
  const ids = Object.keys(participants);
  const layout = computeLayout(participants, []);

  assert.deepEqual(
    layout.lanes.map((lane) => lane.id),
    ids,
  );
  assert.deepEqual(
    layout.lanes.map((lane) => joined(lane.nameLines)),
    ids.map((id) => participants[id].name),
  );
  assert.deepEqual(
    layout.lanes.map((lane) => joined(lane.subLines)),
    ids.map((id) => `file-${id.slice(1)}.js`),
  );

  const gaps = layout.lanes.slice(1).map((lane, index) => lane.x - layout.lanes[index].x);
  assert.equal(new Set(gaps).size, 1);
  assert.ok(layout.lanes.every((lane) => lane.x > 0 && lane.x < layout.width));
  assert.deepEqual(layout.empty, { reason: "no-steps" });
});

test("keeps every lane header inside its own lane", () => {
  const layout = computeLayout(
    {
      a: { name: "Shop page", sub: "browser" },
      b: { name: "Checkout coordinator", sub: "checkoutCoordinator.js" },
      c: { name: "Domain rules", sub: "shop/domain.js · pure" },
      d: { name: "Stripe API", sub: "provider client only" },
    },
    [],
  );
  const lanes = layout.lanes;

  assert.ok(lanes[0].x - lanes[0].width / 2 >= 0, "the first lane starts inside the board");
  const last = lanes[lanes.length - 1];
  assert.ok(last.x + last.width / 2 <= layout.width, "the last lane ends inside the board");
  for (let index = 1; index < lanes.length; index += 1) {
    assert.ok(
      lanes[index - 1].x + lanes[index - 1].width / 2 <= lanes[index].x - lanes[index].width / 2,
      `lane ${index} overlaps lane ${index - 1}`,
    );
  }
  assert.ok(lanes.every((lane) => lane.nameLines.length > 0 && lane.subLines.length > 0));
  assert.ok(lanes.every((lane) => lane.nameLines.every((line) => line.text.trim().length > 0)));
});

test("derives hop direction, path shape and built state", () => {
  const layout = computeLayout(participantRecord(4), [
    { id: "forward", from: "p0", to: "p2", label: "forward", built: true },
    { id: "backward", from: "p2", to: "p0", label: "backward" },
    { id: "self", from: "p1", to: "p1", label: "self" },
  ]);

  assert.deepEqual(
    layout.hops.map((hop) => hop.direction),
    ["forward", "backward", "self"],
  );
  assert.deepEqual(
    layout.hops.map((hop) => hop.path?.kind),
    ["line", "line", "loop"],
  );
  assert.deepEqual(
    layout.hops.map((hop) => hop.built),
    [true, false, false],
  );
  assert.notDeepEqual(layout.hops[2].path, layout.hops[0].path);
});

test("wraps a label that does not fit the column instead of abbreviating it", () => {
  const long = "write the order, the holds and the attempt — one transaction";
  const short = "take stock off the shelf";
  const layout = computeLayout(participantRecord(3), [
    { id: "long", from: "p0", to: "p2", label: long },
    { id: "short", from: "p0", to: "p1", label: short },
  ]);
  const [longHop, shortHop] = layout.hops;

  assert.equal(longHop.label.accessibleName, long);
  assert.equal(joined(longHop.label.lines), normalised(long));
  assert.ok(longHop.label.lines.length > 1, "the long label needs more than one line");
  assert.ok(longHop.label.lines.length <= 4, "the long label should not be shredded into slivers");
  assert.ok(longHop.label.lines.every((line) => line.text.length < long.length));
  assert.equal(joined(longHop.label.lines).includes("…"), false, "wrapping never abbreviates");
  assert.equal(joined(shortHop.label.lines), short);
});

test("evens out the lines so a wrapped label leaves no orphan word", () => {
  const label = "read the cart + retry key, normalise the cart";
  const layout = computeLayout(participantRecord(2), [{ id: "orphan", from: "p0", to: "p1", label }]);
  const lines = layout.hops[0].label.lines.map((line) => line.text);

  assert.equal(lines.length, 2);
  assert.equal(lines.join(" "), label);
  assert.ok(
    Math.abs(lines[0].length - lines[1].length) <= 6,
    `the two lines are uneven: ${JSON.stringify(lines)}`,
  );
});

test("breaks a token that cannot fit the column without losing a character", () => {
  const token = "https://api.stripe.com/v1/checkout/sessions";
  const layout = computeLayout(participantRecord(2), [{ id: "url", from: "p0", to: "p1", label: token }]);
  const lines = layout.hops[0].label.lines.map((line) => line.text);

  assert.ok(lines.length > 1, "a token wider than the column is broken rather than overflowing it");
  assert.equal(lines.join("").replace(/\s+/g, ""), token, "breaking a token drops no character");
  assert.equal(layout.hops[0].label.accessibleName, token, "the accessible name keeps the whole token");
  assert.ok(lines.every((line) => line.length < token.length));
});

test("never cuts a surrogate pair when breaking a token", () => {
  const token = "😀".repeat(21);
  const layout = computeLayout(participantRecord(2), [{ id: "emoji", from: "p0", to: "p1", label: token }]);
  const lines = layout.hops[0].label.lines.map((line) => line.text);

  assert.ok(lines.length > 1, "the token is still broken to fit");
  assert.equal(lines.join(""), token, "no surrogate pair is split, so no character is replaced");
  assert.ok(lines.every((line) => !/[\uD800-\uDBFF]$/.test(line)), "no line ends on a high surrogate");
  assert.ok(lines.every((line) => !/^[\uDC00-\uDFFF]/.test(line)), "no line starts on a low surrogate");
});

test("keeps every header line inside the lane's character budget", () => {
  // A lane wraps to 166px at an estimated 7.4px per character, so no header line may exceed 22
  // characters. Text whose UTF-16 length overstates its line count used to inflate the balancing
  // budget past the column and emit a 23-character line.
  const name = "中-.𝕏😀😀.a中 .中..-中aQ 😀😀𝕏- 𝕏 𝕏.QQQ.𝕏.中 Q-aéé-Q😀中é😀𝕏😀𝕏-😀éQ 中.中a𝕏éé😀中Q .é𝕏a-";
  const layout = computeLayout({ a: { name }, b: { name: "Buyer" } }, []);

  assert.ok(layout.lanes[0].nameLines.length > 1);
  assert.ok(
    layout.lanes[0].nameLines.every((line) => line.text.length <= 22),
    `a header line exceeds the lane budget: ${JSON.stringify(layout.lanes[0].nameLines.map((line) => line.text))}`,
  );
});

test("breaks a one-word lane header instead of letting it overflow its lane", () => {
  const name = "IdempotencyKeyRotationServiceForCheckout";
  const layout = computeLayout({ a: { name }, b: { name: "Buyer" } }, []);
  const lane = layout.lanes[0];
  const lines = lane.nameLines.map((line) => line.text);

  assert.ok(lines.length > 1, "a header with no spaces is broken rather than overflowing");
  assert.equal(lines.join("").replace(/\s+/g, ""), name, "breaking a header drops no character");
  assert.ok(lines.every((line) => line.length < name.length));
});

test("anchors every label inside the band of lanes, even for a self-hop on an edge lane", () => {
  const participants = participantRecord(8);
  const ids = Object.keys(participants);
  const label = "a label long enough to wrap onto more than one line";
  const layout = computeLayout(participants, [
    { id: "left", from: ids[0], to: ids[0], label },
    { id: "right", from: ids[7], to: ids[7], label },
  ]);
  const lanes = layout.lanes;

  assert.ok(
    layout.hops[0].label.x >= lanes[0].x,
    "the leftmost self-hop's label is not anchored left of the first lane",
  );
  assert.ok(
    layout.hops[1].label.x <= lanes[lanes.length - 1].x,
    "the rightmost self-hop's label is not anchored right of the last lane",
  );
  assert.ok(layout.hops.every((hop) => hop.label.lines.every((line) => line.y > 0)));
});

test("gives every row the height its own label needs, so nothing overlaps", () => {
  const layout = computeLayout(participantRecord(4), [
    { id: "a", from: "p0", to: "p3", label: "short" },
    { id: "b", from: "p1", to: "p2", label: "a label long enough to wrap onto more than one line in the column" },
    { id: "c", from: "p0", to: "p3", label: "short again" },
  ]);
  const rows = layout.rows;

  assert.ok(rows[1].height > rows[0].height, "the wrapped row is taller");
  for (let index = 1; index < rows.length; index += 1) {
    assert.ok(
      rows[index].y >= rows[index - 1].y + rows[index - 1].height,
      `row ${index} overlaps row ${index - 1}`,
    );
  }
  const gaps = rows.slice(1).map((row, index) => row.y - (rows[index].y + rows[index].height));
  assert.equal(new Set(gaps).size, 1, "rows are separated by one constant gap");
  for (const row of rows) {
    assert.ok(row.baselineY > row.y && row.baselineY < row.y + row.height, "the arrow stays inside its row");
  }
  assert.ok(
    layout.hops.every((hop) => hop.label.lines.every((line) => line.y < hop.baselineY)),
    "labels sit above their arrow",
  );
});

test("reserves a line for the not-built marker so it never lands on the next hop", () => {
  const label = "payment confirmation (webhook)";
  const layout = computeLayout(participantRecord(3), [
    { id: "built", from: "p2", to: "p0", label, built: true },
    { id: "missing", from: "p2", to: "p0", label, built: false },
  ]);
  const [built, missing] = layout.hops;
  const lastLine = built.label.lines[built.label.lines.length - 1].y;

  assert.equal(built.affordanceY, null);
  assert.equal(typeof missing.affordanceY, "number");
  assert.ok((missing.affordanceY ?? 0) > lastLine, "the marker follows the label");
  assert.ok((missing.affordanceY ?? 0) < missing.baselineY, "the marker belongs to its own arrow");
  assert.ok(missing.row.height > built.row.height);
  assert.ok(missing.row.y >= built.row.y + built.row.height);
});

test("draws a self-hop as a loop that returns to its own lane", () => {
  const layout = computeLayout(participantRecord(3), [
    { id: "self", from: "p1", to: "p1", label: "normalise the cart before pricing" },
  ]);
  const hop = layout.hops[0];
  const loop = hop.path?.kind === "loop" ? hop.path : null;

  assert.equal(hop.direction, "self");
  assert.ok(loop !== null);
  assert.equal(loop.x, hop.fromX);
  assert.equal(hop.arrow?.x, hop.fromX, "the loop lands back on its own lane");
  assert.equal(hop.arrow?.direction, -1, "the loop returns leftwards");
  assert.ok(hop.label.x > hop.fromX, "the label sits clear of the lane it loops on");
  assert.ok(hop.row.height > loop.height, "the loop fits inside its row");
  assert.ok(loop.y + loop.height <= hop.row.y + hop.row.height);
});

test("points every arrow at the participant it arrives at", () => {
  const layout = computeLayout(participantRecord(4), [
    { id: "right", from: "p0", to: "p3", label: "right" },
    { id: "left", from: "p3", to: "p1", label: "left" },
  ]);

  assert.equal(layout.hops[0].arrow?.x, layout.hops[0].toX);
  assert.equal(layout.hops[0].arrow?.y, layout.hops[0].baselineY);
  assert.equal(layout.hops[0].arrow?.direction, 1);
  assert.equal(layout.hops[1].arrow?.x, layout.hops[1].toX);
  assert.equal(layout.hops[1].arrow?.direction, -1);
});

test("reports an unknown participant without losing the other steps", () => {
  const layout = computeLayout(participantRecord(3), [
    { id: "first", from: "p0", to: "p1", label: "first" },
    { id: "broken", from: "p0", to: "ghost", label: "broken" },
    { id: "third", from: "p1", to: "p2", label: "third" },
  ]);

  assert.equal(layout.hops.length, 3);
  assert.equal(layout.errors.length, 1);
  assert.equal(layout.errors[0].id, "broken");
  assert.match(layout.errors[0].message, /Unknown participant/);
  assert.equal(layout.hops[1].error, layout.errors[0].message);
  assert.equal(layout.hops[1].toX, null);
  assert.equal(typeof layout.hops[1].fromX, "number");
  assert.equal(layout.hops[1].path, null);
  assert.equal(layout.hops[1].arrow, null);
  assert.ok(layout.hops[0].path !== null && layout.hops[2].path !== null);
});

test("labels empty inputs instead of drawing a collapsed board", () => {
  assert.deepEqual(computeLayout({}, []).empty, { reason: "no-participants" });
  assert.deepEqual(computeLayout(participantRecord(2), []).empty, { reason: "no-steps" });

  const single = computeLayout(participantRecord(1), [{ id: "loop", from: "p0", to: "p0", label: "self" }]);
  assert.equal(single.empty, null);
  assert.ok(single.width > 100 && single.height > 0);
  assert.equal(single.hops[0].path?.kind, "loop");
});

test("marks the current step without painting a band across the board", () => {
  const participants = participantRecord(3);
  const steps = chain(4, Object.keys(participants));
  const layout = computeLayout(participants, steps, { currentStep: 2 });

  assert.deepEqual(
    layout.hops.map((hop) => hop.current),
    [false, false, true, false],
  );
  assert.equal(
    computeLayout(participants, steps).hops.some((hop) => hop.current),
    false,
  );
  assert.equal(
    computeLayout(participants, steps, { currentStep: 9 }).hops.some((hop) => hop.current),
    false,
  );
});

test("is deterministic and never mutates its inputs", () => {
  const participants = participantRecord(3);
  const steps = chain(5, Object.keys(participants));
  const snapshot = JSON.stringify({ participants, steps });

  assert.deepEqual(
    computeLayout(participants, steps, { currentStep: 1 }),
    computeLayout(participants, steps, { currentStep: 1 }),
  );
  assert.equal(JSON.stringify({ participants, steps }), snapshot);
});
