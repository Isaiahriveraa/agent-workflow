import assert from "node:assert/strict";
import test from "node:test";
import { computeLayout, type DiagramParticipant, type DiagramStep } from "./sequence.ts";

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
    layout.lanes.map((lane) => lane.name),
    ids.map((id) => participants[id].name),
  );
  assert.deepEqual(
    layout.lanes.map((lane) => lane.sub),
    ids.map((id) => `file-${id.slice(1)}.js`),
  );

  const gaps = layout.lanes.slice(1).map((lane, index) => lane.x - layout.lanes[index].x);
  assert.equal(new Set(gaps).size, 1);
  assert.ok(layout.lanes.every((lane) => lane.x > 0 && lane.x < layout.width));
  assert.deepEqual(layout.empty, { reason: "no-steps" });
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

test("raises a long label clear of its hop and truncates only the display text", () => {
  const long = "A step label that runs well past the readable mark";
  const layout = computeLayout(participantRecord(2), [
    { id: "long", from: "p0", to: "p1", label: long },
    { id: "short", from: "p0", to: "p1", label: "ok" },
    { id: "self", from: "p0", to: "p0", label: long },
  ]);
  const [longHop, shortHop, selfHop] = layout.hops;

  assert.equal(longHop.label.collided, true);
  assert.equal(shortHop.label.collided, false);
  assert.equal(selfHop.label.collided, false);
  assert.ok(longHop.label.y < shortHop.label.y);
  assert.ok(longHop.label.display.length < long.length);
  assert.equal(longHop.label.display.endsWith("…"), true);
  assert.equal(longHop.label.accessibleName, long);
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

test("marks the current step and leaves it unmarked when out of range", () => {
  const participants = participantRecord(3);
  const steps = chain(4, Object.keys(participants));
  const layout = computeLayout(participants, steps, { currentStep: 2 });

  assert.deepEqual(
    layout.hops.map((hop) => hop.current),
    [false, false, true, false],
  );
  assert.equal(layout.currentStepMarker?.y, layout.hops[2].baselineY - 16);
  assert.equal(computeLayout(participants, steps).currentStepMarker, null);
  assert.equal(computeLayout(participants, steps, { currentStep: 9 }).currentStepMarker, null);
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
