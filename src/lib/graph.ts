// src/lib/graph.ts
// Core graph types + helpers shared by components

export type Kind = "movie" | "tv" | "music" | "book";

export type NodeDatum = {
  id: string;
  title: string;
  type: Kind;
  year: number;
  genres: string[];
  rating?: number;
  angle?: number;
  poster?: string;
  review?: string;
  director?: string;
  streaming?: string;

  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
};

export type LinkDatum = {
  source: string | NodeDatum;
  target: string | NodeDatum;
  reason?: string;
  strength?: number;
};

// Bigger notes
export const NOTE_W = 360;
export const NOTE_H = 220;

// Pin position relative to note
export const PIN_LOCAL = { x: 0, y: -NOTE_H / 2 - 2 };

export function randomAngle() {
  return Math.round((Math.random() * 8 - 4) * 10) / 10;
}

export function pinAnchor(n: NodeDatum) {
  const a = ((n.angle ?? 0) * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const rx = PIN_LOCAL.x * cos - PIN_LOCAL.y * sin;
  const ry = PIN_LOCAL.x * sin + PIN_LOCAL.y * cos;
  return { x: (n.x ?? 0) + rx, y: (n.y ?? 0) + ry };
}

// Red “string” with gravity sag (cubic Bézier)
export function corkStringPath(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const dist = Math.hypot(dx, dy) || 1;
  const sag = Math.min(120, dist / 3);
  const c1x = ax + dx / 3, c2x = ax + (2 * dx) / 3;
  const c1y = ay + sag,   c2y = by + sag;
  return `M ${ax},${ay} C ${c1x},${c1y} ${c2x},${c2y} ${bx},${by}`;
}
