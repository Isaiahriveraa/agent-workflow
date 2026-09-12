import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ComponentType } from "react";
import type { SceneData as ExcalidrawSceneData } from "@excalidraw/excalidraw/types";

export type { ExcalidrawSceneData };
export { convertToExcalidrawElements };

export interface PrototypeVariant {
  id: string;
  title: string;
  component: ComponentType;
}

export interface PrototypeDefinition {
  title: string;
  question: string;
  scene?: ExcalidrawSceneData;
  variants: readonly PrototypeVariant[];
}

// Explanation-first prototypes: what the model is, how its chain runs, what is optional detail.
export { CausalWalkthrough } from "./explain/CausalWalkthrough.tsx";
export type { CausalStep, CausalWalkthroughProps } from "./explain/CausalWalkthrough.tsx";
export { ModelOverview } from "./explain/ModelOverview.tsx";
export type { ModelOverviewProps } from "./explain/ModelOverview.tsx";

// Values and declared shapes, one grammar.
export { StructuredDataView } from "./inspect/StructuredDataView.tsx";
export type { StructuredDataViewProps } from "./inspect/StructuredDataView.tsx";
export { SchemaView } from "./inspect/SchemaView.tsx";
export type { SchemaViewProps } from "./inspect/SchemaView.tsx";
export { StateInspector } from "./inspect/StateInspector.tsx";
export type { StateInspectorProps } from "./inspect/StateInspector.tsx";
export type { FieldSpec, ReconcileResult, ReconciledField } from "./inspect/schema.ts";
export type { StructuredDataOptions } from "./inspect/walk.ts";
export type { Tone } from "./tone.ts";

// Who talks to whom, in order, and which file owns each step.
export { SequenceDiagram } from "./diagram/SequenceDiagram.tsx";
export type { SequenceDiagramProps } from "./diagram/SequenceDiagram.tsx";
export type { DiagramParticipant, DiagramStep } from "./diagram/sequence.ts";

// Display vocabulary and controls. prototype-action stays the button family's base class.
export {
  ActionButton,
  Bullets,
  Button,
  Card,
  CardGrid,
  Chip,
  DataTable,
  Mono,
  Note,
  Panel,
  Rows,
  Section,
  SegmentedControl,
  TechnicalDetails,
  Toolbar,
} from "./components/ui.tsx";
export type {
  BulletItem,
  BulletsProps,
  ButtonProps,
  ButtonVariant,
  CardGridProps,
  CardProps,
  ChipProps,
  DataTableColumn,
  DataTableProps,
  DataTableRow,
  MonoProps,
  NoteProps,
  Row,
  RowsProps,
  SectionProps,
  SegmentedControlProps,
  SegmentedOption,
  TechnicalDetailsProps,
  ToolbarProps,
} from "./components/ui.tsx";

// Two panes, a movable divider, ratio owned by the caller.
export { Split } from "./Split.tsx";
export type { SplitProps } from "./Split.tsx";
