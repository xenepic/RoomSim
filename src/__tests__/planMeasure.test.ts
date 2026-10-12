import { describe, test, expect, beforeEach } from 'vitest';
import type { Dimension, Plan } from '../types';
import { makeEmptyPlan } from '../utils/planUtils';
import {
  linkStatus, measureCandidates, measureComparisons, setMeasureLink, setPlanValue,
} from '../utils/planMeasure';
import { useAppStore } from '../store/useAppStore';

const dim = (id: string, valueCm: number | null, note?: string): Dimension => ({
  id, a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, valueCm, note,
});
const planWith = (changes: Partial<Plan>): Plan => ({ ...makeEmptyPlan(), ...changes });
const roomRef = { kind: 'room' as const, id: 'r' };

describe('planMeasure', () => {
  const base = planWith({ rooms: [{ id: 'r', name: '洋室', x: 0, y: 0, w: 300, h: 200 }] });

  test('links and compares a room width', () => {
    const plan = setMeasureLink(base, roomRef, 'w', 'd1');
    expect(plan.rooms[0].measured).toEqual({ w: 'd1' });
    expect(linkStatus(plan, roomRef, 'w', 'd1', [dim('d1', 312)])).toMatchObject({ state: 'diff', diffCm: -12 });
    expect(linkStatus(plan, roomRef, 'w', 'd1', [dim('d1', 300.5)])).toMatchObject({ state: 'match' });
    expect(linkStatus(plan, roomRef, 'w', 'd1', [dim('d1', null)])).toMatchObject({ state: 'unmeasured' });
    expect(linkStatus(plan, roomRef, 'w', 'd1', [])).toEqual({ state: 'missing' });
  });

  test('unlinking the last field removes the links object', () => {
    const plan = setMeasureLink(setMeasureLink(base, roomRef, 'w', 'd1'), roomRef, 'w', null);
    expect(plan.rooms[0].measured).toBeUndefined();
  });

  test('setting a wall length keeps its start and direction', () => {
    const plan = planWith({ walls: [{ id: 'w', a: { x: 10, y: 10 }, b: { x: 10, y: 110 } }] });
    expect(setPlanValue(plan, { kind: 'wall', id: 'w' }, 'length', 250).walls[0].b).toEqual({ x: 10, y: 260 });
  });

  test('an opening never gets wider than its wall', () => {
    const plan = planWith({
      rooms: base.rooms,
      openings: [{ id: 'o', type: 'door', door: 'hinged', hinge: 'start', swing: 'in', host: { kind: 'room', roomId: 'r', side: 'right' }, offsetCm: 100, widthCm: 80 }],
    });
    expect(setPlanValue(plan, { kind: 'opening', id: 'o' }, 'width', 500).openings[0].widthCm).toBe(200);
  });

  test('candidates are measured values, closest first', () => {
    const ids = measureCandidates([dim('a', 100), dim('b', null), dim('c', 290), dim('d', 350)], 300).map((d) => d.id);
    expect(ids).toEqual(['c', 'd', 'a']);
  });

  test('comparisons list every link', () => {
    const plan = setMeasureLink(setMeasureLink(base, roomRef, 'w', 'd1'), roomRef, 'h', 'd2');
    const rows = measureComparisons(plan, [dim('d1', 300), dim('d2', 210)]);
    expect(rows.map((r) => [r.label, r.status.state])).toEqual([['洋室の幅', 'match'], ['洋室の奥行', 'diff']]);
  });
});

describe('linkMeasure action', () => {
  const s = () => useAppStore.getState();
  beforeEach(() => {
    s().resetProject();
    s().setMode('plan');
  });

  test('applies the measured value, keeps measure data unchanged, and undoes', () => {
    const id = s().addRoom({ x: 0, y: 0, w: 300, h: 200 });
    const dimId = s().addDimension({ x: 0, y: 0 }, { x: 600, y: 0 });
    s().updateDimension(dimId, { valueCm: 312 });
    const dimsBefore = s().project.dimensions;
    s().linkMeasure({ kind: 'room', id }, 'w', dimId, true);
    expect(s().project.plan!.rooms[0]).toMatchObject({ w: 312, measured: { w: dimId } });
    expect(s().project.dimensions).toBe(dimsBefore);
    s().undoPlan();
    expect(s().project.plan!.rooms[0].w).toBe(300);
    expect(s().project.plan!.rooms[0].measured).toBeUndefined();
  });
});
