import { describe, test, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/useAppStore';

const s = () => useAppStore.getState();
const plan = () => s().project.plan!;

beforeEach(() => {
  s().resetProject();
  s().setMode('furniture');
  s().setPlanMoveFurniture(false);
  s().setMode('plan');
});

describe('plan mode', () => {
  test('opening plan mode creates an empty plan once', () => {
    expect(plan().rooms).toEqual([]);
    const created = plan();
    s().setMode('furniture');
    s().setMode('plan');
    expect(plan()).toBe(created);
  });

  test('addRoom selects the new room', () => {
    const id = s().addRoom({ x: 0, y: 0, w: 300, h: 200 });
    expect(plan().rooms[0]).toMatchObject({ id, name: '部屋1', w: 300 });
    expect(s().planSelection).toEqual([{ kind: 'room', id }]);
  });

  test('placeOpening puts a door on the nearest wall', () => {
    const roomId = s().addRoom({ x: 0, y: 0, w: 300, h: 200 });
    s().setPlanPlaceType({ planDoorType: 'sliding' });
    expect(s().planTool).toBe('door');
    const id = s().placeOpening({ x: 20, y: 199 }, 20);
    const o = plan().openings.find((x) => x.id === id)!;
    expect(o).toMatchObject({ type: 'door', door: 'sliding', host: { roomId, side: 'bottom' } });
    // Clamped so the 80cm door stays on the wall: bottom runs right→left, so x=20 is near the end
    expect(o.offsetCm).toBe(260);
  });

  test('shrinking a room keeps its openings on the wall', () => {
    const roomId = s().addRoom({ x: 0, y: 0, w: 300, h: 200 });
    s().setPlanTool('window');
    const id = s().placeOpening({ x: 250, y: 0 }, 20)!;
    s().updateRoom(roomId, { w: 200 });
    const o = plan().openings.find((x) => x.id === id)!;
    expect(o.offsetCm + o.widthCm / 2).toBeLessThanOrEqual(200);
  });

  test('deleting a room deletes its openings', () => {
    s().addRoom({ x: 0, y: 0, w: 300, h: 200 });
    s().setPlanTool('door');
    s().placeOpening({ x: 100, y: 0 }, 20);
    s().setPlanSelection([{ kind: 'room', id: plan().rooms[0].id }]);
    s().deletePlanSelection();
    expect(plan().rooms).toHaveLength(0);
    expect(plan().openings).toHaveLength(0);
  });

  test('duplicate copies a room with its openings', () => {
    const roomId = s().addRoom({ x: 0, y: 0, w: 300, h: 200 });
    s().setPlanTool('door');
    s().placeOpening({ x: 100, y: 0 }, 20);
    s().setPlanSelection([{ kind: 'room', id: roomId }]);
    s().duplicatePlanSelection();
    expect(plan().rooms).toHaveLength(2);
    expect(plan().openings).toHaveLength(2);
    const copy = plan().rooms[1];
    expect(copy).toMatchObject({ x: 20, y: 20 });
    expect(plan().openings[1].host).toMatchObject({ roomId: copy.id });
    expect(s().planSelection).toEqual([{ kind: 'room', id: copy.id }]);
  });

  test('undo / redo', () => {
    const id = s().addRoom({ x: 0, y: 0, w: 300, h: 200 });
    s().updateRoom(id, { w: 310 }, { undoKey: 'w' });
    s().updateRoom(id, { w: 320 }, { undoKey: 'w' });   // coalesced with the previous edit
    s().undoPlan();
    expect(plan().rooms[0].w).toBe(300);
    s().redoPlan();
    expect(plan().rooms[0].w).toBe(320);
    s().undoPlan();
    s().undoPlan();
    expect(plan().rooms).toHaveLength(0);
    expect(s().planSelection).toEqual([]);
    // A new edit clears the redo stack
    s().addRoom({ x: 0, y: 0, w: 100, h: 100 });
    expect(s().planRedo).toEqual([]);
  });

  test('moving rooms can carry furniture along (and undo restores it)', () => {
    const id = s().addRoom({ x: 0, y: 0, w: 300, h: 200 });
    s().addFurniture({ name: 'ベッド', xCm: 100, yCm: 100, widthCm: 100, depthCm: 200, rotation: 0, color: '#fff' });
    s().setPlanSelection([{ kind: 'room', id }]);
    s().movePlanSelection(10, 0);
    expect(s().project.furniture[0].xCm).toBe(100);
    s().setPlanMoveFurniture(true);
    s().movePlanSelection(10, 0);
    expect(plan().rooms[0].x).toBe(20);
    expect(s().project.furniture[0].xCm).toBe(110);
    s().undoPlan();
    expect(s().project.furniture[0].xCm).toBe(100);
  });

  test('switching modes clears the plan selection', () => {
    s().addRoom({ x: 0, y: 0, w: 300, h: 200 });
    s().setMode('furniture');
    expect(s().planSelection).toEqual([]);
  });
});

describe('effectiveBackground', () => {
  test('defaults to the plan once it has rooms, unless chosen', async () => {
    const { effectiveBackground } = await import('../utils/projectUtils');
    expect(effectiveBackground(s().project)).toBe('image');
    s().addRoom({ x: 0, y: 0, w: 300, h: 200 });
    expect(effectiveBackground(s().project)).toBe('plan');
    s().setBackground('image');
    expect(effectiveBackground(s().project)).toBe('image');
  });
});
