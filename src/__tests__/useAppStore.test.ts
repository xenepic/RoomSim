import { describe, test, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/useAppStore';

beforeEach(() => {
  useAppStore.getState().resetProject();
  localStorage.clear();
});

describe('addFurniture', () => {
  test('adds a furniture item and auto-selects it', () => {
    useAppStore.getState().addFurniture({
      name: 'テスト', xCm: 50, yCm: 50,
      widthCm: 100, depthCm: 80, rotation: 0, color: '#fff',
    });
    const { project, selectedId } = useAppStore.getState();
    expect(project.furniture).toHaveLength(1);
    expect(project.furniture[0].name).toBe('テスト');
    expect(selectedId).toBe(project.furniture[0].id);
  });
});

describe('updateFurniture', () => {
  test('updates only the specified item', () => {
    useAppStore.getState().addFurniture({
      name: 'A', xCm: 0, yCm: 0, widthCm: 100, depthCm: 80, rotation: 0, color: '#fff',
    });
    const id = useAppStore.getState().project.furniture[0].id;
    useAppStore.getState().updateFurniture(id, { xCm: 200 });
    const item = useAppStore.getState().project.furniture[0];
    expect(item.xCm).toBe(200);
    expect(item.widthCm).toBe(100);
  });
});

describe('deleteFurniture', () => {
  test('removes item and clears selection if it was selected', () => {
    useAppStore.getState().addFurniture({
      name: 'B', xCm: 0, yCm: 0, widthCm: 100, depthCm: 80, rotation: 0, color: '#fff',
    });
    const id = useAppStore.getState().project.furniture[0].id;
    useAppStore.getState().selectFurniture(id);
    useAppStore.getState().deleteFurniture(id);
    expect(useAppStore.getState().project.furniture).toHaveLength(0);
    expect(useAppStore.getState().selectedId).toBeNull();
  });
});

describe('duplicateFurniture', () => {
  test('adds an offset copy and selects it', () => {
    useAppStore.getState().addFurniture({
      name: 'C', xCm: 100, yCm: 50, widthCm: 120, depthCm: 60, rotation: 90, color: '#abc',
    });
    const id = useAppStore.getState().project.furniture[0].id;
    useAppStore.getState().duplicateFurniture(id);
    const { project, selectedId } = useAppStore.getState();
    expect(project.furniture).toHaveLength(2);
    const copy = project.furniture[1];
    expect(copy.id).not.toBe(id);
    expect(copy).toMatchObject({ name: 'C', xCm: 110, yCm: 60, widthCm: 120, depthCm: 60, rotation: 90, color: '#abc' });
    expect(selectedId).toBe(copy.id);
  });

  test('does nothing for an unknown id', () => {
    useAppStore.getState().duplicateFurniture('missing');
    expect(useAppStore.getState().project.furniture).toHaveLength(0);
  });
});

describe('resetProject', () => {
  test('clears content but keeps id and name, and bumps projectRev', () => {
    const { id } = useAppStore.getState().project;
    useAppStore.getState().renameProject('A物件');
    useAppStore.getState().addDimension({ x: 0, y: 0 }, { x: 10, y: 0 });
    const rev = useAppStore.getState().projectRev;
    useAppStore.getState().resetProject();
    const { project, projectRev, measureSelection } = useAppStore.getState();
    expect(project).toMatchObject({ id, name: 'A物件', furniture: [], dimensions: [], memos: [] });
    expect(projectRev).toBe(rev + 1);
    expect(measureSelection).toBeNull();
  });
});

describe('measure: dimensions', () => {
  beforeEach(() => {
    useAppStore.getState().setMode('measure');
    useAppStore.getState().setAxisSnap(true);
  });

  test('two taps with the dimension tool create an unmeasured, selected line', () => {
    const s = useAppStore.getState();
    s.setMeasureTool('dimension');
    s.placeMeasurePoint({ x: 10, y: 10 });
    expect(useAppStore.getState().dimensionDraft).toEqual({ x: 10, y: 10 });
    s.placeMeasurePoint({ x: 200, y: 14 });   // ~1° off horizontal → snapped
    const { project, dimensionDraft, measureSelection } = useAppStore.getState();
    expect(project.dimensions).toHaveLength(1);
    expect(project.dimensions[0]).toMatchObject({ a: { x: 10, y: 10 }, b: { x: 200, y: 10 }, valueCm: null });
    expect(dimensionDraft).toBeNull();
    expect(measureSelection).toEqual({ kind: 'dimension', id: project.dimensions[0].id });
  });

  test('without axis snap the end point is kept as tapped', () => {
    const s = useAppStore.getState();
    s.setAxisSnap(false);
    s.setMeasureTool('dimension');
    s.placeMeasurePoint({ x: 10, y: 10 });
    s.placeMeasurePoint({ x: 200, y: 14 });
    expect(useAppStore.getState().project.dimensions[0].b).toEqual({ x: 200, y: 14 });
  });

  test('the measured value is stored as entered, independent of the line length', () => {
    const id = useAppStore.getState().addDimension({ x: 0, y: 0 }, { x: 100, y: 0 });
    useAppStore.getState().updateDimension(id, { valueCm: 362.5 });
    expect(useAppStore.getState().project.dimensions[0].valueCm).toBe(362.5);
  });

  test('select tool tap on empty canvas clears the selection', () => {
    useAppStore.getState().addDimension({ x: 0, y: 0 }, { x: 100, y: 0 });
    useAppStore.getState().setMeasureTool('select');
    useAppStore.getState().placeMeasurePoint({ x: 50, y: 50 });
    expect(useAppStore.getState().measureSelection).toBeNull();
  });

  test('switching mode clears selection and draft', () => {
    const s = useAppStore.getState();
    s.setMeasureTool('dimension');
    s.placeMeasurePoint({ x: 1, y: 1 });
    s.setMode('furniture');
    expect(useAppStore.getState()).toMatchObject({ dimensionDraft: null, measureSelection: null, measureTool: 'select' });
  });
});

describe('measure: memos', () => {
  test('memo tool tap adds a selected empty memo; delete removes it', () => {
    const s = useAppStore.getState();
    s.setMode('measure');
    s.setMeasureTool('memo');
    s.placeMeasurePoint({ x: 30, y: 40 });
    const memo = useAppStore.getState().project.memos[0];
    expect(memo).toMatchObject({ pos: { x: 30, y: 40 }, text: '' });
    expect(useAppStore.getState().measureSelection).toEqual({ kind: 'memo', id: memo.id });
    s.updateMemo(memo.id, { text: 'コンセント' });
    expect(useAppStore.getState().project.memos[0].text).toBe('コンセント');
    s.deleteMemo(memo.id);
    expect(useAppStore.getState().project.memos).toHaveLength(0);
    expect(useAppStore.getState().measureSelection).toBeNull();
  });
});

describe('measure: undo', () => {
  test('undo reverts add, update and delete step by step', () => {
    const s = useAppStore.getState();
    const id = s.addDimension({ x: 0, y: 0 }, { x: 100, y: 0 });
    s.updateDimension(id, { valueCm: 100 });
    s.deleteDimension(id);
    expect(useAppStore.getState().project.dimensions).toHaveLength(0);
    s.undoMeasure();   // undo delete
    expect(useAppStore.getState().project.dimensions[0].valueCm).toBe(100);
    s.undoMeasure();   // undo value
    expect(useAppStore.getState().project.dimensions[0].valueCm).toBeNull();
    s.undoMeasure();   // undo add
    expect(useAppStore.getState().project.dimensions).toHaveLength(0);
    expect(useAppStore.getState().measureSelection).toBeNull();
  });

  test('typing with the same undoKey coalesces into one undo step', () => {
    const s = useAppStore.getState();
    const id = s.addDimension({ x: 0, y: 0 }, { x: 100, y: 0 });
    for (const v of [3, 35, 350]) s.updateDimension(id, { valueCm: v }, { undoKey: `value:${id}` });
    s.undoMeasure();
    expect(useAppStore.getState().project.dimensions[0].valueCm).toBeNull();
  });

  test('undoKey false does not record a step', () => {
    const s = useAppStore.getState();
    const id = s.addDimension({ x: 0, y: 0 }, { x: 100, y: 0 });
    const depth = useAppStore.getState().measureUndo.length;
    s.updateDimension(id, { a: { x: 5, y: 0 } }, { undoKey: false });
    expect(useAppStore.getState().measureUndo).toHaveLength(depth);
  });
});

describe('setSnapGrid', () => {
  test('enables snap and updates sizeCm', () => {
    useAppStore.getState().setSnapGrid(true, 5);
    const { snapGrid } = useAppStore.getState().project;
    expect(snapGrid.enabled).toBe(true);
    expect(snapGrid.sizeCm).toBe(5);
  });
  test('keeps existing sizeCm when not provided', () => {
    useAppStore.getState().setSnapGrid(true, 20);
    useAppStore.getState().setSnapGrid(false);
    expect(useAppStore.getState().project.snapGrid.sizeCm).toBe(20);
  });
});
