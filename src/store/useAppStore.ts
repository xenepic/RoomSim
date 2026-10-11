import { create } from 'zustand';
import type { AppStore, FurnitureItem, Dimension, MemoPin } from '../types';
import { makeInitialProject } from '../utils/projectUtils';
import { snapToAxis } from '../utils/measureUtils';

const MAX_UNDO = 50;

// UI state that must be cleared whenever the project is swapped or cleared
const clearedSessionState = {
  selectedId: null,
  measureSelection: null,
  dimensionDraft: null,
  measureUndo: [],
  lastUndoKey: null,
};

export const useAppStore = create<AppStore>((set, get) => ({
  project: makeInitialProject(),
  selectedId: null,
  viewCenterCm: null,
  projectRev: 0,
  projectList: [],
  saveError: false,
  mode: 'furniture',
  measureTool: 'select',
  measureSelection: null,
  dimensionDraft: null,
  axisSnap: true,
  measureUndo: [],
  lastUndoKey: null,
  viewFocusRequest: null,

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

  // Copy offset by 10cm so the duplicate is visibly separate; the copy becomes selected
  duplicateFurniture: (id) => {
    const item = get().project.furniture.find((f) => f.id === id);
    if (!item) return;
    get().addFurniture({
      name: item.name,
      xCm: item.xCm + 10,
      yCm: item.yCm + 10,
      widthCm: item.widthCm,
      depthCm: item.depthCm,
      rotation: item.rotation,
      color: item.color,
      presetId: item.presetId,
    });
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

  renameProject: (name) => {
    set((state) => ({ project: { ...state.project, name } }));
  },

  // Swap in another project (switch / import / initial load)
  replaceProject: (project) => {
    set((state) => ({ project, ...clearedSessionState, projectRev: state.projectRev + 1 }));
  },

  // Clear the current project's content; id and name are kept so it stays the same entry
  resetProject: () => {
    set((state) => ({
      project: { ...makeInitialProject(state.project.name), id: state.project.id },
      ...clearedSessionState,
      projectRev: state.projectRev + 1,
    }));
  },

  setViewCenterCm: (center) => set({ viewCenterCm: center }),

  // ---- Measure mode ----

  setMode: (mode) => {
    if (mode === get().mode) return;
    set({ mode, measureTool: 'select', selectedId: null, measureSelection: null, dimensionDraft: null });
  },

  setMeasureTool: (tool) => set({ measureTool: tool, dimensionDraft: null }),

  setAxisSnap: (enabled) => set({ axisSnap: enabled }),

  selectMeasure: (selection) => set({ measureSelection: selection }),

  placeMeasurePoint: (point) => {
    const { measureTool, dimensionDraft, axisSnap } = get();
    if (measureTool === 'dimension') {
      if (!dimensionDraft) {
        set({ dimensionDraft: point, measureSelection: null });
        return;
      }
      const b = axisSnap ? snapToAxis(dimensionDraft, point) : point;
      // Ignore a second tap on (almost) the same spot
      if (Math.hypot(b.x - dimensionDraft.x, b.y - dimensionDraft.y) < 1) return;
      get().addDimension(dimensionDraft, b);
      set({ dimensionDraft: null });
    } else if (measureTool === 'memo') {
      get().addMemo(point);
    } else {
      set({ measureSelection: null });
    }
  },

  cancelDimensionDraft: () => set({ dimensionDraft: null }),

  addDimension: (a, b) => {
    get().pushMeasureUndo();
    const dim: Dimension = { id: crypto.randomUUID(), a, b, valueCm: null };
    set((state) => ({
      project: { ...state.project, dimensions: [...state.project.dimensions, dim] },
      measureSelection: { kind: 'dimension', id: dim.id },
    }));
    return dim.id;
  },

  updateDimension: (id, changes, opts) => {
    if (opts?.undoKey !== false) get().pushMeasureUndo(opts?.undoKey);
    set((state) => ({
      project: {
        ...state.project,
        dimensions: state.project.dimensions.map((d) => (d.id === id ? { ...d, ...changes } : d)),
      },
    }));
  },

  deleteDimension: (id) => {
    get().pushMeasureUndo();
    set((state) => ({
      project: { ...state.project, dimensions: state.project.dimensions.filter((d) => d.id !== id) },
      measureSelection: state.measureSelection?.id === id ? null : state.measureSelection,
    }));
  },

  addMemo: (pos) => {
    get().pushMeasureUndo();
    const memo: MemoPin = { id: crypto.randomUUID(), pos, text: '' };
    set((state) => ({
      project: { ...state.project, memos: [...state.project.memos, memo] },
      measureSelection: { kind: 'memo', id: memo.id },
    }));
    return memo.id;
  },

  updateMemo: (id, changes, opts) => {
    if (opts?.undoKey !== false) get().pushMeasureUndo(opts?.undoKey);
    set((state) => ({
      project: {
        ...state.project,
        memos: state.project.memos.map((m) => (m.id === id ? { ...m, ...changes } : m)),
      },
    }));
  },

  deleteMemo: (id) => {
    get().pushMeasureUndo();
    set((state) => ({
      project: { ...state.project, memos: state.project.memos.filter((m) => m.id !== id) },
      measureSelection: state.measureSelection?.id === id ? null : state.measureSelection,
    }));
  },

  pushMeasureUndo: (undoKey) => {
    const { project, measureUndo, lastUndoKey } = get();
    if (undoKey && undoKey === lastUndoKey) return;
    set({
      measureUndo: [...measureUndo, { dimensions: project.dimensions, memos: project.memos }].slice(-MAX_UNDO),
      lastUndoKey: undoKey ?? null,
    });
  },

  undoMeasure: () => {
    const { measureUndo, measureSelection } = get();
    const prev = measureUndo[measureUndo.length - 1];
    if (!prev) return;
    // Keep the selection only if the selected item still exists after undo
    const list = measureSelection?.kind === 'memo' ? prev.memos : prev.dimensions;
    set((state) => ({
      project: { ...state.project, dimensions: prev.dimensions, memos: prev.memos },
      measureUndo: measureUndo.slice(0, -1),
      lastUndoKey: null,
      dimensionDraft: null,
      measureSelection: measureSelection && list.some((x) => x.id === measureSelection.id) ? measureSelection : null,
    }));
  },

  requestViewFocus: (point) => {
    set((state) => ({ viewFocusRequest: { point, seq: (state.viewFocusRequest?.seq ?? 0) + 1 } }));
  },
}));
