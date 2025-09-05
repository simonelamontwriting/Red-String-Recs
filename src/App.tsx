// src/App.tsx
import { useState, useEffect } from "react";
import Papa from "papaparse";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Graph from "./components/Graph";
import Sidebar from "./components/Sidebar";
import ItemPage from "./pages/ItemPage";
import PublicItemPage from "./pages/PublicItemPage";

import {
  type NodeDatum,
  type LinkDatum,
  randomAngle,
  type Kind,
} from "./lib/graph";

/* ---------------- Helpers ---------------- */
const BOARD_W = 1100;
const BOARD_H = 720;

function layoutEvenGrid(nodes: NodeDatum[]): NodeDatum[] {
  const N = nodes.length;
  if (!N) return nodes;
  const cols = Math.ceil(Math.sqrt(N));
  const rows = Math.ceil(N / cols);
  const marginX = 140, marginY = 120;
  const left = -BOARD_W / 2 + marginX, right = BOARD_W / 2 - marginX;
  const top = -BOARD_H / 2 + marginY, bottom = BOARD_H / 2 - marginY;
  const xStep = cols > 1 ? (right - left) / (cols - 1) : 0;
  const yStep = rows > 1 ? (bottom - top) / (rows - 1) : 0;
  return nodes.map((n, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    return { ...n, x: left + c * xStep, y: top + r * yStep };
  });
}

/* ---------------- Demo dataset ---------------- */
function demoData(): { nodes: NodeDatum[]; links: LinkDatum[] } {
  let nodes: NodeDatum[] = [
    { id: "inception", title: "Inception", type: "movie", year: 2010, genres: ["Sci-fi", "Heist"], rating: 9, angle: -3, poster: "https://image.tmdb.org/t/p/w200/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg", review: "Dream layers done right." },
    { id: "interstellar", title: "Interstellar", type: "movie", year: 2014, genres: ["Sci-fi", "Drama"], rating: 9, angle: 2, poster: "https://image.tmdb.org/t/p/w200/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg" },
    { id: "dark", title: "Dark", type: "tv", year: 2017, genres: ["Sci-fi", "Thriller"], rating: 8.8, angle: -5, poster: "https://image.tmdb.org/t/p/w200/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg" },
    { id: "got", title: "Game of Thrones", type: "tv", year: 2011, genres: ["Fantasy", "Drama"], rating: 8.5, angle: 4, poster: "https://image.tmdb.org/t/p/w200/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg" },
    { id: "arrival", title: "Arrival", type: "movie", year: 2016, genres: ["Sci-fi", "Drama"], rating: 8, angle: 1, poster: "https://image.tmdb.org/t/p/w200/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg" },
  ];
  nodes = layoutEvenGrid(nodes);
  const links: LinkDatum[] = [
    { source: "inception", target: "interstellar", reason: "Nolan mind-benders", strength: 0.05 },
    { source: "interstellar", target: "arrival", reason: "Thoughtful sci-fi", strength: 0.05 },
    { source: "dark", target: "got", reason: "Epic & twisty", strength: 0.05 },
    { source: "inception", target: "dark", reason: "Time & mystery", strength: 0.05 },
  ];
  return { nodes, links };
}

/* --------------- Reason Modal --------------- */
function ReasonModal({
  open, onClose, onSubmit,
}: { open: boolean; onClose: () => void; onSubmit: (reason: string) => void; }) {
  const [text, setText] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
        <div className="text-sm font-medium mb-2">Add a reason (optional)</div>
        <input
          autoFocus value={text} onChange={(e) => setText(e.target.value)}
          placeholder="e.g., Same director, time travel theme"
          className="w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
          onKeyDown={(e) => e.key === "Enter" && onSubmit(text.trim())}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-xl bg-neutral-100 ring-1 ring-neutral-300">Cancel</button>
          <button onClick={() => onSubmit(text.trim())} className="px-3 py-2 rounded-xl bg-emerald-600 text-white">Connect</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- App ------------------------------- */
export default function App() {
  // EDITOR data (your working copy)
  const [data, setData] = useState<{ nodes: NodeDatum[]; links: LinkDatum[] }>(demoData());
  // PUBLIC data (what clients see)
  const [publicData, setPublicData] = useState<{ nodes: NodeDatum[]; links: LinkDatum[] }>(demoData());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Sidebar editing state
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; type: Kind; year: string; genres: string; }>(
    { title: "", type: "movie", year: "", genres: "" }
  );

  // Connect flow
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);

  // Undo / Redo
  const [history, setHistory] = useState<{ nodes: NodeDatum[]; links: LinkDatum[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ nodes: NodeDatum[]; links: LinkDatum[] }[]>([]);
  const deepClone = (d: { nodes: NodeDatum[]; links: LinkDatum[] }) => ({
    nodes: d.nodes.map((n) => ({ ...n })),
    links: d.links.map((l) => ({ ...l })),
  });
  const pushHistory = () => { setHistory((h) => [...h, deepClone(data)]); setRedoStack([]); };
  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setRedoStack((r) => [...r, deepClone(data)]);
      setData(prev);
      return h.slice(0, -1);
    });
  };
  const redo = () => {
    setRedoStack((r) => {
      if (!r.length) return r;
      const next = r[r.length - 1];
      setHistory((h) => [...h, deepClone(data)]);
      setData(next);
      return r.slice(0, -1);
    });
  };

  /* ---------------- Suggestions (client submissions) ---------------- */
  type Submission = { title: string; type: Kind; description: string; email?: string; createdAt: string; };
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  /* ---------------- Load from localStorage on boot ---------------- */
  useEffect(() => {
    try { const savedEditor = localStorage.getItem("editor-data"); if (savedEditor) setData(JSON.parse(savedEditor)); } catch {}
    try { const savedPublic = localStorage.getItem("public-data"); if (savedPublic) setPublicData(JSON.parse(savedPublic)); } catch {}
    try { const savedSubs = localStorage.getItem("submissions"); if (savedSubs) setSubmissions(JSON.parse(savedSubs)); } catch {}
  }, []);

  /* ---------------- Save / Publish helpers ---------------- */
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 1400);
  };

  const saveEditorState = () => {
    try {
      localStorage.setItem("editor-data", JSON.stringify(data));
      localStorage.setItem("submissions", JSON.stringify(submissions));
      showToast("Saved");
    } catch {
      alert("Save failed (localStorage unavailable).");
    }
  };

  const pushToPublic = () => {
    try {
      const snap = deepClone(data);
      localStorage.setItem("public-data", JSON.stringify(snap));
      setPublicData(snap);
      showToast("Published to public");
    } catch {
      alert("Publish failed (localStorage unavailable).");
    }
  };

  /* ---------------- Keyboard shortcuts ---------------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && !e.shiftKey && key === "z") { e.preventDefault(); undo(); }
      else if (mod && ((e.shiftKey && key === "z") || key === "y")) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Node CRUD ---------------- */
  const handleSave = () => {
    if (!draft.title.trim()) return;
    const id = draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (mode === "add") {
      if (data.nodes.some((n) => n.id === id)) {
        pushHistory();
        setData((prev) => ({
          nodes: prev.nodes.map((n) => n.id === id ? {
            ...n,
            title: draft.title.trim(),
            type: draft.type,
            year: draft.year ? Number(draft.year) : n.year,
            genres: draft.genres ? draft.genres.split(/[,;|]/).map((g) => g.trim()).filter(Boolean) : n.genres,
          } : n),
          links: prev.links,
        }));
      } else {
        pushHistory();
        const node: NodeDatum = {
          id,
          title: draft.title.trim(),
          type: draft.type,
          year: draft.year ? Number(draft.year) : new Date().getFullYear(),
          genres: draft.genres ? draft.genres.split(/[,;|]/).map((g) => g.trim()).filter(Boolean) : [],
          angle: randomAngle(),
          x: (Math.random() - 0.5) * 200,
          y: (Math.random() - 0.5) * 120,
        };
        setData((prev) => ({ nodes: [...prev.nodes, node], links: prev.links }));
      }
      setDraft({ title: "", type: draft.type, year: "", genres: "" });
    } else if (mode === "edit" && editingId) {
      pushHistory();
      setData((prev) => ({
        nodes: prev.nodes.map((n) => n.id === editingId ? {
          ...n,
          title: draft.title.trim(),
          type: draft.type,
          year: draft.year ? Number(draft.year) : n.year,
          genres: draft.genres ? draft.genres.split(/[,;|]/).map((g) => g.trim()).filter(Boolean) : [],
        } : n),
        links: prev.links,
      }));
      setMode("add"); setEditingId(null);
      setDraft({ title: "", type: "movie", year: "", genres: "" });
    }
  };

  // ✅ startEdit — needed by Graph onEdit prop
  const startEdit = (id: string) => {
    const n = data.nodes.find((x) => x.id === id);
    if (!n) return;
    setMode("edit");
    setEditingId(id);
    setDraft({
      title: n.title,
      type: n.type,
      year: String(n.year),
      genres: n.genres.join(", "),
    });
  };

  const deleteNode = (id: string) => {
    pushHistory();
    setData((prev) => ({
      nodes: prev.nodes.filter((n) => n.id !== id),
      links: prev.links.filter((l) =>
        (typeof l.source === "string" ? l.source !== id : l.source.id !== id) &&
        (typeof l.target === "string" ? l.target !== id : l.target.id !== id)
      ),
    }));
    if (editingId === id) { setMode("add"); setEditingId(null); setDraft({ title: "", type: "movie", year: "", genres: "" }); }
  };

  // helper to fully exit connect mode
  const cancelConnect = () => {
    setPendingSourceId(null);
    setPendingTargetId(null);
    setReasonOpen(false);
  };

  /* ---------------- Connect flow ---------------- */
  const connectStart = (id: string) => {
    if (pendingSourceId === id) {
      cancelConnect(); // toggle off if same note clicked
    } else {
      setPendingSourceId(id);
      setPendingTargetId(null);
      setReasonOpen(false);
    }
  };

  const nodeClick = (id: string) => {
    if (!pendingSourceId || pendingSourceId === id) return;
    setPendingTargetId(id);
    setReasonOpen(true);
  };

  const finalizeConnect = (reasonText: string) => {
    if (!pendingSourceId || !pendingTargetId) return;
    pushHistory();
    setData((prev) => ({
      nodes: prev.nodes,
      links: [...prev.links, { source: pendingSourceId, target: pendingTargetId, reason: reasonText || undefined, strength: 0.05 }],
    }));
    cancelConnect();
  };

  /* ---------------- Auto-connect ---------------- */
  const autoConnect = () => {
    pushHistory();
    setData((prev) => {
      const links: LinkDatum[] = [];
      for (let i = 0; i < prev.nodes.length; i++) {
        for (let j = i + 1; j < prev.nodes.length; j++) {
          const a = prev.nodes[i], b = prev.nodes[j];
          const shared = a.genres.filter((g) => b.genres.includes(g));
          if (shared.length) links.push({ source: a.id, target: b.id, reason: shared.slice(0, 2).join("/"), strength: 0.05 });
        }
      }
      return { nodes: prev.nodes, links };
    });
  };

  /* ---------------- Reset demo ---------------- */
  const resetDemo = () => {
    const fresh = demoData();
    setHistory((h) => [...h, { nodes: data.nodes.map(n => ({...n})), links: data.links.map(l => ({...l})) }]);
    setRedoStack([]); setData(fresh);
    setMode("add"); setEditingId(null);
    setDraft({ title: "", type: "movie", year: "", genres: "" });
    cancelConnect();
  };

  /* ---------------- CSV export ---------------- */
  const exportNodes = () => {
    const csv = Papa.unparse(
      data.nodes.map((n) => ({ id: n.id, title: n.title, type: n.type, year: n.year, genres: n.genres.join(", ") }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "nodes.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const exportSubmissions = () => {
    const csv = Papa.unparse(submissions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "submissions.csv"; a.click(); URL.revokeObjectURL(url);
  };

  /* ----------- ItemPage update ----------- */
  const updateNode = (id: string, patch: Partial<NodeDatum>) => {
    setHistory((h) => [...h, deepClone(data)]); setRedoStack([]);
    setData((prev) => ({ nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)), links: prev.links }));
  };

  /* --------------- Remove link --------------- */
  const removeLinkAtIndex = (idx: number) => {
    setHistory((h) => [...h, deepClone(data)]); setRedoStack([]);
    setData((prev) => ({ nodes: prev.nodes, links: prev.links.filter((_, i) => i !== idx) }));
  };

  /* --------------------- Home (editor) --------------------- */
  const Home = (
    <div className="min-h-screen w-full text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex flex-col">
            <div className="text-lg font-semibold">🧶 Red String Recs</div>
            <div className="text-xs text-neutral-500 italic -mt-1">I love you, Simone</div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button onClick={saveEditorState} className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-sm" title="Save editor data to your browser">Save</button>
            <button onClick={pushToPublic} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-sm" title="Publish current editor graph to the public view">Push to public</button>
            <button onClick={() => window.open("/public", "_blank")} className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-sm" title="Open a client-facing preview">Preview client</button>
            <button onClick={exportSubmissions} className="px-3 py-1.5 rounded-xl bg-neutral-100 ring-1 ring-neutral-300 text-sm" title="Download suggestions as CSV">Export submissions.csv</button>
            <button onClick={undo} className="px-3 py-1.5 rounded-xl bg-neutral-100 ring-1 ring-neutral-300 text-sm disabled:opacity-50" disabled={!history.length} title="Undo (Ctrl/Cmd+Z)">↶ Undo</button>
            <button onClick={redo} className="px-3 py-1.5 rounded-xl bg-neutral-100 ring-1 ring-neutral-300 text-sm disabled:opacity-50" disabled={!redoStack.length} title="Redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y)">↷ Redo</button>
          </div>
        </div>
        {toast && (
          <div className="pointer-events-none absolute right-4 top-20 rounded-xl bg-black/80 px-3 py-1.5 text-white text-xs">
            {toast}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-64px)]">
        <section className="lg:col-span-2 h-full rounded-2xl overflow-hidden ring-1 ring-neutral-200 bg-white">
          {data.nodes.length ? (
            <Graph
              data={data}
              readOnly={false}
              draggable={true}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              onEdit={startEdit}
              onDelete={deleteNode}
              onConnectStart={connectStart}
              onNodeClick={nodeClick}
              pendingSourceId={pendingSourceId}
              pendingTargetId={pendingTargetId}
              onRemoveLink={removeLinkAtIndex}
              onSubmitSuggestion={() => {}}
              cameraPersistKey="editor-camera"
            />
          ) : (
            <div className="h-full grid place-items-center text-neutral-500">
              No notes yet — use the form on the right.
            </div>
          )}
        </section>

        <aside className="lg:col-span-1 h-full rounded-2xl overflow-hidden ring-1 ring-neutral-200 bg-white">
          <Sidebar
            mode={mode}
            draft={draft}
            setDraft={(u) => setDraft((d) => u(d))}
            onSave={handleSave}
            onDelete={() => editingId && deleteNode(editingId)}
            onAutoConnect={autoConnect}
            onReset={resetDemo}
            counts={{ nodes: data.nodes.length, links: data.links.length }}
          />
          <div className="px-4 pb-4 flex items-center gap-2 text-xs text-neutral-500">
            <button onClick={exportNodes} className="px-2 py-1 rounded-lg bg-neutral-100 ring-1 ring-neutral-300">Export nodes.csv</button>
            {pendingSourceId && <span className="ml-auto text-rose-700">Connecting… click a second note</span>}
          </div>
        </aside>
      </main>

      <ReasonModal open={reasonOpen} onClose={cancelConnect} onSubmit={(txt) => finalizeConnect(txt || "")} />
    </div>
  );

  /* --------------------- Public (viewer) --------------------- */
  const PublicHome = (
    <div className="min-h-screen w-full text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex flex-col">
            <div className="text-lg font-semibold">🧶 Red String Recs</div>
            <div className="text-xs text-neutral-500 italic -mt-1">by Simone Lamont</div>
          </div>
          <div className="ml-auto">
            <a href="/" className="px-3 py-1.5 rounded-xl bg-neutral-100 ring-1 ring-neutral-300 text-sm">Back to editor</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-4 h-[calc(100vh-64px)]">
        <section className="h-[70vh] rounded-2xl overflow-hidden ring-1 ring-neutral-200 bg-white">
          <Graph
            data={publicData}
            readOnly={true}
            draggable={true}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onEdit={() => {}}
            onDelete={() => {}}
            onConnectStart={() => {}}
            onNodeClick={() => {}}
            pendingSourceId={null}
            pendingTargetId={null}
            onRemoveLink={() => {}}
            onSubmitSuggestion={() => {}}
            cameraPersistKey="public-camera"
          />
        </section>

        {/* Suggestion form (email optional) */}
        <section className="rounded-2xl overflow-hidden ring-1 ring-neutral-200 bg-white">
          <SuggestionForm
            onSubmit={(payload) => {
              const entry = { ...payload, createdAt: new Date().toISOString() as string };
              setSubmissions((prev) => {
                const next = [...prev, entry];
                try { localStorage.setItem("submissions", JSON.stringify(next)); } catch {}
                return next;
              });
              alert("Thanks! Your suggestion was submitted.");
            }}
          />
        </section>
      </main>
    </div>
  );

  /* --------------------- Router + routes --------------------- */
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={Home} />
        <Route path="/item/:id" element={<ItemPage data={data} onUpdate={updateNode} />} />
        <Route path="/public" element={PublicHome} />
        <Route path="/public/item/:id" element={<PublicItemPage data={publicData} />} />
      </Routes>
    </BrowserRouter>
  );
}

/* ---------------- Suggestion form (client) ---------------- */
function SuggestionForm({
  onSubmit,
}: {
  onSubmit: (p: { title: string; type: Kind; description: string; email?: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Kind>("movie");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");

  // Email is OPTIONAL
  const canSend = title.trim().length > 0 && description.trim().length > 0;

  return (
    <div className="p-4">
      <div className="text-sm font-medium mb-2">Suggest something</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="px-3 py-2 rounded-xl ring-1 ring-neutral-200 md:col-span-2" />
        <select value={type} onChange={(e) => setType(e.target.value as Kind)} className="px-3 py-2 rounded-xl ring-1 ring-neutral-200">
          <option value="movie">Movie</option>
          <option value="tv">TV</option>
          <option value="music">Music</option>
          <option value="book">Book</option>
        </select>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="px-3 py-2 rounded-xl ring-1 ring-neutral-200" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why should we watch/read/listen?" className="md:col-span-4 px-3 py-2 rounded-xl ring-1 ring-neutral-200 min-h-[80px]" />
      </div>
      <div className="mt-3 flex justify-end">
        <button
          disabled={!canSend}
          onClick={() => {
            if (!canSend) return;
            onSubmit({
              title: title.trim(),
              type,
              description: description.trim(),
              email: email.trim() || undefined,
            });
            setTitle(""); setType("movie"); setDescription(""); setEmail("");
          }}
          className={`px-4 py-2 rounded-xl ${canSend ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-500"}`}
        >
          Submit suggestion
        </button>
      </div>
    </div>
  );
}
