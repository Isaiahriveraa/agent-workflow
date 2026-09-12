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

const styles = `:root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#292622;background:#f3efe9;line-height:1.5;--ink:#292622;--muted:#706b64;--line:#ded8cf;--surface:#fffdfa;--surface-soft:#f8f5f0;--accent:#9a4f2f;--accent-dark:#79371f;--focus:#c66d47}*{box-sizing:border-box}body{margin:0;background:var(--surface-soft)}button,select{font:inherit}button:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid color-mix(in srgb,var(--focus) 35%,transparent);outline-offset:2px}.prototype-topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:32px;padding:24px 32px;border-bottom:1px solid var(--line);background:var(--surface)}.prototype-kicker{font:600 11px ui-monospace,SFMono-Regular,monospace;letter-spacing:.13em;text-transform:uppercase;color:var(--accent)}.prototype-topbar h1,.preview-heading h2{margin:5px 0;font-size:clamp(21px,2vw,28px);line-height:1.15;letter-spacing:-.02em}.prototype-topbar p{max-width:680px;margin:8px 0 0;color:var(--muted);font-size:15px}.prototype-controls{display:flex;gap:8px;align-items:center;flex-shrink:0}.prototype-controls button,.preview-panel button,.prototype-action,.mobile-tabs button{border:1px solid #cfc6ba;border-radius:5px;background:var(--surface);color:var(--ink);padding:9px 13px;cursor:pointer;transition:background .15s,border-color .15s,transform .15s}.prototype-controls button:hover,.preview-panel button:hover,.prototype-action:hover{background:#f4ebe3;border-color:#bda994}.prototype-controls button:first-child{background:var(--accent);border-color:var(--accent);color:#fff}.prototype-controls button:first-child:hover{background:var(--accent-dark)}.prototype-workspace{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(340px,1fr);height:calc(100vh - 105px)}.whiteboard-panel{min-width:0;border-right:1px solid var(--line);background:#fff}.preview-panel{overflow:auto;padding:30px clamp(20px,3vw,40px);background:var(--surface-soft)}.preview-heading{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:22px}.preview-heading label{display:grid;gap:5px;font-size:12px;font-weight:600;color:var(--muted)}.preview-heading select{padding:8px 28px 8px 9px;border:1px solid #cfc6ba;border-radius:5px;background:var(--surface);color:var(--ink)}.preview-error,.prototype-load-error,.definition-error{padding:16px;border:1px solid #d69b8c;border-radius:6px;background:#fff5f2;color:#713524}.preview-error button{margin-top:8px}.prototype-panel{padding:20px;border:1px solid var(--line);border-radius:8px;background:var(--surface);box-shadow:0 1px 1px #2b21150a}.prototype-panel h2{margin:0 0 14px;font-size:17px;line-height:1.25}.prototype-action{margin:4px 5px 4px 0}.prototype-state{margin-top:16px;padding:14px;border:1px solid #3e3934;border-radius:6px;background:#302c28;color:#f8f3ec}.prototype-state pre{margin:8px 0 0;white-space:pre-wrap;font:12px ui-monospace,SFMono-Regular,monospace;color:#eee5da}.prototype-overview{margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--line)}.prototype-overview h2,.prototype-overview h3{margin:0 0 6px;font-size:18px}.prototype-overview p{margin:0;color:var(--muted)}.causal-walkthrough{display:grid;gap:10px;margin:0 0 18px;padding:0;list-style:none}.causal-step{display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:start;padding:11px 0;border-bottom:1px solid #ebe5dd}.causal-step:last-child{border-bottom:0}.causal-step-marker{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#f1e2d8;color:var(--accent-dark);font-size:12px;font-weight:700}.causal-step h3{margin:0;font-size:14px}.causal-step p{margin:2px 0 0;color:var(--muted);font-size:14px}.technical-details{margin-top:12px;border-top:1px solid var(--line);padding-top:12px}.technical-details summary{cursor:pointer;color:var(--muted);font-size:13px;font-weight:600}.technical-details[open] summary{color:var(--accent-dark)}.mobile-tabs{display:none}@media(max-width:959px){.prototype-topbar{padding:18px 16px;display:block}.prototype-controls{margin-top:16px}.mobile-tabs{display:flex;padding:9px 16px;gap:8px;background:var(--surface);border-bottom:1px solid var(--line)}.mobile-tabs button.active{background:#f1e2d8;border-color:#b87858;color:var(--accent-dark)}.prototype-workspace{height:calc(100vh - 175px);display:block}.whiteboard-panel,.preview-panel{height:100%;border:0}.mobile-hidden{display:none}.mobile-visible{display:block}}`;
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

