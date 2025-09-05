// src/pages/PublicItemPage.tsx
import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import type { NodeDatum, LinkDatum } from "../lib/graph";

type Props = {
  data: { nodes: NodeDatum[]; links: LinkDatum[] };
};

export default function PublicItemPage({ data }: Props) {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const item = useMemo(
    () => data.nodes.find((n) => n.id === id),
    [data.nodes, id]
  );

  const linked = useMemo(() => {
    if (!item) return [];
    return data.links
      .map((l) => {
        const s = typeof l.source === "string" ? l.source : l.source.id;
        const t = typeof l.target === "string" ? l.target : l.target.id;
        if (s !== item.id && t !== item.id) return null;
        const otherId = s === item.id ? t : s;
        const other = data.nodes.find((n) => n.id === otherId);
        return other ? { other, reason: l.reason ?? "" } : null;
      })
      .filter(Boolean) as { other: NodeDatum; reason: string }[];
  }, [data.links, data.nodes, item]);

  if (!item) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-4">
            <Link to="/public" className="text-blue-600 hover:underline">
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
          <div className="ml-2 font-semibold">Recommendation</div>
          <div className="ml-auto">
            <Link
              to="/public"
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
              {item.poster ? (
                <img src={item.poster} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="text-neutral-400 text-sm">No poster</div>
              )}
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="md:col-span-2">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200 space-y-3">
            <div className="text-2xl font-semibold">{item.title}</div>
            <div className="text-sm text-neutral-600">
              {item.type.toUpperCase()} • {item.year}
            </div>
            {(item as any).streaming && (
              <div className="text-sm"><span className="font-medium">Streaming:</span> {(item as any).streaming}</div>
            )}
            {(item as any).director && (
              <div className="text-sm"><span className="font-medium">Director/Creator:</span> {(item as any).director}</div>
            )}
            {item.genres?.length ? (
              <div className="text-sm"><span className="font-medium">Genres:</span> {item.genres.join(", ")}</div>
            ) : null}
            {item.review && (
              <div className="text-sm"><span className="font-medium">Review:</span> {item.review}</div>
            )}
          </div>

          {/* Linked items */}
          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
            <div className="text-sm font-medium mb-2">Connected items</div>
            {linked.length === 0 ? (
              <div className="text-neutral-500 text-sm">No connections yet.</div>
            ) : (
              <ul className="space-y-2">
                {linked.map(({ other, reason }, idx) => (
                  <li
                    key={other.id + idx}
                    className="flex items-center justify-between gap-3 rounded-xl ring-1 ring-neutral-200 p-2"
                  >
                    <div className="flex items-center gap-3">
                      {other.poster ? (
                        <img
                          src={other.poster}
                          alt={other.title}
                          className="h-12 w-8 object-cover rounded-md ring-1 ring-neutral-200"
                        />
                      ) : (
                        <div className="h-12 w-8 rounded-md bg-neutral-200" />
                      )}
                      <div>
                        <Link to={`/public/item/${other.id}`} className="font-medium hover:underline">
                          {other.title}
                        </Link>
                        <div className="text-xs text-neutral-500">
                          {reason || "(no reason provided)"}
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/public"
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
