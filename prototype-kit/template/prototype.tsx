import { useReducer, useState } from "react";
import {
  Bullets,
  Button,
  Card,
  CardGrid,
  CausalWalkthrough,
  Chip,
  DataTable,
  ModelOverview,
  Mono,
  Note,
  Rows,
  SchemaView,
  Section,
  SegmentedControl,
  SequenceDiagram,
  StructuredDataView,
  TechnicalDetails,
  Toolbar,
  convertToExcalidrawElements,
  type CausalStep,
  type DataTableColumn,
  type DataTableRow,
  type FieldSpec,
  type PrototypeDefinition,
} from "@prototype-kit";

export type QueueState = {
  pending: number;
  processed: number;
  lastOutcome: string;
};

type QueueAction =
  | { type: "enqueue" }
  | { type: "process-next" }
  | { type: "reset" };

const initialState: QueueState = {
  pending: 0,
  processed: 0,
  lastOutcome: "Waiting for a client request.",
};

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "enqueue":
      return { ...state, pending: state.pending + 1, lastOutcome: "Client added one job to the queue." };
    case "process-next":
      return state.pending > 0
        ? { ...state, pending: state.pending - 1, processed: state.processed + 1, lastOutcome: "Worker processed the oldest queued job." }
        : state;
    case "reset":
      return initialState;
  }
}

const causalSteps: readonly CausalStep[] = [
  { id: "trigger", title: "A client submits work", actor: "Client", description: "A request is the trigger: the client asks for one job to be handled.", outcome: "The queue receives work to own." },
  { id: "owner", title: "The queue owns the backlog", actor: "Queue", description: "The queue records one pending job and keeps it available for the worker.", outcome: "Pending work is visible as backlog." },
  { id: "state", title: "The worker claims the next job", actor: "Worker", description: "The worker removes the oldest pending job and records its completion.", outcome: "Pending decreases while processed increases." },
  { id: "outcome", title: "Completion becomes the outcome", actor: "Worker", description: "The completed job gives the system an observable result for the request.", outcome: "The last outcome explains the current state." },
];

const sequenceParticipants = {
  client: { name: "Client", sub: "handlers/client-request.ts" },
  queue: { name: "Queue", sub: "queue/pending-jobs.ts" },
  worker: { name: "Worker", sub: "workers/process-next.ts" },
};

const sequenceSteps = [
  { id: "request", from: "client", to: "queue", label: "submit request", built: true },
  { id: "enqueue", from: "client", to: "queue", label: "enqueue pending job", built: true },
  { id: "claim", from: "queue", to: "worker", label: "claim oldest job", built: true },
  { id: "complete", from: "worker", to: "queue", label: "record completion", built: true },
] as const;

const queueSchema: readonly FieldSpec[] = [
  { name: "pending", type: "number", required: true, default: 0, note: "Jobs waiting for a worker." },
  { name: "processed", type: "number", required: true, default: 0, note: "Jobs completed by the worker." },
  { name: "lastOutcome", type: "string", required: true, note: "Human-readable explanation of the latest transition." },
];

const statusColumns: readonly DataTableColumn[] = [{ key: "status", label: "Status" }, { key: "meaning", label: "Meaning" }];
const statusRows: readonly DataTableRow[] = [
  { id: "waiting", cells: { status: <Chip>Waiting</Chip>, meaning: "No work has been submitted yet." } },
  { id: "pending", cells: { status: <Chip tone="warn">Pending</Chip>, meaning: "At least one job is waiting in the queue." } },
  { id: "complete", cells: { status: <Chip tone="good">Complete</Chip>, meaning: "A worker has recorded a completed job." } },
];

function QueueSimulation() {
  const [state, dispatch] = useReducer(queueReducer, initialState);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const derivedProgress = state.processed > 0 ? 3 : state.pending > 0 ? 1 : 0;
  const currentStep = selectedStep ?? derivedProgress;
  const status = state.processed > 0 ? "Complete" : state.pending > 0 ? "Pending" : "Waiting";
  const statusTone = state.processed > 0 ? "good" : state.pending > 0 ? "warn" : "neutral";
  const enqueue = () => { setSelectedStep(null); dispatch({ type: "enqueue" }); };
  const processNext = () => { setSelectedStep(null); dispatch({ type: "process-next" }); };
  const reset = () => { setSelectedStep(null); dispatch({ type: "reset" }); };
  const liveState = { pending: state.pending, processed: state.processed, lastOutcome: state.lastOutcome };
  return (
    <>
      <ModelOverview title="Model overview" summary="Question: how does queued work move from request to completion?">
        <p>This illustrative simulation follows ownership and state changes across a client, a queue, and a worker.</p>
        <Note tone="warn">This is a disposable model for explanation, not the running backend system.</Note>
      </ModelOverview>
      <CausalWalkthrough title="Causal walkthrough" steps={causalSteps} />
      <Section title="The same chain as a sequence" hint="Select a hop to inspect causal progress.">
        <SequenceDiagram participants={sequenceParticipants} steps={sequenceSteps} currentStep={currentStep} onSelectStep={setSelectedStep} title="Queue request sequence" />
        <SegmentedControl label="Selected transition" options={sequenceSteps.map((step, index) => ({ value: String(index), label: step.label }))} value={String(currentStep)} onChange={(value) => setSelectedStep(Number(value))} />
      </Section>
      <Section title="Rules the model enforces" hint="Each card names one bounded idea.">
        <CardGrid>
          <Card title="Ownership" tone="neutral"><Bullets items={[{ id: "ownership", content: "The queue owns pending jobs; the worker owns completion." }]} /></Card>
          <Card title="State transition" tone="good"><Bullets items={[{ id: "transition", content: "Processing one job decrements pending and increments processed together." }]} /></Card>
          <Card title="Illegal work" tone="stop"><Bullets items={[{ id: "illegal", content: "A worker cannot process a job when no job is pending." }]} /></Card>
        </CardGrid>
      </Section>
      <Section title="Current model numbers" hint="The reducer is the single source of truth.">
        <Rows rows={[{ id: "pending", label: "Pending", value: state.pending }, { id: "processed", label: "Processed", value: state.processed }, { id: "outcome", label: "Last outcome", value: state.lastOutcome }, { id: "status", label: "Current status", value: <Chip tone={statusTone}>{status}</Chip>, tone: statusTone }]} />
      </Section>
      <SchemaView title="QueueState schema" schema={queueSchema} values={liveState} />
      <TechnicalDetails summary="Technical details: raw state and implementation paths">
        <StructuredDataView title="Live QueueState JSON" data={liveState} schema={queueSchema} options={{ detectStatuses: true }} />
        <p>The real implementation would separate responsibilities across <Mono>handlers/client-request.ts</Mono>, <Mono>queue/pending-jobs.ts</Mono>, and <Mono>workers/process-next.ts</Mono>.</p>
      </TechnicalDetails>
      <Section title="Status vocabulary" hint="A compact legend for reading the simulation."><DataTable caption="Status and meaning" columns={statusColumns} rows={statusRows} /></Section>
      <Toolbar>
        <Button variant="primary" onClick={enqueue}>Enqueue job</Button>
        <Button variant="secondary" onClick={processNext} disabled={state.pending === 0}>Process next</Button>
        <Button variant="ghost" onClick={reset}>Reset</Button>
      </Toolbar>
    </>
  );
}

const scene = {
  elements: convertToExcalidrawElements([
    { type: "rectangle", x: 80, y: 150, width: 230, height: 150, strokeColor: "#3566a8", backgroundColor: "#e8f1ff" },
    { type: "text", x: 105, y: 172, text: "TRIGGER: client request\nOWNER: client\nOUTCOME: work submitted", fontSize: 20 },
    { type: "rectangle", x: 420, y: 150, width: 230, height: 150, strokeColor: "#3566a8", backgroundColor: "#eef5ec" },
    { type: "text", x: 445, y: 172, text: "OWNER: queue\nSTATE: +1 pending\nOUTCOME: backlog", fontSize: 20 },
    { type: "rectangle", x: 760, y: 150, width: 230, height: 150, strokeColor: "#3566a8", backgroundColor: "#fff4df" },
    { type: "text", x: 785, y: 172, text: "OWNER: worker\nSTATE: pending → done\nOUTCOME: processed", fontSize: 20 },
    { type: "arrow", x: 310, y: 225, width: 110, height: 0, endArrowhead: "arrow", strokeColor: "#3566a8" },
    { type: "arrow", x: 650, y: 225, width: 110, height: 0, endArrowhead: "arrow", strokeColor: "#3566a8" },
    { type: "text", x: 90, y: 355, text: "Trigger → owner → state change → outcome", fontSize: 18 },
  ]),
} satisfies NonNullable<PrototypeDefinition["scene"]>;

const definition: PrototypeDefinition = {
  title: "Queue Worker Simulation",
  question: "How does a queued job move from client request to worker completion?",
  scene,
  variants: [{ id: "queue-worker", title: "Queue Worker", component: QueueSimulation }],
};

export default definition;
