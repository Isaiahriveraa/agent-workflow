import { useMemo, useRef, useState, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  CaptureUpdateAction,
  Excalidraw,
  loadFromBlob,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import definition from "@prototype";
import type { PrototypeDefinition, PrototypeVariant } from "@prototype-kit";

class PreviewBoundary extends Component<{ children: ReactNode }, { error: Error | null; retry: number }> {
  state: { error: Error | null; retry: number } = { error: null, retry: 0 };
  render() {
    if (this.state.error) return <div className="preview-error" role="alert"><h2>Preview failed</h2><p>{this.state.error.message}</p><button type="button" onClick={() => this.setState({ error: null, retry: this.state.retry + 1 })}>Retry</button></div>;
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

const styles = `:root{font-family:system-ui,sans-serif;color:#172033;background:#f4f6f8}*{box-sizing:border-box}body{margin:0}.prototype-topbar{display:flex;justify-content:space-between;gap:24px;padding:20px 24px;border-bottom:1px solid #d7dde5;background:#fff}.prototype-kicker{font:600 11px ui-monospace,monospace;letter-spacing:.12em;color:#3566a8}.prototype-topbar h1,.preview-heading h2{margin:4px 0;font-size:22px}.prototype-topbar p{margin:6px 0 0;color:#5d6878}.prototype-controls{display:flex;gap:8px;align-items:center}.prototype-controls button,.preview-panel button,.prototype-action,.mobile-tabs button{border:1px solid #aab8cb;border-radius:6px;background:#fff;color:#17365f;padding:9px 13px;font:inherit;cursor:pointer}.prototype-controls button:hover,.preview-panel button:hover,.prototype-action:hover{background:#edf4ff}.prototype-workspace{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,1fr);height:calc(100vh - 103px)}.whiteboard-panel{min-width:0;border-right:1px solid #d7dde5}.preview-panel{overflow:auto;padding:24px;background:#f8fafc}.preview-heading{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:20px}.preview-heading label{display:grid;gap:5px;font-size:13px;color:#4e5b6c}.preview-heading select{padding:7px;border:1px solid #aab8cb;border-radius:5px;background:white}.preview-error,.prototype-load-error,.definition-error{padding:16px;border:1px solid #d27b7b;background:#fff4f4;color:#762c2c}.preview-error button{margin-top:8px}.prototype-panel{padding:18px;border:1px solid #d7dde5;border-radius:8px;background:#fff}.prototype-panel h2{margin:0 0 14px;font-size:17px}.prototype-action{margin:4px 5px 4px 0}.prototype-state{margin-top:16px;padding:12px;background:#172033;color:#e9f1ff;border-radius:6px}.prototype-state pre{margin:8px 0 0;white-space:pre-wrap;font:13px ui-monospace,monospace}.mobile-tabs{display:none}.prototype-load-error{margin:12px 24px}@media(max-width:959px){.prototype-topbar{padding:16px;display:block}.prototype-controls{margin-top:14px}.mobile-tabs{display:flex;padding:8px 16px;gap:8px;background:#fff;border-bottom:1px solid #d7dde5}.mobile-tabs button.active{background:#dceaff;border-color:#3566a8}.prototype-workspace{height:calc(100vh - 164px);display:block}.whiteboard-panel,.preview-panel{height:100%;border:0}.mobile-hidden{display:none}.mobile-visible{display:block}}`;
function Workspace({ prototype }: { prototype: PrototypeDefinition }) {
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const current = useRef<{ elements: readonly ExcalidrawElement[]; appState: AppState; files: BinaryFiles }>({ elements: [], appState: {} as AppState, files: {} });
  const [activeTab, setActiveTab] = useState<"whiteboard" | "preview">("whiteboard");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("variant");
    return prototype.variants.some((variant) => variant.id === requested) && requested ? requested : prototype.variants[0].id;
  });
  const selected = useMemo(() => prototype.variants.find((variant) => variant.id === selectedId) ?? prototype.variants[0], [prototype.variants, selectedId]);
  const loadInput = useRef<HTMLInputElement>(null);

  function chooseVariant(id: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("variant", id);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    setSelectedId(id);
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
  return <>
    <style>{styles}</style>
    <header className="prototype-topbar">
      <div><div className="prototype-kicker">THROWAWAY EXPLORATION</div><h1>{prototype.title}</h1><p>{prototype.question}</p></div>
      <div className="prototype-controls"><button type="button" onClick={saveDiagram}>Save diagram</button><button type="button" onClick={() => loadInput.current?.click()}>Load diagram</button><input ref={loadInput} hidden type="file" accept=".excalidraw,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadDiagram(file); event.target.value = ""; }} /></div>
    </header>
    {loadError && <div className="prototype-load-error" role="alert">{loadError}</div>}
    <nav className="mobile-tabs" aria-label="Workspace panels"><button className={activeTab === "whiteboard" ? "active" : ""} type="button" onClick={() => setActiveTab("whiteboard")}>Whiteboard</button><button className={activeTab === "preview" ? "active" : ""} type="button" onClick={() => setActiveTab("preview")}>Preview</button></nav>
    <main className="prototype-workspace">
      <section className={`whiteboard-panel ${activeTab === "whiteboard" ? "mobile-visible" : "mobile-hidden"}`} aria-label="Whiteboard"><Excalidraw initialData={initialData} isCollaborating={false} aiEnabled={false} validateEmbeddable={false} excalidrawAPI={(excalidrawApi) => { api.current = excalidrawApi; const elements = initialData?.elements; if (elements?.length) requestAnimationFrame(() => excalidrawApi.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.8, animate: false })); }} onChange={(elements, appState, files) => { current.current = { elements, appState, files }; }} /></section>
      <section className={`preview-panel ${activeTab === "preview" ? "mobile-visible" : "mobile-hidden"}`} aria-label="Live preview"><div className="preview-heading"><div><div className="prototype-kicker">LIVE MODEL</div><h2>Interactive preview</h2></div>{prototype.variants.length > 1 && <label>Variant<select value={selected.id} onChange={(event) => chooseVariant(event.target.value)}>{prototype.variants.map((variant: PrototypeVariant) => <option key={variant.id} value={variant.id}>{variant.title}</option>)}</select></label>}</div><PreviewBoundary key={selected.id}><selected.component /></PreviewBoundary></section>
    </main>
  </>;
}

const error = validateDefinition(definition);
const root = document.getElementById("root");
if (!root) throw new Error("Prototype root element is missing.");
createRoot(root).render(error ? <><style>{styles}</style><main className="definition-error" role="alert"><h1>Prototype configuration error</h1><p>{error}</p></main></> : <Workspace prototype={definition} />);

