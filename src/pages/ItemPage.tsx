// src/pages/ItemPage.tsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import type { NodeDatum, LinkDatum, Kind } from "../lib/graph";

type Props = {
  data: { nodes: NodeDatum[]; links: LinkDatum[] };
  onUpdate: (id: string, patch: Partial<NodeDatum>) => void;
};

// Default posters for demo items; others will get a placeholder
const DEFAULT_POSTERS: Record<string, string> = {
  inception: "https://image.tmdb.org/t/p/w200/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg",
  interstellar: "https://image.tmdb.org/t/p/w200/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg",
  dark: "https://image.tmdb.org/t/p/w200/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg",
  got: "https://image.tmdb.org/t/p/w200/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
  arrival: "https://image.tmdb.org/t/p/w200/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
};

function suggestedPoster(id: string, title: string) {
  if (DEFAULT_POSTERS[id]) return DEFAULT_POSTERS[id];
  const text = encodeURIComponent(title || "Poster");
  // Simple readable placeholder; you can swap to any image service you like
  return `https://placehold.co/400x600?text=${text}`;
}

export default function ItemPage({ data, onUpdate }: Props) {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const item = useMemo(
    () => data.nodes.find((n) => n.id === id),
    [data.nodes, id]
  );

  // linked items + reasons
  const linked = useMemo(() => {
    if (!item) return [];
    return data.links
      .filter((l) => {
        const s = typeof l.source === "string" ? l.source : l.source.id;
        const t = typeof l.target === "string" ? l.target : l.target.id;
        return s === item.id || t === item.id;
      })
      .map((l) => {
        const s = typeof l.source === "string" ? l.source : l.source.id;
        const t = typeof l.target === "string" ? l.target : l.target.id;
        const otherId = s === item.id ? t : s;
        const other = data.nodes.find((n) => n.id === otherId);
        return { other, reason: l.reason ?? "" };
      })
      .filter((x) => !!x.other);
  }, [data.links, data.nodes, item]);

  // Form state — EVERYTHING editable, including type
  const [form, setForm] = useState({
    title: "",
    type: "movie" as Kind,
    streaming: "",
    director: "",
    year: "",
    genresCSV: "",
    review: "",
    poster: "",
  });

  useEffect(() => {
    if (!item) return;
    setForm({
      title: item.title ?? "",
      type: item.type,
      streaming: (item as any).streaming ?? "",
      director: (item as any).director ?? "",
      year: String(item.year ?? ""),
      genresCSV: (item.genres ?? []).join(", "),
      review: item.review ?? "",
      poster: item.poster ?? "",
    });
  }, [item?.id]);

  if (!item) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-4">
            <Link to="/" className="text-blue-600 hover:underline">
              ← Back to graph
            </Link>
          </div>
          <div className="rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
            <div className="text-lg">Item not found</div>
            <div className="text-neutral-500">No item with id “{id}”.</div>
          </div>
        </div>
      </div>
    );
  }

  // File → Data URL helper for PNG/JPEG
  const handlePosterFile = (file: File | null) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg)$/.test(file.type)) {
      alert("Please choose a PNG or JPEG image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, poster: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    onUpdate(item.id, {
      title: form.title.trim() || item.title,
      type: form.type,
      review: form.review,
      poster: form.poster, // can be URL or data URL from upload
      // optional extras
      // @ts-ignore
      streaming: form.streaming,
      // @ts-ignore
      director: form.director,
      year: form.year ? Number(form.year) : item.year,
      genres: form.genresCSV
        ? form.genresCSV
            .split(/[,;|]/)
            .map((g) => g.trim())
            .filter(Boolean)
        : [],
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 ring-1 ring-neutral-300 text-sm"
          >
            ← Back
          </button>
          <div className="ml-2 font-semibold">Item details</div>
          <div className="ml-auto">
            <Link
              to="/"
              className="px-3 py-1.5 rounded-xl bg-neutral-100 ring-1 ring-neutral-300 text-sm"
            >
              Graph
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Poster */}
        <section className="md:col-span-1">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
            <div className="text-sm font-medium mb-2">Poster</div>
            <div className="aspect-[2/3] w-full overflow-hidden rounded-xl ring-1 ring-neutral-200 bg-neutral-100 grid place-items-center">
              {form.poster ? (
                <img
                  src={form.poster}
                  alt={form.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-neutral-400 text-sm">No poster</div>
              )}
            </div>

            {/* Upload PNG/JPEG */}
            <label className="mt-3 block text-xs text-neutral-600">
              Upload image (PNG or JPEG)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => handlePosterFile(e.target.files?.[0] || null)}
              className="mt-1 w-full rounded-xl ring-1 ring-neutral-200 p-2 bg-white"
            />

            {/* Or paste a URL */}
            <label className="mt-3 block text-xs text-neutral-600">
              Or paste image URL
            </label>
            <input
              className="mt-1 w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
              placeholder="https://…"
              value={form.poster}
              onChange={(e) => setForm((f) => ({ ...f, poster: e.target.value }))}
            />

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setForm((f) => ({ ...f, poster: "" }))}
                className="px-3 py-1.5 rounded-lg bg-neutral-100 ring-1 ring-neutral-300 text-xs"
              >
                Clear poster
              </button>
              <button
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    poster: suggestedPoster(item.id, f.title),
                  }))
                }
                className="px-3 py-1.5 rounded-lg bg-neutral-100 ring-1 ring-neutral-300 text-xs"
                title="Restore the default suggestion"
              >
                Suggested poster
              </button>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="md:col-span-2">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-neutral-600">Title</label>
                <input
                  className="w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs text-neutral-600">Type</label>
                <select
                  className="w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200 bg-white"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value as Kind }))
                  }
                >
                  <option value="movie">Movie</option>
                  <option value="tv">TV</option>
                  <option value="music">Music</option>
                  <option value="book">Book</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-600">Year</label>
                <input
                  className="w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
                  value={form.year}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, year: e.target.value }))
                  }
                  placeholder="e.g., 2016"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-600">Streaming</label>
                <input
                  className="w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
                  value={form.streaming}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, streaming: e.target.value }))
                  }
                  placeholder="Netflix, Max, etc."
                />
              </div>

              <div>
                <label className="text-xs text-neutral-600">Director / Creator</label>
                <input
                  className="w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
                  value={form.director}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, director: e.target.value }))
                  }
                  placeholder="Name"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-neutral-600">Genres (comma-separated)</label>
                <input
                  className="w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200"
                  value={form.genresCSV}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, genresCSV: e.target.value }))
                  }
                  placeholder="Sci-fi, Drama"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-600">Review / Notes</label>
              <textarea
                className="mt-1 w-full px-3 py-2 rounded-xl ring-1 ring-neutral-200 min-h-[120px]"
                value={form.review}
                onChange={(e) =>
                  setForm((f) => ({ ...f, review: e.target.value }))
                }
                placeholder="What did you like, themes, vibes…"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={save}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white"
              >
                Save
              </button>
              <button
                onClick={() =>
                  setForm({
                    title: item.title ?? "",
                    type: item.type,
                    streaming: (item as any).streaming ?? "",
                    director: (item as any).director ?? "",
                    year: String(item.year ?? ""),
                    genresCSV: (item.genres ?? []).join(", "),
                    review: item.review ?? "",
                    poster: item.poster ?? "",
                  })
                }
                className="px-4 py-2 rounded-xl bg-neutral-100 ring-1 ring-neutral-300"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Linked items */}
          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
            <div className="text-sm font-medium mb-2">Linked items</div>
            {linked.length === 0 ? (
              <div className="text-neutral-500 text-sm">No connections yet.</div>
            ) : (
              <ul className="space-y-2">
                {linked.map(({ other, reason }, idx) => (
                  <li
                    key={other!.id + idx}
                    className="flex items-center justify-between gap-3 rounded-xl ring-1 ring-neutral-200 p-2"
                  >
                    <div className="flex items-center gap-3">
                      {other!.poster ? (
                        <img
                          src={other!.poster}
                          alt={other!.title}
                          className="h-12 w-8 object-cover rounded-md ring-1 ring-neutral-200"
                        />
                      ) : (
                        <div className="h-12 w-8 rounded-md bg-neutral-200" />
                      )}
                      <div>
                        <Link
                          to={`/item/${other!.id}`}
                          className="font-medium hover:underline"
                        >
                          {other!.title}
                        </Link>
                        <div className="text-xs text-neutral-500">
                          {reason || "(no reason provided)"}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/"
                      className="text-xs px-2 py-1 rounded-lg bg-neutral-100 ring-1 ring-neutral-300"
                    >
                      View on graph →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
