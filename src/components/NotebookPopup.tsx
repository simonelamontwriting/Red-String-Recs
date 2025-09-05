// src/components/NotebookPopup.tsx
import { notebookPaperPath } from "../lib/graph";
import type { NodeDatum } from "../lib/graph";

type Props = {
  n: NodeDatum;
  x: number;
  y: number;
};

export default function NotebookPopup({ n, x, y }: Props) {
  const w = 240,
    h = 360; // tall card
  const posterW = 180,
    posterH = 240;
  const paperPath = notebookPaperPath(w, h);

  const genresY = (n.poster ? 40 + posterH + 18 : 60);

  return (
    <g transform={`translate(${x},${y})`}>
      {/* shadow */}
      <g opacity={0.18} transform="translate(3,6)">
        <path d={paperPath} fill="#000" />
      </g>

      {/* paper */}
      <path d={paperPath} fill="#fffdfa" stroke="#e5e7eb" />

      {/* red margin */}
      <line x1={26} y1={12} x2={26} y2={h - 12} stroke="#fca5a5" strokeWidth={1} />
      {/* blue rule lines */}
      {Array.from({ length: Math.floor((h - 28) / 14) }).map((_, i) => (
        <line
          key={i}
          x1={10}
          y1={22 + i * 14}
          x2={w - 10}
          y2={22 + i * 14}
          stroke="#93c5fd"
          strokeWidth={0.8}
        />
      ))}

      {/* title */}
      <text x={36} y={28} fontSize={14} fontWeight={700} fill="#111827">
        {n.title}
      </text>

      {/* poster */}
      {n.poster && (
        <image
          href={n.poster}
          x={30}
          y={40}
          width={posterW}
          height={posterH}
          preserveAspectRatio="xMidYMid slice"
        />
      )}

      {/* genres */}
      <text x={30} y={genresY} fontSize={12} fontWeight={600} fill="#111827">
        Genres
      </text>
      <text x={30} y={genresY + 16} fontSize={12} fill="#374151">
        {n.genres.length ? n.genres.join(", ") : "—"}
      </text>

      {/* review spot */}
      <text x={30} y={h - 64} fontSize={12} fontWeight={600} fill="#111827">
        Review
      </text>
      <text x={30} y={h - 46} fontSize={12} fill="#6b7280">
        {n.review ? n.review : "(add later)"}
      </text>
    </g>
  );
}
