import 'fake-indexeddb/auto';
import { describe, test, expect, beforeAll } from 'vitest';
import { get } from 'idb-keyval';
import { useAppStore } from '../store/useAppStore';
import {
  initPersistence, flushSave, createProject, switchProject, deleteProject, importProjectFile,
} from '../store/persistence';

const floorplan = { dataUrl: 'data:image/png;base64,AAAA', widthPx: 600, heightPx: 400 };

// These tests share one IndexedDB and run in order
describe('persistence', () => {
  let legacyId: string;

  beforeAll(async () => {
    localStorage.setItem('roomsim-project', JSON.stringify({
      id: 'legacy', name: '旧データ', snapGrid: { enabled: false, sizeCm: 50 },
      furniture: [{ id: 'f1', name: 'ベッド', xCm: 1, yCm: 2, widthCm: 100, depthCm: 200, rotation: 0, color: '#fff' }],
    }));
    await initPersistence();
    legacyId = useAppStore.getState().project.id;
  });

  test('migrates the old localStorage project and removes the old key', () => {
    const { project, projectList } = useAppStore.getState();
    expect(project).toMatchObject({ id: 'legacy', name: '旧データ', dimensions: [], memos: [] });
    expect(project.furniture[0].name).toBe('ベッド');
    expect(projectList.map((p) => p.id)).toEqual(['legacy']);
    expect(localStorage.getItem('roomsim-project')).toBeNull();
  });

  test('stores the floorplan separately from the project record', async () => {
    useAppStore.getState().setFloorplan(floorplan);
    useAppStore.getState().addDimension({ x: 0, y: 0 }, { x: 50, y: 0 });
    await flushSave();
    const record = await get<Record<string, unknown>>(`project:${legacyId}`);
    expect(record?.floorplan).toBeUndefined();
    expect(record?.dimensions).toHaveLength(1);
    expect(await get(`floorplan:${legacyId}`)).toEqual(floorplan);
  });

  test('switching projects saves the current one and restores the other', async () => {
    await createProject();
    const newId = useAppStore.getState().project.id;
    expect(newId).not.toBe(legacyId);
    expect(useAppStore.getState().project.dimensions).toHaveLength(0);
    expect(useAppStore.getState().projectList).toHaveLength(2);

    await switchProject(legacyId);
    const { project } = useAppStore.getState();
    expect(project.dimensions).toHaveLength(1);
    expect(project.floorplan).toEqual(floorplan);
  });

  test('autosaves changes after a short delay', async () => {
    useAppStore.getState().renameProject('改名後');
    await new Promise((r) => setTimeout(r, 700));
    expect((await get<{ name: string }>(`project:${legacyId}`))?.name).toBe('改名後');
  });

  test('imports a file as a new project with a fresh id', async () => {
    const json = JSON.stringify({ format: 'roomsim', version: 1, project: { ...useAppStore.getState().project, name: '取込' } });
    await importProjectFile(new File([json], 'x.roomsim.json', { type: 'application/json' }));
    const { project, projectList } = useAppStore.getState();
    expect(project.name).toBe('取込');
    expect(project.id).not.toBe(legacyId);
    expect(project.floorplan).toEqual(floorplan);
    expect(projectList).toHaveLength(3);
  });

  test('rejects files that are not RoomSim data', async () => {
    await expect(importProjectFile(new File(['{"foo":1}'], 'x.json'))).rejects.toThrow();
  });

  test('deleting the current project switches to another one', async () => {
    const current = useAppStore.getState().project.id;
    await deleteProject(current);
    const { project, projectList } = useAppStore.getState();
    expect(project.id).not.toBe(current);
    expect(projectList.map((p) => p.id)).not.toContain(current);
    expect(await get(`project:${current}`)).toBeUndefined();
  });
});
