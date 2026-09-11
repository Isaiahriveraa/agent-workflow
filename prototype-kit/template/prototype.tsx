import { useState } from "react";
import {
  ActionButton,
  Panel,
  StateInspector,
  convertToExcalidrawElements,
  type PrototypeDefinition,
} from "@prototype-kit";

function QueueSimulation() {
  const [pending, setPending] = useState(0);
  const [processed, setProcessed] = useState(0);

  return (
    <Panel title="Queue transitions">
      <p>Local illustrative model — not a real backend connection.</p>
      <div className="prototype-actions">
        <ActionButton onClick={() => setPending((value) => value + 1)}>Enqueue</ActionButton>
        <ActionButton
          onClick={() => {
            if (pending > 0) {
              setPending((value) => value - 1);
              setProcessed((value) => value + 1);
            }
          }}
          disabled={pending === 0}
        >
          Process next
        </ActionButton>
        <ActionButton onClick={() => { setPending(0); setProcessed(0); }}>Reset</ActionButton>
      </div>
      <StateInspector value={{ pending, processed }} />
    </Panel>
  );
}

const scene = {
  elements: convertToExcalidrawElements([
    { type: "rectangle", x: 80, y: 150, width: 180, height: 100, strokeColor: "#3566a8", backgroundColor: "#e8f1ff" },
    { type: "text", x: 130, y: 190, text: "Client", fontSize: 24 },
    { type: "rectangle", x: 360, y: 150, width: 180, height: 100, strokeColor: "#3566a8", backgroundColor: "#eef5ec" },
    { type: "text", x: 420, y: 190, text: "Queue", fontSize: 24 },
    { type: "rectangle", x: 640, y: 150, width: 180, height: 100, strokeColor: "#3566a8", backgroundColor: "#fff4df" },
    { type: "text", x: 695, y: 190, text: "Worker", fontSize: 24 },
    { type: "arrow", x: 260, y: 200, width: 100, height: 0, endArrowhead: "arrow", strokeColor: "#3566a8" },
    { type: "arrow", x: 540, y: 200, width: 100, height: 0, endArrowhead: "arrow", strokeColor: "#3566a8" },
  ]),
} satisfies NonNullable<PrototypeDefinition["scene"]>;

const definition: PrototypeDefinition = {
  title: "Queue Worker Simulation",
  question: "How should worker backlog and processing transitions be represented?",
  scene,
  variants: [{ id: "queue-worker", title: "Queue Worker", component: QueueSimulation }],
};

export default definition;
