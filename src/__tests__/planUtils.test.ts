import { describe, test, expect } from 'vitest';
import type { Plan, PlanOpening, PlanRoom } from '../types';
import {
  clampOffset, deleteFromPlan, findNearestHost, fitOpenings, furnitureToMove, hostFrame,
  makeEmptyPlan, snapDelta, snapLines, translatePlan,
} from '../utils/planUtils';

const room = (id: string, x: number, y: number, w: number, h: number): PlanRoom => ({ id, name: id, x, y, w, h });
const door = (id: string, roomId: string, offsetCm: number, widthCm = 80): PlanOpening => ({
  id, type: 'door', door: 'hinged', hinge: 'start', swing: 'in',
  host: { kind: 'room', roomId, side: 'top' }, offsetCm, widthCm,
});
const planWith = (changes: Partial<Plan>): Plan => ({ ...makeEmptyPlan(), ...changes });

describe('hostFrame', () => {
  test('room sides run clockwise with the normal pointing into the room', () => {
    const plan = planWith({ rooms: [room('r', 0, 0, 300, 200)] });
    const right = hostFrame(plan, { kind: 'room', roomId: 'r', side: 'right' })!;
    expect(right.a).toEqual({ x: 300, y: 0 });
    expect(right.len).toBe(200);
    expect(right.normal.x).toBeCloseTo(-1);
    expect(right.band).toEqual([-10, 0]);   // wall outside the interior
    const bottom = hostFrame(plan, { kind: 'room', roomId: 'r', side: 'bottom' })!;
    expect(bottom.normal.y).toBeCloseTo(-1);
  });

  test('free walls have a band centered on the line', () => {
    const plan = planWith({ walls: [{ id: 'w', a: { x: 0, y: 0 }, b: { x: 0, y: 100 }, thicknessCm: 12 }] });
    expect(hostFrame(plan, { kind: 'wall', wallId: 'w' })!.band).toEqual([-6, 6]);
  });

  test('returns null for a missing host', () => {
    expect(hostFrame(makeEmptyPlan(), { kind: 'wall', wallId: 'x' })).toBeNull();
  });
});

describe('clampOffset', () => {
  test('keeps the opening within the segment', () => {
    expect(clampOffset(300, 80, 10)).toBe(40);
    expect(clampOffset(300, 80, 290)).toBe(260);
    expect(clampOffset(300, 80, 150)).toBe(150);
    expect(clampOffset(60, 80, 10)).toBe(30);
  });
});

describe('findNearestHost', () => {
  test('finds the closest wall within the distance', () => {
    const plan = planWith({ rooms: [room('r', 0, 0, 300, 200)] });
    expect(findNearestHost(plan, { x: 100, y: 3 }, 20)).toEqual({ host: { kind: 'room', roomId: 'r', side: 'top' }, offsetCm: 100 });
    // Inside the wall band (outside the interior) counts as distance 0
    expect(findNearestHost(plan, { x: 305, y: 50 }, 1)?.host).toEqual({ kind: 'room', roomId: 'r', side: 'right' });
    expect(findNearestHost(plan, { x: 150, y: 100 }, 20)).toBeNull();
  });
});

describe('fitOpenings', () => {
  test('clamps openings after a resize and drops orphans', () => {
    const plan = planWith({
      rooms: [room('r', 0, 0, 100, 100)],
      openings: [door('d', 'r', 250), door('o', 'gone', 50)],
    });
    const fitted = fitOpenings(plan);
    expect(fitted.openings).toHaveLength(1);
    expect(fitted.openings[0].offsetCm).toBe(60);
  });

  test('returns the same object when nothing changes', () => {
    const plan = planWith({ rooms: [room('r', 0, 0, 300, 100)], openings: [door('d', 'r', 100)] });
    expect(fitOpenings(plan)).toBe(plan);
  });
});

describe('translatePlan', () => {
  const plan = planWith({
    rooms: [room('a', 0, 0, 300, 200), room('b', 310, 0, 200, 200)],
    openings: [door('d', 'a', 100)],
  });

  test('moves selected rooms; their openings follow (offset unchanged)', () => {
    const moved = translatePlan(plan, [{ kind: 'room', id: 'a' }], 10, 20);
    expect(moved.rooms[0]).toMatchObject({ x: 10, y: 20 });
    expect(moved.rooms[1]).toBe(plan.rooms[1]);
    expect(moved.openings[0].offsetCm).toBe(100);
  });

  test('a lone opening slides along its wall', () => {
    const moved = translatePlan(plan, [{ kind: 'opening', id: 'd' }], 30, 50);
    expect(moved.openings[0].offsetCm).toBe(130);
    expect(moved.rooms[0]).toBe(plan.rooms[0]);
  });
});

describe('deleteFromPlan', () => {
  test('removes openings on deleted rooms', () => {
    const plan = planWith({ rooms: [room('a', 0, 0, 300, 200)], openings: [door('d', 'a', 100)] });
    const next = deleteFromPlan(plan, [{ kind: 'room', id: 'a' }]);
    expect(next.rooms).toHaveLength(0);
    expect(next.openings).toHaveLength(0);
  });
});

describe('furnitureToMove', () => {
  const plan = planWith({ rooms: [room('a', 0, 0, 300, 200), room('b', 400, 0, 200, 200)] });
  const furniture = [
    { id: 'in-a', name: '', xCm: 100, yCm: 100, widthCm: 50, depthCm: 50, rotation: 0, color: '' },
    { id: 'in-b', name: '', xCm: 500, yCm: 100, widthCm: 50, depthCm: 50, rotation: 0, color: '' },
  ];

  test('furniture inside the selected rooms', () => {
    expect([...furnitureToMove(plan, [{ kind: 'room', id: 'a' }], furniture)]).toEqual(['in-a']);
  });

  test('all furniture when every room is selected', () => {
    expect(furnitureToMove(plan, [{ kind: 'room', id: 'a' }, { kind: 'room', id: 'b' }], furniture).size).toBe(2);
  });
});

describe('snapping', () => {
  test('snap lines include the outer wall face of other rooms', () => {
    const plan = planWith({ rooms: [room('a', 0, 0, 300, 200)] });
    expect(snapLines(plan, []).xs).toEqual([0, 300, -10, 310]);
    expect(snapLines(plan, [{ kind: 'room', id: 'a' }]).xs).toEqual([]);
  });

  test('snapDelta picks the closest edge within the threshold', () => {
    expect(snapDelta([305, 505], [310], 8)).toBe(5);
    expect(snapDelta([300], [310], 8)).toBe(0);
    // Grid: 298 → 300
    expect(snapDelta([298], [], 8, 50)).toBe(2);
    // A snap line wins over an equally close grid line
    expect(snapDelta([103], [106], 8, 50)).toBe(3);
  });
});
