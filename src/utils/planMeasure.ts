import type { Dimension, MeasuredField, Plan, PlanRef } from '../types';
import { fitOpenings, hostFrame, MIN_OPENING_CM, MIN_ROOM_CM, MIN_WALL_CM, roundCm } from './planUtils';

// Plan and measured values closer than this count as matching
export const MATCH_TOLERANCE_CM = 1;

export const FIELD_LABEL: Record<MeasuredField, string> = { w: '幅', h: '奥行', width: '幅', length: '長さ' };

type Element = { measured?: Partial<Record<MeasuredField, string>> };

function findElement(plan: Plan, ref: PlanRef): Element | undefined {
  switch (ref.kind) {
    case 'room': return plan.rooms.find((r) => r.id === ref.id);
    case 'wall': return plan.walls.find((w) => w.id === ref.id);
    case 'opening': return plan.openings.find((o) => o.id === ref.id);
    case 'fixture': return plan.fixtures.find((f) => f.id === ref.id);
  }
}

export function elementLabel(plan: Plan, ref: PlanRef): string {
  switch (ref.kind) {
    case 'room': return plan.rooms.find((r) => r.id === ref.id)?.name || '部屋';
    case 'wall': return '壁';
    case 'opening': return plan.openings.find((o) => o.id === ref.id)?.type === 'window' ? '窓' : '扉';
    case 'fixture': return plan.fixtures.find((f) => f.id === ref.id)?.label || '設備';
  }
}

// The plan's current value of a measurable field (undefined if the element is gone)
export function planValue(plan: Plan, ref: PlanRef, field: MeasuredField): number | undefined {
  if (ref.kind === 'room' || ref.kind === 'fixture') {
    const el = ref.kind === 'room' ? plan.rooms.find((r) => r.id === ref.id) : plan.fixtures.find((f) => f.id === ref.id);
    if (!el) return undefined;
    return field === 'w' ? el.w : field === 'h' ? el.h : undefined;
  }
  if (ref.kind === 'opening') {
    return field === 'width' ? plan.openings.find((o) => o.id === ref.id)?.widthCm : undefined;
  }
  const w = plan.walls.find((x) => x.id === ref.id);
  return w && field === 'length' ? roundCm(Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y)) : undefined;
}

// Set a field to a value: rooms/fixtures keep their top-left, walls their start point
// and direction; doors/windows are kept within their wall
export function setPlanValue(plan: Plan, ref: PlanRef, field: MeasuredField, value: number): Plan {
  switch (ref.kind) {
    case 'room': {
      const v = Math.max(MIN_ROOM_CM, value);
      return fitOpenings({ ...plan, rooms: plan.rooms.map((r) => (r.id === ref.id ? { ...r, [field]: v } : r)) });
    }
    case 'fixture': {
      const v = Math.max(MIN_ROOM_CM, value);
      return { ...plan, fixtures: plan.fixtures.map((f) => (f.id === ref.id ? { ...f, [field]: v } : f)) };
    }
    case 'opening':
      return fitOpenings({
        ...plan,
        openings: plan.openings.map((o) => {
          if (o.id !== ref.id) return o;
          const len = hostFrame(plan, o.host)?.len ?? value;
          return { ...o, widthCm: Math.min(len, Math.max(MIN_OPENING_CM, value)) };
        }),
      });
    case 'wall':
      return fitOpenings({
        ...plan,
        walls: plan.walls.map((w) => {
          if (w.id !== ref.id) return w;
          const len = Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y);
          const v = Math.max(MIN_WALL_CM, value);
          if (len === 0) return w;
          return { ...w, b: { x: roundCm(w.a.x + (w.b.x - w.a.x) / len * v), y: roundCm(w.a.y + (w.b.y - w.a.y) / len * v) } };
        }),
      });
  }
}

export function setMeasureLink(plan: Plan, ref: PlanRef, field: MeasuredField, dimensionId: string | null): Plan {
  const relink = <T extends Element>(el: T): T => {
    const measured = { ...el.measured };
    if (dimensionId) measured[field] = dimensionId;
    else delete measured[field];
    return { ...el, measured: Object.keys(measured).length > 0 ? measured : undefined };
  };
  const on = <T extends { id: string } & Element>(list: T[]) => list.map((x) => (x.id === ref.id ? relink(x) : x));
  switch (ref.kind) {
    case 'room': return { ...plan, rooms: on(plan.rooms) };
    case 'wall': return { ...plan, walls: on(plan.walls) };
    case 'opening': return { ...plan, openings: on(plan.openings) };
    case 'fixture': return { ...plan, fixtures: on(plan.fixtures) };
  }
}

export type MeasureLinkStatus =
  | { state: 'missing' }                       // the dimension was deleted
  | { state: 'unmeasured'; dimension: Dimension }
  | { state: 'match' | 'diff'; dimension: Dimension; measuredCm: number; diffCm: number };   // diff = plan − measured

export function linkStatus(plan: Plan, ref: PlanRef, field: MeasuredField, dimensionId: string, dimensions: Dimension[]): MeasureLinkStatus {
  const dimension = dimensions.find((d) => d.id === dimensionId);
  if (!dimension) return { state: 'missing' };
  if (dimension.valueCm === null) return { state: 'unmeasured', dimension };
  const diffCm = roundCm((planValue(plan, ref, field) ?? 0) - dimension.valueCm);
  return {
    state: Math.abs(diffCm) < MATCH_TOLERANCE_CM ? 'match' : 'diff',
    dimension, measuredCm: dimension.valueCm, diffCm,
  };
}

export type MeasureComparison = { ref: PlanRef; field: MeasuredField; label: string; planCm: number; status: MeasureLinkStatus };

// Every link in the plan, for the comparison list
export function measureComparisons(plan: Plan, dimensions: Dimension[]): MeasureComparison[] {
  const out: MeasureComparison[] = [];
  const add = (kind: PlanRef['kind'], els: Array<{ id: string } & Element>) => {
    for (const el of els) {
      for (const [field, dimId] of Object.entries(el.measured ?? {}) as Array<[MeasuredField, string]>) {
        const ref = { kind, id: el.id };
        out.push({
          ref, field, label: `${elementLabel(plan, ref)}の${FIELD_LABEL[field]}`,
          planCm: planValue(plan, ref, field) ?? 0,
          status: linkStatus(plan, ref, field, dimId, dimensions),
        });
      }
    }
  };
  add('room', plan.rooms);
  add('wall', plan.walls);
  add('opening', plan.openings);
  add('fixture', plan.fixtures);
  return out;
}

// Measured dimensions offered for a field, closest to the plan value first
export function measureCandidates(dimensions: Dimension[], planCm: number): Dimension[] {
  return dimensions
    .filter((d) => d.valueCm !== null)
    .sort((x, y) => Math.abs(x.valueCm! - planCm) - Math.abs(y.valueCm! - planCm));
}

// Dimension ids linked from an element (to highlight them on the canvas)
export function linkedDimensionIds(plan: Plan, ref: PlanRef): string[] {
  return Object.values(findElement(plan, ref)?.measured ?? {}).filter((id): id is string => !!id);
}
