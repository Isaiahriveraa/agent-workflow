import { useState } from "react";
import {
  ActionButton,
  CausalWalkthrough,
  ModelOverview,
  Panel,
  StateInspector,
  TechnicalDetails,
  convertToExcalidrawElements,
  type CausalStep,
  type PrototypeDefinition,
} from "@prototype-kit";

function QueueSimulation() {
  const [pending, setPending] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [lastOutcome, setLastOutcome] = useState("Waiting for a client request.");

  const enqueue = () => {
    setPending((value) => value + 1);
    setLastOutcome("Client added one job to the queue.");
  };

  const processNext = () => {
    if (pending === 0) return;
    setPending((value) => value - 1);
    setProcessed((value) => value + 1);
    setLastOutcome("Worker processed the oldest queued job.");
  };

  const reset = () => {
    setPending(0);
    setProcessed(0);
    setLastOutcome("Waiting for a client request.");
  };

  const steps: readonly CausalStep[] = [
    {
      id: "client",
      title: "Client submits work",
      actor: "Client",
      description: "Owns the request payload and mutates state by creating one pending job.",
      outcome: "The enqueue action starts the causal chain.",
    },
    {
      id: "queue",
      title: "Queue holds backlog",
      actor: "Queue",
      description: "Owns pending jobs and holds or removes the oldest item.",
      outcome: "Backlog reflects work still waiting.",
    },
    {
      id: "worker",
      title: "Worker completes next job",
      actor: "Worker",
      description: "Owns completion records and mutates state by moving one job from pending to processed.",
      outcome: "The next job is completed.",
    },
  ];

  return (
    <>
      <ModelOverview
        title="Model overview"
        summary="Question: What happens when a client enqueues work?"
      >
        <p>The queue owns pending work; the worker removes the next job and records completion.</p>
      </ModelOverview>
      <CausalWalkthrough title="Causal walkthrough" steps={steps} />
      <Panel title="Queue transitions">
        <p>{lastOutcome}</p>
        <div className="prototype-actions">
          <ActionButton onClick={enqueue}>Enqueue</ActionButton>
          <ActionButton onClick={processNext} disabled={pending === 0}>
            Process next
          </ActionButton>
          <ActionButton onClick={reset}>Reset</ActionButton>
        </div>
        <div className="prototype-metrics" aria-live="polite">
          <strong>{pending}</strong> pending · <strong>{processed}</strong> processed
        </div>
        <TechnicalDetails summary="Technical details (raw JSON)">
          <StateInspector value={{ pending, processed, lastOutcome, steps }} />
        </TechnicalDetails>
      </Panel>
    </>
  );
}


const scene = {
  elements: convertToExcalidrawElements([
    {
      type: "rectangle",
      x: 80,
      y: 150,
      width: 230,
      height: 150,
      strokeColor: "#3566a8",
      backgroundColor: "#e8f1ff",
    },
    {
      type: "text",
      x: 105,
      y: 172,
      text: "ACTOR: Client\nOWNS: request\nMUTATES: +1 pending\nOUTCOME: enqueue",
      fontSize: 20,
    },
    {
      type: "rectangle",
      x: 420,
      y: 150,
      width: 230,
      height: 150,
      strokeColor: "#3566a8",
      backgroundColor: "#eef5ec",
    },
    {
      type: "text",
      x: 445,
      y: 172,
      text: "ACTOR: Queue\nOWNS: pending jobs\nMUTATES: hold/remove\nOUTCOME: backlog",
      fontSize: 20,
    },
    {
      type: "rectangle",
      x: 760,
      y: 150,
      width: 230,
      height: 150,
      strokeColor: "#3566a8",
      backgroundColor: "#fff4df",
    },
    {
      type: "text",
      x: 785,
      y: 172,
      text: "ACTOR: Worker\nOWNS: completion\nMUTATES: pending → done\nOUTCOME: processed",
      fontSize: 20,
    },
    {
      type: "arrow",
      x: 310,
      y: 225,
      width: 110,
      height: 0,
      endArrowhead: "arrow",
      strokeColor: "#3566a8",
    },
    {
      type: "text",
      x: 315,
      y: 190,
      text: "enqueue\nstate mutation",
      fontSize: 16,
    },
    {
      type: "arrow",
      x: 650,
      y: 225,
      width: 110,
      height: 0,
      endArrowhead: "arrow",
      strokeColor: "#3566a8",
    },
    {
      type: "text",
      x: 655,
      y: 190,
      text: "dequeue\ncompletion",
      fontSize: 16,
    },
    {
      type: "text",
      x: 90,
      y: 355,
      text: "Ownership is explicit: each arrow describes who changes state and what outcome follows.",
      fontSize: 18,
    },
  ]),
} satisfies NonNullable<PrototypeDefinition["scene"]>;

const definition: PrototypeDefinition = {
  title: "Queue Worker Simulation",
  question: "How does a queued job move from client request to worker completion?",
  scene,
  variants: [{ id: "queue-worker", title: "Queue Worker", component: QueueSimulation }],
};

export default definition;
