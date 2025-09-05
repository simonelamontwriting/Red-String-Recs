// src/components/Sidebar.tsx
import { type Kind } from "../lib/graph";

type Draft = { title: string; type: Kind; year: string; genres: string };

export default function Sidebar({
  mode,
  draft,
  setDraft,
  onSave,
  onDelete,
  onAutoConnect,
  onReset,
  counts,
}: {
  mode: "add" | "edit";
  draft: Draft;
  setDraft: (u: (d: Draft) => Draft) => void;
  onSave: () => void;
  onDelete: () => void;
  onAutoConnect: () => void;
  onReset: () => void;
  counts: { nodes: number; links: number };
}) {
  const canSave = draft.title.trim().length > 0;
  return (
    <div className="h-full w-full flex flex-col gap-4 p-4 bg-white">
      <div className="text-sm text-neutral-600">Currently: <b>{counts.nodes}</b> notes, <b>{counts.links}</b> strings.</div>

      <div className="rounded-2xl ring-1 ring-neutral-200 bg-white p-3">
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
          {mode === "add" ? "Add a title" : "Edit title"}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={draft.title} onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Title (required)" className="col-span-2 px-3 py-2 rounded-xl ring-1 ring-neutral-200 focus:outline-none" />
          <select value={draft.type} onChange={(e) => setDraft(d => ({ ...d, type: e.target.value as Kind }))} className="px-3 py-2 rounded-xl ring-1 ring-neutral-200">
            <option value="movie">Movie</option>
            <option value="tv">TV</option>
            <option value="music">Music</option>
            <option value="book">Book</option>
          </select>
          <input value={draft.year} onChange={(e) => setDraft(d => ({ ...d, year: e.target.value }))} placeholder="Year (e.g., 2014)" className="px-3 py-2 rounded-xl ring-1 ring-neutral-200" />
          <input value={draft.genres} onChange={(e) => setDraft(d => ({ ...d, genres: e.target.value }))} placeholder="Genres (comma-sep)" className="col-span-2 px-3 py-2 rounded-xl ring-1 ring-neutral-200" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={onSave} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${canSave ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-400"}`}>
            {mode === "add" ? "Add" : "Save"}
          </button>
          {mode === "edit" && (
            <button onClick={onDelete} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500">Delete</button>
          )}
        </div>
      </div>

      <div className="rounded-2xl ring-1 ring-neutral-200 bg-white p-3 flex flex-wrap gap-2 items-center">
        <button onClick={onAutoConnect} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 text-white">Auto-connect (by genre)</button>
        <button onClick={onReset} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 ring-1 ring-neutral-300">Reset demo</button>
      </div>

      <div className="text-xs text-neutral-500">Drag notes with the mouse. Click 🔗 to connect two notes (reason optional). Double-click a note for details.</div>
    </div>
  );
}
