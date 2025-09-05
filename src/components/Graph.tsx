// src/components/Graph.tsx
import { useRef, useState, useEffect } from "react";
import StickyNote from "./StickyNote";
import { type NodeDatum, type LinkDatum, pinAnchor, corkStringPath } from "../lib/graph";

type Props = {
  data: { nodes: NodeDatum[]; links: LinkDatum[] };
  readOnly?: boolean;
  draggable?: boolean;

  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;

  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onConnectStart: (id: string) => void; // toggles connect mode / sets source
  onNodeClick: (id: string) => void;    // pick target in connect mode

  pendingSourceId: string | null;
  pendingTargetId: string | null;

  onRemoveLink: (index: number) => void;
  onSubmitSuggestion?: (p?: any) => void;

  cameraPersistKey?: string;
};

const W = 1100;
const H = 720;
const WORLD_PAD = 50000;

export default function Graph({
  data,
  readOnly = false,
  draggable = !readOnly,
  hoveredId,
  setHoveredId,
  onEdit,
  onDelete,
  onConnectStart,
  onNodeClick,
  pendingSourceId,
  pendingTargetId,
  onRemoveLink,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSubmitSuggestion: _onSubmitSuggestion,
  cameraPersistKey = "graph-camera",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const worldRef = useRef<SVGGElement | null>(null);
  const [, setTick] = useState(0);

  // Camera (pan/zoom)
  const [cam, setCam] = useState<{ k: number; tx: number; ty: number }>(() => {
    try {
      const raw = localStorage.getItem(cameraPersistKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { k: 1, tx: 0, ty: 0 };
  });
  useEffect(() => {
    try {
      localStorage.setItem(cameraPersistKey, JSON.stringify(cam));
    } catch {}
  }, [cam, cameraPersistKey]);

  const panning = useRef(false);
  const panPrev = useRef<{ x: number; y: number } | null>(null);
  const dragNode = useRef<NodeDatum | null>(null);

  // Link hover overlay (reason bubble + scissors)
  const [hoverLink, setHoverLink] = useState<{ index: number; cx: number; cy: number; reason?: string } | null>(null);

  /* ---------------- Coords ---------------- */
  const toSvgLocal = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const toWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const world = worldRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = world.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  /* ---------------- Background pan/zoom ---------------- */
  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (dragNode.current) return;
    panning.current = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    panPrev.current = toSvgLocal(e.clientX, e.clientY);
    setHoverLink(null); // click background also clears link hover
  };
  const onBackgroundPointerMove = (e: React.PointerEvent) => {
    if (dragNode.current) return;
    if (!panning.current || !panPrev.current) return;
    const now = toSvgLocal(e.clientX, e.clientY);
    const dx = now.x - panPrev.current.x;
    const dy = now.y - panPrev.current.y;
    panPrev.current = now;
    setCam((c) => ({ ...c, tx: c.tx + dx, ty: c.ty + dy }));
  };
  const onBackgroundPointerUp = () => {
    panning.current = false;
    panPrev.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!svgRef.current || !worldRef.current) return;
    const svg = svgRef.current;
    const world = worldRef.current;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    const svgLocal = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const worldLocal = pt.matrixTransform(world.getScreenCTM()!.inverse());

    let factor: number;
    if (e.ctrlKey) factor = Math.exp(-e.deltaY * 0.002);
    else factor = e.deltaY > 0 ? 0.9 : 1.1;

    const k = Math.min(5, Math.max(0.2, cam.k * factor));
    const tx = svgLocal.x - k * worldLocal.x;
    const ty = svgLocal.y - k * worldLocal.y;
    setCam({ k, tx, ty });
    setHoverLink(null); // zoom also clears bubble
  };

  /* ---------------- Node drag ---------------- */
  const onNotePointerDown = (e: React.PointerEvent, n: NodeDatum) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    if (draggable) dragNode.current = n;
  };
  const onSvgPointerMove = (e: React.PointerEvent) => {
    if (!dragNode.current) return;
    const p = toWorld(e.clientX, e.clientY);
    dragNode.current.x = p.x;
    dragNode.current.y = p.y;
    setTick((t) => t + 1);
  };
  const onSvgPointerUp = () => {
    if (!dragNode.current) return;
    dragNode.current = null;
  };

  /* ---------------- Dark-academia corkboard ---------------- */
  const corkStyle: React.CSSProperties = {
    backgroundColor: "#2b241b",
    backgroundImage:
      "radial-gradient(rgba(0,0,0,0.22) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.06) 2px, transparent 2px), linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0))",
    backgroundSize: "20px 20px, 10px 10px, 100% 100%",
    backgroundPosition: "0 0, 6px 6px, 0 0",
  };

  const zoomAtCenter = (factor: number) => {
    if (!svgRef.current || !worldRef.current || !containerRef.current) return;
    const svg = svgRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const pt = svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;

    const svgLocal = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const worldLocal = pt.matrixTransform(worldRef.current!.getScreenCTM()!.inverse());

    const k = Math.min(5, Math.max(0.2, cam.k * factor));
    const tx = svgLocal.x - k * worldLocal.x;
    const ty = svgLocal.y - k * worldLocal.y;
    setCam({ k, tx, ty });
    setHoverLink(null);
  };
  const resetView = () => setCam({ k: 1, tx: 0, ty: 0 });

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {/* Zoom UI */}
      <div className="pointer-events-auto absolute left-3 top-3 z-10 flex flex-col gap-1">
        <button className="rounded-lg bg-white/90 ring-1 ring-neutral-300 px-2 py-1 text-sm" onClick={() => zoomAtCenter(1.1)} title="Zoom in">+</button>
        <button className="rounded-lg bg-white/90 ring-1 ring-neutral-300 px-2 py-1 text-sm" onClick={() => zoomAtCenter(0.9)} title="Zoom out">−</button>
        <button className="rounded-lg bg-white/90 ring-1 ring-neutral-300 px-2 py-1 text-xs" onClick={resetView} title="Reset view">reset</button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`-${W / 2} -${H / 2} ${W} ${H}`}
        className="h-full w-full"
        style={corkStyle}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onWheel={onWheel}
      >
        <defs>
          <filter id="stringGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="noteShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* World (pan/zoom container) */}
        <g ref={worldRef} transform={`translate(${cam.tx},${cam.ty}) scale(${cam.k})`}>
          {/* massive invisible backdrop */}
          <rect
            x={-W / 2 - WORLD_PAD}
            y={-H / 2 - WORLD_PAD}
            width={W + WORLD_PAD * 2}
            height={H + WORLD_PAD * 2}
            fill="transparent"
            onPointerDown={onBackgroundPointerDown}
            onPointerMove={onBackgroundPointerMove}
            onPointerUp={onBackgroundPointerUp}
          />

          {/* Strings */}
          {data.links.map((l, i) => {
            const s = typeof l.source === "string" ? data.nodes.find((n) => n.id === l.source)! : (l.source as NodeDatum);
            const t = typeof l.target === "string" ? data.nodes.find((n) => n.id === l.target)! : (l.target as NodeDatum);
            if (!s || !t || s.x == null || s.y == null || t.x == null || t.y == null) return null;

            const sa = pinAnchor(s);
            const ta = pinAnchor(t);
            const d = corkStringPath(sa.x, sa.y, ta.x, ta.y);

            const dx = ta.x - sa.x;
            const dy = ta.y - sa.y;
            const dist = Math.hypot(dx, dy) || 1;
            const sag = Math.min(120, dist / 3);
            const midx = (sa.x + ta.x) / 2;
            const midy = (sa.y + ta.y) / 2 + sag * 0.35;

            return (
              <g key={i}>
                <path d={d} stroke="#a33a30" strokeWidth={2.8} strokeOpacity={0.95} fill="none" style={{ filter: "url(#stringGlow)" }} />
                {/* Fat invisible hover hitbox */}
                <path
            d={d}
            stroke="transparent"
            strokeWidth={28}                      // fat hitbox along the whole string
            fill="none"
            style={{ cursor: "pointer" }}        // (optional: custom cursor below)
            onMouseEnter={(e) => {
              const p = toWorld(e.clientX, e.clientY);
              setHoverLink({ index: i, cx: p.x, cy: p.y, reason: l.reason });
            }}
            onMouseMove={(e) => {
              const p = toWorld(e.clientX, e.clientY);
              setHoverLink({ index: i, cx: p.x, cy: p.y, reason: l.reason });
            }}
            onMouseLeave={() => setHoverLink(null)}
            onClick={() => onRemoveLink(i)}      // ← cuts the string wherever you click
          />

              </g>
            );
          })}

          {/* Notes on top */}
          {data.nodes.map((n) => (
            <StickyNote
              key={n.id}
              node={n}
              readOnly={readOnly}
              draggable={draggable}
              hovered={hoveredId === n.id}
              connectMode={!!pendingSourceId}
              isConnectSource={pendingSourceId === n.id}
              isConnectTarget={pendingTargetId === n.id}
              onEnter={(id) => setHoveredId(id)}
              onLeave={(id) => setHoveredId((prev) => (prev === id ? null : prev))}
              onPointerDown={onNotePointerDown}
              onClickNote={(id) => onNodeClick(id)}
              onDoubleClickNote={(id) => {
                if (!readOnly) window.location.href = `/item/${id}`;
                else window.location.href = `/public/item/${id}`;
              }}
              onConnectStart={onConnectStart}
              onOpenDetails={(id) => {
                if (!readOnly) window.location.href = `/item/${id}`;
                else window.location.href = `/public/item/${id}`;
              }}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}

          {/* FRONTMOST overlay: reason bubble + scissors */}
          {hoverLink && (
            <g transform={`translate(${hoverLink.cx},${hoverLink.cy})`}>
              {/* reason bubble */}
              <g>
                <g opacity={0.28} transform="translate(3,6)">
                  <rect x={-170} y={-54} width={340} height={38} rx={10} fill="#0b0b0b" />
                </g>
                <rect x={-170} y={-54} width={340} height={38} rx={10} fill="#111827" stroke="#2a2f3a" />
                <text x={-160} y={-30} fontSize={13} fill="#f8fafc">
                  {hoverLink.reason ? hoverLink.reason : "Connected"}
                </text>
              </g>
              {/* scissors icon with HUGE hit area */}
              <g transform="translate(0,0)" style={{ cursor: "pointer" }} onClick={() => onRemoveLink(hoverLink.index)}>
                <circle cx={0} cy={0} r={28} fill="transparent" />
                <text x={-12} y={9} fontSize={30}>✂️</text>
              </g>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
