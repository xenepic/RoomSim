import type { ImagePoint } from '../types';

export const AXIS_SNAP_TOLERANCE_DEG = 7;

// Snap b onto the horizontal/vertical axis through a when the line a→b is
// within the tolerance of that axis. Room dimensions are almost always axis-aligned.
export function snapToAxis(a: ImagePoint, b: ImagePoint, toleranceDeg = AXIS_SNAP_TOLERANCE_DEG): ImagePoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return b;
  const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);   // 0..180
  if (angle <= toleranceDeg || angle >= 180 - toleranceDeg) return { x: b.x, y: a.y };
  if (Math.abs(angle - 90) <= toleranceDeg) return { x: a.x, y: b.y };
  return b;
}

// "350" / "85.5" / " 120 " → number; empty or invalid → null
export function parseCm(input: string): number | null {
  const v = parseFloat(input.trim().replace(',', '.'));
  return isNaN(v) || v <= 0 ? null : Math.round(v * 10) / 10;
}

export function formatCm(valueCm: number | null): string {
  return valueCm === null ? '? cm' : `${valueCm}cm`;
}
