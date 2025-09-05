// src/components/NotebookPopup.tsx
import React from "react";
import type { NodeDatum } from "../lib/graph";

type Props = {
  node: NodeDatum;
  open: boolean;
  xOffset: number;   // where to place it relative to the sticky
  yOffset: number;
  angle?: number;    // keep upright vs. tilt with note (usually pass -angle)
  onOpenDetails: () => void; // open Item Page
};

const handwriting = `"Caveat","Patrick Hand","Comic Sans MS",cursive`;
const serif = `"EB Garamond","Georgia","Times New Roman",serif`;

export default function NotebookPopup({
  node: n,
  open,
  xOffset,
  yOffset,
  angle = 0,
  onOpenDetails,
}: Props) {
  const PREVIEW_W = 420;
  const PREVIEW_H = 300;

  const style: React.CSSProperties = {
    transformOrigin: "0% 0%",
    transform: open ? "scaleY(1) scaleX(1)" : "scaleY(0.02) scaleX(0.85)",
    opacity: open ? 1 : 0,
    transition: "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease-out",
    pointerEvents: open ? "auto" : "none",
    cursor: "pointer",
  };

  return (
    <g
      transform={`translate(${xOffset},${yOffset}) rotate(${angle})`}
      data-chip="1"
      onClick={(e) => {
        if (!open) return;
        e.stopPropagation();
        onOpenDetails();
      }}
      style={style}
    >
      {/* shadow */}
      <g opacity={0.18} transform="translate(4,8)">
        <rect x={0} y={0} width={PREVIEW_W} height={PREVIEW_H} rx={14} fill="#000" />
      </g>

      {/* card */}
      <g>
        <rect x={0} y={0} width={PREVIEW_W} height={PREVIEW_H} rx={14} fill="#f4eee2" stroke="#b19c82" />
        {/* poster */}
        {n.poster ? (
          <image href={n.poster} x={16} y={16} width={140} height={200} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <rect x={16} y={16} width={140} height={200} fill="#e5e7eb" />
        )}
        {/* title & meta */}
        <text x={170} y={40} fontSize={26} fontWeight={700} style={{ fontFamily: handwriting }} fill="#1f2937">
          {n.title}
        </text>
        <text x={170} y={68} fontSize={16} style={{ fontFamily: serif }} fill="#2d2a25">
          {n.type.toUpperCase()} • {n.year}
        </text>
        <text x={170} y={92} fontSize={15} style={{ fontFamily: serif }} fill="#3a362d">
          {n.genres.length ? n.genres.slice(0, 6).join(", ") : "—"}
        </text>
        <text x={170} y={PREVIEW_H - 18} fontSize={13} fill="#6b7280">
          Click to open →
        </text>
      </g>
    </g>
  );
}
