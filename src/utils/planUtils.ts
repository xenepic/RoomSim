import type {
  CmPoint, FurnitureItem, Plan, PlanOpening, PlanRef, PlanRoom, PlanWall, RoomSide, WallHost,
} from '../types';
import { snapToCm } from './scaleUtils';

export const DEFAULT_WALL_CM = 10;
export const DEFAULT_ROOM_CM = 300;
export const MIN_ROOM_CM = 10;
export const MIN_OPENING_CM = 20;
export const MIN_WALL_CM = 10;

export const makeEmptyPlan = (): Plan => ({
  rooms: [],
  walls: [],
  openings: [],
  fixtures: [],
  wallCm: DEFAULT_WALL_CM,
  underlay: { visible: true, opacity: 0.5, inFurniture: false },
});

export const roomWallCm = (plan: Plan, room: PlanRoom) => room.wallCm ?? plan.wallCm;
export const wallCm = (plan: Plan, wall: PlanWall) => wall.thicknessCm ?? plan.wallCm;

export const ROOM_SIDES: RoomSide[] = ['top', 'right', 'bottom', 'left'];

// Room sides run clockwise (screen coordinates, y down), so the left-hand
// normal (-dir.y, dir.x) of each side points into the room.
export function roomSideSegment(room: PlanRoom, side: RoomSide): { a: CmPoint; b: CmPoint } {
  const { x, y, w, h } = room;
  switch (side) {
    case 'top': return { a: { x, y }, b: { x: x + w, y } };
    case 'right': return { a: { x: x + w, y }, b: { x: x + w, y: y + h } };
    case 'bottom': return { a: { x: x + w, y: y + h }, b: { x, y: y + h } };
    case 'left': return { a: { x, y: y + h }, b: { x, y } };
  }
}

// The segment an opening lies on, with the wall band across it.
// Local frame: u along dir (from a), v along normal. The wall occupies v in [band0, band1].
export type HostFrame = {
  a: CmPoint;
  b: CmPoint;
  len: number;
  dir: CmPoint;
  normal: CmPoint;
  band: [number, number];
};

export function hostFrame(plan: Plan, host: WallHost): HostFrame | null {
  let a: CmPoint, b: CmPoint, band: [number, number];
  if (host.kind === 'room') {
    const room = plan.rooms.find((r) => r.id === host.roomId);
    if (!room) return null;
    ({ a, b } = roomSideSegment(room, host.side));
    band = [-roomWallCm(plan, room), 0];   // walls are drawn outside the interior
  } else {
    const wall = plan.walls.find((w) => w.id === host.wallId);
    if (!wall) return null;
    ({ a, b } = wall);
    const t = wallCm(plan, wall);
    band = [-t / 2, t / 2];
  }
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len === 0) return null;
  const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  return { a, b, len, dir, normal: { x: -dir.y, y: dir.x }, band };
}

export const framePoint = (f: HostFrame, u: number, v = 0): CmPoint => ({
  x: f.a.x + f.dir.x * u + f.normal.x * v,
  y: f.a.y + f.dir.y * u + f.normal.y * v,
});

export const frameAngleDeg = (f: HostFrame) => Math.atan2(f.dir.y, f.dir.x) * 180 / Math.PI;

// Position along the segment of the point closest to p (not clamped)
export const projectOnFrame = (f: HostFrame, p: CmPoint) =>
  (p.x - f.a.x) * f.dir.x + (p.y - f.a.y) * f.dir.y;

// Keep the whole opening on its segment (centered if it is wider than the segment)
export function clampOffset(len: number, widthCm: number, offsetCm: number): number {
  if (widthCm >= len) return len / 2;
  return Math.min(len - widthCm / 2, Math.max(widthCm / 2, offsetCm));
}

export function allHosts(plan: Plan): WallHost[] {
  return [
    ...plan.rooms.flatMap((r) => ROOM_SIDES.map((side): WallHost => ({ kind: 'room', roomId: r.id, side }))),
    ...plan.walls.map((w): WallHost => ({ kind: 'wall', wallId: w.id })),
  ];
}

// The wall closest to p within maxDistCm (measured to the wall band), for placing openings
export function findNearestHost(
  plan: Plan, p: CmPoint, maxDistCm: number,
): { host: WallHost; offsetCm: number } | null {
  let best: { host: WallHost; offsetCm: number; dist: number } | null = null;
  for (const host of allHosts(plan)) {
    const f = hostFrame(plan, host);
    if (!f) continue;
    const u = projectOnFrame(f, p);
    if (u < 0 || u > f.len) continue;
    const v = (p.x - f.a.x) * f.normal.x + (p.y - f.a.y) * f.normal.y;
    const dist = v < f.band[0] ? f.band[0] - v : v > f.band[1] ? v - f.band[1] : 0;
    if (dist <= maxDistCm && (!best || dist < best.dist)) best = { host, offsetCm: u, dist };
  }
  return best && { host: best.host, offsetCm: best.offsetCm };
}

export const sameHost = (x: WallHost, y: WallHost) =>
  x.kind === 'room' && y.kind === 'room' ? x.roomId === y.roomId && x.side === y.side
    : x.kind === 'wall' && y.kind === 'wall' ? x.wallId === y.wallId
      : false;

const hostElementId = (h: WallHost) => (h.kind === 'room' ? h.roomId : h.wallId);

// Re-fit openings to their (possibly resized) hosts; drop those whose host is gone
export function fitOpenings(plan: Plan): Plan {
  let changed = false;
  const openings: PlanOpening[] = [];
  for (const o of plan.openings) {
    const f = hostFrame(plan, o.host);
    if (!f) { changed = true; continue; }
    const offsetCm = clampOffset(f.len, o.widthCm, o.offsetCm);
    if (offsetCm !== o.offsetCm) { changed = true; openings.push({ ...o, offsetCm }); }
    else openings.push(o);
  }
  return changed ? { ...plan, openings } : plan;
}

const has = (refs: PlanRef[], kind: PlanRef['kind'], id: string) =>
  refs.some((r) => r.kind === kind && r.id === id);

/**
 * Move the selected elements by (dx, dy). Openings on a moved room/wall follow it
 * automatically; a selected opening whose host stays put slides along its wall instead.
 */
export function translatePlan(plan: Plan, refs: PlanRef[], dx: number, dy: number): Plan {
  if (dx === 0 && dy === 0) return plan;
  const moved = (h: WallHost) => has(refs, h.kind, hostElementId(h));
  return {
    ...plan,
    rooms: plan.rooms.map((r) => (has(refs, 'room', r.id) ? { ...r, x: r.x + dx, y: r.y + dy } : r)),
    fixtures: plan.fixtures.map((f) => (has(refs, 'fixture', f.id) ? { ...f, x: f.x + dx, y: f.y + dy } : f)),
    walls: plan.walls.map((w) => (has(refs, 'wall', w.id)
      ? { ...w, a: { x: w.a.x + dx, y: w.a.y + dy }, b: { x: w.b.x + dx, y: w.b.y + dy } }
      : w)),
    openings: plan.openings.map((o) => {
      if (!has(refs, 'opening', o.id) || moved(o.host)) return o;
      const f = hostFrame(plan, o.host);
      if (!f) return o;
      return { ...o, offsetCm: clampOffset(f.len, o.widthCm, o.offsetCm + dx * f.dir.x + dy * f.dir.y) };
    }),
  };
}

/**
 * Furniture that moves together with the selection when "家具も一緒に動かす" is on:
 * everything when all rooms are selected (aligning the whole plan), otherwise the
 * furniture whose center is inside a selected room.
 */
export function furnitureToMove(plan: Plan, refs: PlanRef[], furniture: FurnitureItem[]): Set<string> {
  const rooms = plan.rooms.filter((r) => has(refs, 'room', r.id));
  if (rooms.length === 0) return new Set();
  if (rooms.length === plan.rooms.length) return new Set(furniture.map((f) => f.id));
  return new Set(furniture
    .filter((f) => rooms.some((r) => f.xCm >= r.x && f.xCm <= r.x + r.w && f.yCm >= r.y && f.yCm <= r.y + r.h))
    .map((f) => f.id));
}

// Remove the elements (and the openings on removed rooms/walls)
export function deleteFromPlan(plan: Plan, refs: PlanRef[]): Plan {
  return {
    ...plan,
    rooms: plan.rooms.filter((r) => !has(refs, 'room', r.id)),
    walls: plan.walls.filter((w) => !has(refs, 'wall', w.id)),
    fixtures: plan.fixtures.filter((f) => !has(refs, 'fixture', f.id)),
    openings: plan.openings.filter((o) => !has(refs, 'opening', o.id) && !has(refs, o.host.kind, hostElementId(o.host))),
  };
}

// ---- Snapping ----

export type SnapLines = { xs: number[]; ys: number[] };

// Lines that moving/resizing elements snap to: room interior edges, the outer face
// of their walls (so the next room lands one wall thickness away), fixtures and wall ends.
export function snapLines(plan: Plan, exclude: PlanRef[]): SnapLines {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of plan.rooms) {
    if (has(exclude, 'room', r.id)) continue;
    const t = roomWallCm(plan, r);
    xs.push(r.x, r.x + r.w, r.x - t, r.x + r.w + t);
    ys.push(r.y, r.y + r.h, r.y - t, r.y + r.h + t);
  }
  for (const f of plan.fixtures) {
    if (has(exclude, 'fixture', f.id)) continue;
    xs.push(f.x, f.x + f.w);
    ys.push(f.y, f.y + f.h);
  }
  for (const w of plan.walls) {
    if (has(exclude, 'wall', w.id)) continue;
    xs.push(w.a.x, w.b.x);
    ys.push(w.a.y, w.b.y);
  }
  return { xs, ys };
}

// Edges of the selected elements, which snap to the other elements' lines while moving
export function selectionEdges(plan: Plan, refs: PlanRef[]): SnapLines {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of [...plan.rooms.filter((r) => has(refs, 'room', r.id)), ...plan.fixtures.filter((f) => has(refs, 'fixture', f.id))]) {
    xs.push(r.x, r.x + r.w);
    ys.push(r.y, r.y + r.h);
  }
  for (const w of plan.walls) {
    if (!has(refs, 'wall', w.id)) continue;
    xs.push(w.a.x, w.b.x);
    ys.push(w.a.y, w.b.y);
  }
  return { xs, ys };
}

/**
 * The correction that brings the closest of `edges` onto a snap line (or the grid),
 * or 0 if none is within the threshold. Snap lines win over the grid on ties.
 */
export function snapDelta(edges: number[], lines: number[], thresholdCm: number, gridCm?: number): number {
  let best = 0;
  let bestDist = thresholdCm;
  const consider = (d: number) => {
    if (Math.abs(d) < bestDist - 1e-9) { best = d; bestDist = Math.abs(d); }
  };
  for (const e of edges) for (const l of lines) consider(l - e);
  if (gridCm) for (const e of edges) consider(snapToCm(e, gridCm) - e);
  return best;
}

export const roundCm = (v: number) => Math.round(v * 10) / 10;
