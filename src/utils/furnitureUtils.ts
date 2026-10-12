import type { CmPoint, FurnitureItem } from '../types';

// Corners of a furniture item in cm, with its rotation (clockwise, around the center)
export function furnitureCorners(f: FurnitureItem): CmPoint[] {
  const a = f.rotation * Math.PI / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const hw = f.widthCm / 2;
  const hd = f.depthCm / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => ({
    x: f.xCm + x * cos - y * sin,
    y: f.yCm + x * sin + y * cos,
  }));
}

// Furniture entirely inside the rect (marquee selection)
export function furnitureInRect(furniture: FurnitureItem[], r: { x: number; y: number; w: number; h: number }): string[] {
  return furniture
    .filter((f) => furnitureCorners(f).every((p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h))
    .map((f) => f.id);
}
