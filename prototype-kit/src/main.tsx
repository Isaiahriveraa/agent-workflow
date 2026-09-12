import {
  CaptureUpdateAction,
  Excalidraw,
  loadFromBlob,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import { Component, type ReactNode, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@excalidraw/excalidraw/index.css";
import "./kit.css";
import definition from "@prototype";
import type { PrototypeDefinition, PrototypeVariant } from "@prototype-kit";
import { Button, SegmentedControl } from "./components/ui.tsx";
import { Split } from "./Split.tsx";

class PreviewBoundary extends Component<{ children: ReactNode }, { error: Error | null; retry: number }> {
  state: { error: Error | null; retry: number } = { error: null, retry: 0 };
  render() {
    if (this.state.error) return <div className="preview-error" role="alert"><h2>Preview failed</h2><p>{this.state.error.message}</p><Button variant="primary" onClick={() => this.setState({ error: null, retry: this.state.retry + 1 })}>Retry</Button></div>;
    return <>{this.state.retry > 0 ? <div key={this.state.retry}>{this.props.children}</div> : this.props.children}</>;
  }
}

function validateDefinition(value: unknown): string | null {
  if (!value || typeof value !== "object") return "Prototype definition must be an object.";
  const definition = value as Partial<PrototypeDefinition>;
  if (typeof definition.title !== "string" || !definition.title.trim()) return "Prototype title is required.";
  if (typeof definition.question !== "string" || !definition.question.trim()) return "Prototype question is required.";
  if (!Array.isArray(definition.variants) || definition.variants.length === 0) return "At least one preview variant is required.";
  const ids: string[] = [];
  for (const [index, variant] of definition.variants.entries()) {
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
      return `Preview variant ${index + 1} must be an object.`;
    }
    const candidate = variant as Partial<PrototypeVariant>;
    if (typeof candidate.id !== "string" || !candidate.id.trim()) {
      return `Preview variant ${index + 1} needs a non-empty string ID.`;
    }
    if (typeof candidate.title !== "string") {
      return `Preview variant ${index + 1} needs a string title.`;
    }
    if (typeof candidate.component !== "function") {
      return `Preview variant ${index + 1} needs a valid component.`;
    }
    ids.push(candidate.id);
  }
  if (new Set(ids).size !== ids.length) return "Preview variant IDs must be unique.";
  return null;
}
function safeFilename(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "prototype"; }

const styles = `#root{display:flex;flex-direction:column;height:100vh;overflow:hidden}.prototype-topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-6);padding:var(--space-5) var(--space-6);border-bottom:1px solid var(--line);background:var(--surface)}.prototype-kicker{font:650 11px var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--accent-dark)}.prototype-topbar h1{margin:6px 0 0;font-size:var(--text-title)}.prototype-topbar p{max-width:var(--measure);margin:var(--space-2) 0 0;color:var(--muted)}.prototype-controls{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center;flex-shrink:0}.prototype-mode{margin:0}.prototype-mode .ui-segmented-legend{font-size:11px}.prototype-workspace{flex:1 1 auto;min-height:0}.prototype-workspace .split{height:100%}.whiteboard-panel{min-width:0;height:100%;border-right:1px solid var(--line);background:var(--surface)}.preview-panel{display:flex;flex-direction:column;gap:var(--space-6);min-height:100%;padding:var(--space-6) clamp(var(--space-5),2.6vw,var(--space-7));background:var(--paper)}.preview-heading{display:flex;justify-content:space-between;gap:var(--space-4);align-items:flex-start;margin-bottom:var(--space-5)}.preview-heading label{display:grid;gap:var(--space-1);font-size:var(--text-xs);font-weight:650;color:var(--muted)}.preview-heading select{padding:8px 28px 8px 10px;border:1px solid var(--line-strong);border-radius:var(--radius-sm);background:var(--surface)}.preview-error,.prototype-load-error,.definition-error{padding:var(--space-4);border:1px solid var(--tone-stop);border-radius:var(--radius-sm);background:var(--tone-stop-soft);color:var(--tone-stop)}.preview-error button{margin-top:var(--space-2)}.mode-preview .split{grid-template-columns:minmax(0,1fr)!important}.mode-preview .split-primary,.mode-preview .split-divider{display:none}.mode-preview .split-secondary{grid-column:1}.mode-whiteboard .split{grid-template-columns:minmax(0,1fr)!important}.mode-whiteboard .split-divider,.mode-whiteboard .split-secondary{display:none}.mode-whiteboard .split-primary{grid-column:1}`;
type ViewMode = "preview" | "whiteboard" | "split";

function defaultView(prototype: PrototypeDefinition): ViewMode {
  return prototype.scene ? "split" : "preview";
}

function viewFromLocation(prototype: PrototypeDefinition): ViewMode {
  const requested = new URLSearchParams(window.location.search).get("view");
  return requested === "preview" || requested === "whiteboard" || requested === "split" ? requested : defaultView(prototype);
}

function Workspace({ prototype }: { prototype: PrototypeDefinition }) {
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const current = useRef<{ elements: readonly ExcalidrawElement[]; appState: AppState; files: BinaryFiles }>({ elements: [], appState: {} as AppState, files: {} });
  const [view, setView] = useState<ViewMode>(() => viewFromLocation(prototype));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("variant");
    return prototype.variants.some((variant) => variant.id === requested) && requested ? requested : prototype.variants[0].id;
  });
  const selected = useMemo(() => prototype.variants.find((variant) => variant.id === selectedId) ?? prototype.variants[0], [prototype.variants, selectedId]);
  const loadInput = useRef<HTMLInputElement>(null);
  const [ratio, setRatio] = useState(0.42);

  function chooseVariant(id: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("variant", id);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    setSelectedId(id);
  }
  function chooseView(nextView: string) {
    if (nextView !== "preview" && nextView !== "whiteboard" && nextView !== "split") return;
    const params = new URLSearchParams(window.location.search);
    params.set("view", nextView);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    setView(nextView);
  }
  function saveDiagram() {
    if (!api.current) return;
    const serialized = serializeAsJSON(current.current.elements, current.current.appState, current.current.files, "local");
    const url = URL.createObjectURL(new Blob([serialized], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${safeFilename(prototype.title)}.excalidraw`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function loadDiagram(file: File) {
    setLoadError(null);
    try {
      const restored = await loadFromBlob(file, current.current.appState, current.current.elements);
      const elements = restored.elements.filter((element) => element.type !== "iframe" && element.type !== "embeddable");
      if (!window.confirm("Replace the current whiteboard with this diagram?")) return;
      if (restored.files) api.current?.addFiles(Object.values(restored.files));
      api.current?.updateScene({ elements, appState: restored.appState, captureUpdate: CaptureUpdateAction.NEVER });
      api.current?.history.clear();
    } catch (error) {
      setLoadError(`Could not load diagram. Choose a valid Excalidraw file. ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  const initialData = prototype.scene ? { ...prototype.scene } : undefined;
  const workspaceClass = view === "split" ? "prototype-workspace mode-split" : view === "preview" ? "prototype-workspace mode-preview" : "prototype-workspace mode-whiteboard";
  return <>
    <style>{styles}</style>
    <header className="prototype-topbar">
      <div><div className="prototype-kicker">THROWAWAY EXPLORATION</div><h1>{prototype.title}</h1><p>{prototype.question}</p></div>
      <div className="prototype-controls">
        <div className="prototype-mode">
          <SegmentedControl label="View mode" options={[{ value: "preview", label: "Preview" }, { value: "whiteboard", label: "Whiteboard" }, { value: "split", label: "Split" }]} value={view} onChange={chooseView} />
        </div>
        <Button variant="secondary" onClick={saveDiagram}>Save diagram</Button><Button variant="secondary" onClick={() => loadInput.current?.click()}>Load diagram</Button><input ref={loadInput} hidden type="file" accept=".excalidraw,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadDiagram(file); event.target.value = ""; }} />
      </div>
    </header>
    {loadError && <div className="prototype-load-error" role="alert">{loadError}</div>}
    <main className={workspaceClass}>
      <Split
        ratio={ratio}
        onRatioChange={setRatio}
        minPrimary={240}
        minSecondary={340}
        label="Resize whiteboard and preview"
        primary={<section className="whiteboard-panel" aria-label="Whiteboard"><Excalidraw initialData={initialData} isCollaborating={false} aiEnabled={false} validateEmbeddable={false} excalidrawAPI={(excalidrawApi) => { api.current = excalidrawApi; const elements = initialData?.elements; if (elements?.length) requestAnimationFrame(() => excalidrawApi.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.8, animate: false })); }} onChange={(elements, appState, files) => { current.current = { elements, appState, files }; }} /></section>}
        secondary={<section className="preview-panel" aria-label="Live preview"><div className="preview-heading"><div><div className="prototype-kicker">LIVE MODEL</div><h2>Interactive preview</h2></div>{prototype.variants.length > 1 && <label>Variant<select value={selected.id} onChange={(event) => chooseVariant(event.target.value)}>{prototype.variants.map((variant: PrototypeVariant) => <option key={variant.id} value={variant.id}>{variant.title}</option>)}</select></label>}</div><PreviewBoundary key={selected.id}><selected.component /></PreviewBoundary></section>}
      />
    </main>
  </>;
}

const error = validateDefinition(definition);
const root = document.getElementById("root");
if (!root) throw new Error("Prototype root element is missing.");
createRoot(root).render(error ? <><style>{styles}</style><main className="definition-error" role="alert"><h1>Prototype configuration error</h1><p>{error}</p></main></> : <Workspace prototype={definition} />);

