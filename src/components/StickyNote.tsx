// src/components/StickyNote.tsx
import type { NodeDatum } from "../lib/graph";
import { NOTE_W, NOTE_H } from "../lib/graph";
import NotebookPopup from "./NotebookPopup";

type Props = {
  node: NodeDatum;
  readOnly?: boolean;
  draggable?: boolean;

  hovered: boolean;
  connectMode: boolean;
  isConnectSource: boolean;
  isConnectTarget: boolean;

  onEnter: (id: string) => void;
  onLeave: (id: string) => void;
  onPointerDown: (e: React.PointerEvent, n: NodeDatum) => void;

  onClickNote: (id: string) => void;         // pick target when connecting
  onDoubleClickNote: (id: string) => void;   // open item page

  onConnectStart: (id: string) => void;      // toggle connect mode / set source
  onOpenDetails: (id: string) => void;       // used by preview click
  onEdit: (id: string) => void;              // open sidebar
  onDelete: (id: string) => void;
};

const handwriting = `"Caveat","Patrick Hand","Comic Sans MS",cursive`;
const serif = `"EB Garamond","Georgia","Times New Roman",serif`;

const isChip = (el: Element | null) =>
  !!(el?.getAttribute("data-chip") === "1" || (el as any)?.closest?.('[data-chip="1"]'));

export default function StickyNote({
  node: n,
  readOnly = false,
  draggable = !readOnly,
  hovered,
  connectMode,
  isConnectSource,
  isConnectTarget,
  onEnter,
  onLeave,
  onPointerDown,
  onClickNote,
  onDoubleClickNote,
  onConnectStart,
  onOpenDetails,
  onEdit,
  onDelete,
}: Props) {
  const x = n.x ?? 0;
  const y = n.y ?? 0;
  const angle = n.angle ?? 0;

  // Dark-academia white paper; red border when highlighted for connect
  const borderColor = isConnectSource || isConnectTarget ? "#ef4444" : "#a08a70";
  const borderWidth = isConnectSource || isConnectTarget ? 3 : 1.2;

  return (
    <g
      transform={`translate(${x},${y}) rotate(${angle})`}
      onMouseEnter={() => onEnter(n.id)}
      onMouseLeave={() => onLeave(n.id)}
      onPointerDown={(e) => {
        if (isChip(e.target as Element)) return;
        if (draggable) onPointerDown(e, n);
      }}
      onClick={(e) => {
        if (isChip(e.target as Element)) return;
        if (connectMode) onClickNote(n.id);
        else if (!readOnly) onEdit(n.id);
      }}
      onDoubleClick={(e) => {
        if (isChip(e.target as Element)) return;
        onDoubleClickNote(n.id);
      }}
      className={draggable ? "cursor-grab" : "cursor-pointer"}
    >
      {/* paper */}
      <rect
        x={-NOTE_W / 2}
        y={-NOTE_H / 2}
        width={NOTE_W}
        height={NOTE_H}
        rx={3}
        ry={3}
        fill="#f9f6ef"
        stroke={borderColor}
        strokeWidth={borderWidth}
        style={{ filter: "url(#noteShadow)" }}
      />

      {/* red pin at top-center (PNG at public/pins/red-pin.png) */}
      <image
        href="/pins/red-pin.png"
        x={-12}
        y={-NOTE_H / 2 - 6}
        width={24}
        height={28}
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: "none" }}
      />

      {/* BIGGER text */}
      <text
        x={-NOTE_W / 2 + 16}
        y={-NOTE_H / 2 + 48}
        fontSize={30}
        fontWeight={700}
        style={{ fontFamily: handwriting }}
        fill="#111827"
      >
        {n.title}
      </text>
      <text
        x={-NOTE_W / 2 + 16}
        y={-NOTE_H / 2 + 78}
        fontSize={18}
        style={{ fontFamily: serif }}
        fill="#2e2b26"
      >
        {n.type.toUpperCase()} • {n.year}
      </text>
      {n.genres.length > 0 && (
        <text
          x={-NOTE_W / 2 + 16}
          y={-NOTE_H / 2 + 102}
          fontSize={16}
          style={{ fontFamily: serif }}
          fill="#3b372f"
        >
          {n.genres.slice(0, 3).join(" • ")}
        </text>
      )}

      {/* translucent pencil overlay (editor only) */}
      {hovered && !connectMode && !readOnly && (
        <text x={0} y={12} textAnchor="middle" fontSize={58} opacity={0.18} style={{ pointerEvents: "none" }}>
          ✏️
        </text>
      )}

      {/* top-right controls (editor only) */}
      {hovered && !readOnly && (
        <g transform={`translate(${NOTE_W / 2 - 16},${-NOTE_H / 2 + 16})`}>
          {/* Connect — TEXT ONLY (no visible rectangle). Large invisible hitbox for easy clicking */}
          <g transform="translate(-100,0)">
            <rect
              data-chip="1"
              x={-60}
              y={-18}
              width={120}
              height={36}
              rx={12}
              ry={12}
              fill="transparent"
              stroke="none"
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                onConnectStart(n.id);
              }}
            />
            <text
              x={0}
              y={6}
              textAnchor="middle"
              fontSize={18}
              fontWeight={700}
              fill="#3b2f1f"
              style={{ fontFamily: serif, pointerEvents: "none" }}
            >
              Connect
            </text>
          </g>
        </g>
      )}

      {/* bottom-right Delete (editor only) */}
      {hovered && !readOnly && (
        <g transform={`translate(${NOTE_W / 2 - 82}, ${NOTE_H / 2 - 30})`}>
          <rect
            data-chip="1"
            x={0}
            y={0}
            width={78}
            height={28}
            rx={9}
            ry={9}
            fill="#fee2e2"
            stroke="#ef4444"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(n.id);
            }}
            style={{ cursor: "pointer" }}
          />
          <text
            x={39}
            y={18}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            fill="#b91c1c"
            style={{ pointerEvents: "none" }}
          >
            Delete
          </text>
        </g>
      )}

      {/* ---------- PREVIEW via separate component ---------- */}
      <NotebookPopup
        node={n}
        open={hovered}
        xOffset={NOTE_W / 2 + 22}  // move horizontally (increase for farther right; negate to put on left)
        yOffset={-NOTE_H / 2}      // move vertically (increase to move down)
        angle={-(n.angle ?? 0)}    // keeps preview upright; remove if you want it tilted with note
        onOpenDetails={() => onOpenDetails(n.id)}
      />
    </g>
  );
}
