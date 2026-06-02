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

describe('saveProject / loadProject', () => {
  test('round-trips project data through localStorage', () => {
    useAppStore.getState().addFurniture({
      name: 'ベッド', xCm: 100, yCm: 200, widthCm: 120, depthCm: 200, rotation: 0, color: '#AED6F1',
    });
    useAppStore.getState().saveProject();
    useAppStore.getState().resetProject();
    expect(useAppStore.getState().project.furniture).toHaveLength(0);
    useAppStore.getState().loadProject();
    expect(useAppStore.getState().project.furniture).toHaveLength(1);
    expect(useAppStore.getState().project.furniture[0].name).toBe('ベッド');
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
