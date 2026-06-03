import { create } from 'zustand';
import type { AppStore, Project, FurnitureItem } from '../types';

const STORAGE_KEY = 'roomsim-project';

const makeInitialProject = (): Project => ({
  id: crypto.randomUUID(),
  name: '新しいプロジェクト',
  snapGrid: { enabled: false, sizeCm: 50 },
  furniture: [],
});

export const useAppStore = create<AppStore>((set, get) => ({
  project: makeInitialProject(),
  selectedId: null,

  addFurniture: (item) => {
    const newItem: FurnitureItem = { ...item, id: crypto.randomUUID() };
    set((state) => ({
      project: { ...state.project, furniture: [...state.project.furniture, newItem] },
      selectedId: newItem.id,
    }));
  },

  updateFurniture: (id, changes) => {
    set((state) => ({
      project: {
        ...state.project,
        furniture: state.project.furniture.map((f) =>
          f.id === id ? { ...f, ...changes } : f
        ),
      },
    }));
  },

  deleteFurniture: (id) => {
    set((state) => ({
      project: {
        ...state.project,
        furniture: state.project.furniture.filter((f) => f.id !== id),
      },
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  selectFurniture: (id) => set({ selectedId: id }),

  setFloorplan: (image) => {
    set((state) => ({ project: { ...state.project, floorplan: image } }));
  },

  setScale: (scale) => {
    set((state) => ({ project: { ...state.project, scale } }));
  },

  setSnapGrid: (enabled, sizeCm) => {
    set((state) => ({
      project: {
        ...state.project,
        snapGrid: { enabled, sizeCm: sizeCm ?? state.project.snapGrid.sizeCm },
      },
    }));
  },

  saveProject: () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(get().project));
    } catch (err) {
      console.error('[RoomSim] プロジェクトの保存に失敗しました:', err);
    }
  },

  loadProject: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const project = JSON.parse(raw) as Project;
      set({ project, selectedId: null });
    } catch (err) {
      console.error('[RoomSim] プロジェクトの読み込みに失敗しました:', err);
    }
  },

  resetProject: () => {
    set({ project: makeInitialProject(), selectedId: null });
  },
}));
