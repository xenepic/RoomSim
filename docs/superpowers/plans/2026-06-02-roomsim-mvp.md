# RoomSim MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Browser-only furniture placement simulator for Japanese apartment floor plans — upload a floor plan image, add/move/rotate/resize furniture rectangles, calibrate scale, and persist to localStorage.

**Architecture:** Zustand holds all domain data in cm units. Konva renders px equivalents and fires events that convert back to cm before store actions. Zoom/pan is local state in CanvasArea (not in Zustand). Transformer is shared across furniture items in FurnitureLayer.

**Tech Stack:** React 18, TypeScript 5, Vite 5, react-konva, konva, zustand, Vitest + jsdom

**Spec:** `docs/superpowers/specs/2026-06-02-roomsim-design.md`

---

## File Map

```
src/
├── main.tsx
├── App.tsx                         # 3-col layout + calibration state (lifted)
├── App.css
├── types/
│   └── index.ts                    # All domain types + AppStore type
├── data/
│   └── furniturePresets.ts         # FURNITURE_PRESETS constant array
├── utils/
│   └── scaleUtils.ts               # Pure cm<->px conversion functions
├── store/
│   └── useAppStore.ts              # Zustand store (state + all actions)
├── components/
│   ├── toolbar/
│   │   ├── Toolbar.tsx             # Left panel container
│   │   ├── ImageUploader.tsx       # Floor plan image upload
│   │   ├── FurniturePresetList.tsx # Preset list + custom add form
│   │   ├── ScaleCalibrator.tsx     # Scale setting UI (ruler/tatami)
│   │   ├── SnapGridToggle.tsx      # Snap ON/OFF + grid size
│   │   └── ProjectActions.tsx     # Save / Load / Reset buttons
│   ├── canvas/
│   │   ├── CanvasArea.tsx          # Konva Stage + zoom/pan (local state)
│   │   ├── FloorplanLayer.tsx      # Konva.Image layer
│   │   ├── FurnitureLayer.tsx      # All furniture shapes + shared Transformer
│   │   ├── FurnitureShape.tsx      # Individual furniture Group (Rect + Text)
│   │   └── RulerOverlay.tsx        # Calibration input layer (ruler/tatami modes)
│   └── properties/
│       ├── PropertiesPanel.tsx     # Right panel container
│       └── FurnitureEditor.tsx     # Selected furniture edit form
└── __tests__/
    ├── scaleUtils.test.ts
    └── useAppStore.test.ts
```

---

## Task 1: Project scaffolding and git init

**Files:**
- Create: project root (Vite scaffold)
- Modify: `package.json`, `vite.config.ts`

- [ ] **Step 1: Scaffold Vite project**

Run in `C:\Users\xenep\`:
```bash
npm create vite@latest RoomSim -- --template react-ts
cd RoomSim
npm install
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install konva react-konva zustand
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest jsdom @testing-library/react
```

- [ ] **Step 4: Configure Vitest in vite.config.ts**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 5: Add test script to package.json**

Add to the `"scripts"` section:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Remove Vite boilerplate**

Delete `src/assets/react.svg`, `public/vite.svg`. Clear `src/App.css` and `src/index.css`.

- [ ] **Step 7: Init git and first commit**

```bash
git init
echo "node_modules/" >> .gitignore
echo ".superpowers/" >> .gitignore
git add .
git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

## Task 2: Types, scale utilities, and furniture presets

**Files:**
- Create: `src/types/index.ts`
- Create: `src/utils/scaleUtils.ts`
- Create: `src/data/furniturePresets.ts`
- Create: `src/__tests__/scaleUtils.test.ts`

- [ ] **Step 1: Write failing tests for scaleUtils**

Create `src/__tests__/scaleUtils.test.ts`:
```ts
import { describe, test, expect } from 'vitest';
import {
  DEFAULT_PIXELS_PER_CM,
  getPixelsPerCm,
  cmToPx,
  pxToCm,
  snapToCm,
  estimateScaleFromTatami,
  TATAMI_SIZES,
} from '../utils/scaleUtils';
import type { ScaleSetting } from '../types';

const exactScale: ScaleSetting = { pixelsPerCm: 4, method: 'ruler', accuracy: 'exact' };

describe('getPixelsPerCm', () => {
  test('returns DEFAULT_PIXELS_PER_CM when no scale given', () => {
    expect(getPixelsPerCm(undefined)).toBe(DEFAULT_PIXELS_PER_CM);
  });
  test('returns scale.pixelsPerCm when scale is provided', () => {
    expect(getPixelsPerCm(exactScale)).toBe(4);
  });
});

describe('cmToPx / pxToCm', () => {
  test('cmToPx multiplies by pixelsPerCm', () => {
    expect(cmToPx(100, exactScale)).toBe(400);
  });
  test('pxToCm divides by pixelsPerCm', () => {
    expect(pxToCm(400, exactScale)).toBe(100);
  });
  test('cmToPx and pxToCm are inverses', () => {
    expect(pxToCm(cmToPx(75, exactScale), exactScale)).toBeCloseTo(75);
  });
  test('uses DEFAULT_PIXELS_PER_CM when no scale', () => {
    expect(cmToPx(50)).toBe(50 * DEFAULT_PIXELS_PER_CM);
  });
});

describe('snapToCm', () => {
  test('snaps to nearest grid unit', () => {
    expect(snapToCm(14, 10)).toBe(10);
    expect(snapToCm(16, 10)).toBe(20);
    expect(snapToCm(15, 10)).toBe(20);
  });
});

describe('estimateScaleFromTatami', () => {
  test('returns correct pixelsPerCm using area formula', () => {
    const result = estimateScaleFromTatami(400, 300, 6, 'edo');
    expect(result).toBeCloseTo(Math.sqrt((400 * 300) / (6 * TATAMI_SIZES.edo.areaCm2)), 5);
  });
  test('larger rect gives larger pixelsPerCm', () => {
    const small = estimateScaleFromTatami(400, 300, 6, 'edo');
    const large = estimateScaleFromTatami(800, 600, 6, 'edo');
    expect(large).toBeGreaterThan(small);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```
Expected: Fail with "Cannot find module '../utils/scaleUtils'"

- [ ] **Step 3: Create domain types**

Create `src/types/index.ts`:
```ts
// Domain types for RoomSim. All spatial measurements in cm unless noted.

export type TatamiType = 'edo' | 'kyo' | 'chukyo' | 'danchi';

export type FloorplanImage = {
  dataUrl: string;   // base64 data URL
  widthPx: number;
  heightPx: number;
};

export type ScaleSetting = {
  pixelsPerCm: number;
  method: 'ruler' | 'tatami';
  accuracy: 'exact' | 'estimated';
};

// xCm, yCm represent the CENTER of the furniture item on the canvas.
export type FurnitureItem = {
  id: string;
  name: string;
  xCm: number;
  yCm: number;
  widthCm: number;
  depthCm: number;
  rotation: number;   // degrees, clockwise
  color: string;
  presetId?: string;  // set when created from a preset
};

export type Project = {
  id: string;
  name: string;
  floorplan?: FloorplanImage;
  scale?: ScaleSetting;
  snapGrid: {
    enabled: boolean;
    sizeCm: number;
  };
  furniture: FurnitureItem[];
};

export type FurniturePreset = {
  id: string;
  category: string;
  name: string;
  widthCm: number;
  depthCm: number;
  color: string;
};

// Zustand store shape (state + actions)
export type AppState = {
  project: Project;
  selectedId: string | null;
};

export type AppStore = AppState & {
  addFurniture: (item: Omit<FurnitureItem, 'id'>) => void;
  updateFurniture: (id: string, changes: Partial<FurnitureItem>) => void;
  deleteFurniture: (id: string) => void;
  selectFurniture: (id: string | null) => void;
  setFloorplan: (image: FloorplanImage) => void;
  setScale: (scale: ScaleSetting) => void;
  setSnapGrid: (enabled: boolean, sizeCm?: number) => void;
  saveProject: () => void;
  loadProject: () => void;
  resetProject: () => void;
};
```

- [ ] **Step 4: Create scale utilities**

Create `src/utils/scaleUtils.ts`:
```ts
import type { ScaleSetting, TatamiType } from '../types';

export const DEFAULT_PIXELS_PER_CM = 2;

// Standard tatami dimensions and areas by regional type
export const TATAMI_SIZES: Record<TatamiType, { widthCm: number; depthCm: number; areaCm2: number }> = {
  edo:    { widthCm: 176,   depthCm: 88,   areaCm2: 176   * 88   },  // 関東間
  kyo:    { widthCm: 191,   depthCm: 95.5, areaCm2: 191   * 95.5 },  // 京間
  chukyo: { widthCm: 182,   depthCm: 91,   areaCm2: 182   * 91   },  // 中京間
  danchi: { widthCm: 170,   depthCm: 85,   areaCm2: 170   * 85   },  // 団地間
};

export function getPixelsPerCm(scale?: ScaleSetting): number {
  return scale?.pixelsPerCm ?? DEFAULT_PIXELS_PER_CM;
}

export function cmToPx(cm: number, scale?: ScaleSetting): number {
  return cm * getPixelsPerCm(scale);
}

export function pxToCm(px: number, scale?: ScaleSetting): number {
  return px / getPixelsPerCm(scale);
}

// Round a cm value to the nearest grid step
export function snapToCm(valueCm: number, gridSizeCm: number): number {
  return Math.round(valueCm / gridSizeCm) * gridSizeCm;
}

/**
 * Estimate pixelsPerCm from a user-drawn rectangle over a room area.
 * Formula: pixelsPerCm = sqrt(rectAreaPx^2 / roomAreaCm^2)
 * Compatible with future closed-region recognition (same formula, automatic area input).
 */
export function estimateScaleFromTatami(
  rectWidthPx: number,
  rectHeightPx: number,
  tatamiCount: number,
  tatamiType: TatamiType,
): number {
  const { areaCm2 } = TATAMI_SIZES[tatamiType];
  const roomAreaCm2 = tatamiCount * areaCm2;
  const rectAreaPx2 = rectWidthPx * rectHeightPx;
  return Math.sqrt(rectAreaPx2 / roomAreaCm2);
}
```

- [ ] **Step 5: Create furniture presets**

Create `src/data/furniturePresets.ts`:
```ts
import type { FurniturePreset } from '../types';

export const FURNITURE_PRESETS: FurniturePreset[] = [
  // ベッド
  { id: 'bed-single',      category: 'ベッド',   name: 'ベッド（S）',       widthCm: 100, depthCm: 200, color: '#AED6F1' },
  { id: 'bed-semi-double', category: 'ベッド',   name: 'ベッド（SD）',      widthCm: 120, depthCm: 200, color: '#AED6F1' },
  { id: 'bed-double',      category: 'ベッド',   name: 'ベッド（D）',       widthCm: 140, depthCm: 200, color: '#AED6F1' },
  // ソファ
  { id: 'sofa-1p',         category: 'ソファ',   name: 'ソファ（1P）',      widthCm:  80, depthCm:  80, color: '#A9DFBF' },
  { id: 'sofa-2p',         category: 'ソファ',   name: 'ソファ（2P）',      widthCm: 145, depthCm:  80, color: '#A9DFBF' },
  { id: 'sofa-3p',         category: 'ソファ',   name: 'ソファ（3P）',      widthCm: 195, depthCm:  85, color: '#A9DFBF' },
  // テーブル
  { id: 'table-dining',    category: 'テーブル', name: 'ダイニング（4P）',  widthCm: 120, depthCm:  80, color: '#F9E79F' },
  { id: 'table-coffee',    category: 'テーブル', name: 'センターテーブル',  widthCm:  90, depthCm:  50, color: '#F9E79F' },
  // 収納
  { id: 'tv-stand',        category: '収納',     name: 'テレビ台',          widthCm: 120, depthCm:  45, color: '#D5DBDB' },
  // デスク
  { id: 'desk',            category: 'デスク',   name: 'デスク',            widthCm: 120, depthCm:  60, color: '#FAD7A0' },
  { id: 'chair',           category: 'デスク',   name: 'チェア',            widthCm:  60, depthCm:  60, color: '#FAD7A0' },
  // 家電
  { id: 'washing-machine', category: '家電',     name: '洗濯機',            widthCm:  60, depthCm:  60, color: '#D2B4DE' },
  { id: 'refrigerator',    category: '家電',     name: '冷蔵庫',            widthCm:  60, depthCm:  65, color: '#D2B4DE' },
];

// Category list in display order (preserves insertion order)
export const PRESET_CATEGORIES = [...new Set(FURNITURE_PRESETS.map((p) => p.category))];
```

- [ ] **Step 6: Run tests — expect all to pass**

```bash
npm test
```
Expected: 8 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/utils/scaleUtils.ts src/data/furniturePresets.ts src/__tests__/scaleUtils.test.ts
git commit -m "feat: add domain types, scale utilities, and furniture presets"
```

---

## Task 3: Zustand store

**Files:**
- Create: `src/store/useAppStore.ts`
- Create: `src/__tests__/useAppStore.test.ts`

- [ ] **Step 1: Write failing store tests**

Create `src/__tests__/useAppStore.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```
Expected: Fail with "Cannot find module '../store/useAppStore'"

- [ ] **Step 3: Implement the store**

Create `src/store/useAppStore.ts`:
```ts
import { create } from 'zustand';
import type { AppStore, Project, FurnitureItem } from '../types';

const STORAGE_KEY = 'roomsim-project';

const makeInitialProject = (): Project => ({
  id: crypto.randomUUID(),
  name: '新しいプロジェクト',
  snapGrid: { enabled: false, sizeCm: 10 },
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
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm test
```
Expected: 13 tests pass (8 scaleUtils + 5 store).

- [ ] **Step 5: Commit**

```bash
git add src/store/useAppStore.ts src/__tests__/useAppStore.test.ts
git commit -m "feat: add Zustand store with furniture CRUD, persistence, and snap grid"
```

---

## Task 4: App layout (3-column shell)

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/index.css`

- [ ] **Step 1: Set up global CSS**

Replace `src/index.css`:
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  background: #f5f5f5;
  overflow: hidden;
}

button {
  cursor: pointer;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 13px;
}
button:hover { background: #f0f0f0; }
button:disabled { opacity: 0.5; cursor: default; }

input[type="text"], input[type="number"], select {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 7px;
  font-size: 13px;
  width: 100%;
}

label { display: block; font-size: 12px; color: #555; margin-bottom: 2px; }
```

- [ ] **Step 2: Create layout CSS**

Replace `src/App.css`:
```css
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.left-panel {
  width: 220px;
  min-width: 220px;
  background: #fafafa;
  border-right: 1px solid #ddd;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.canvas-container {
  flex: 1;
  overflow: hidden;
  background: #e8e8e8;
  position: relative;
}

.right-panel {
  width: 240px;
  min-width: 240px;
  background: #fafafa;
  border-left: 1px solid #ddd;
  overflow-y: auto;
}

.panel-section {
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
}
.panel-section h3 {
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

/* Status bar overlaid on bottom-left of canvas */
.canvas-status {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  pointer-events: none;
  user-select: none;
}
```

- [ ] **Step 3: Build App.tsx shell with calibration state**

Replace `src/App.tsx`:
```tsx
import { useState, useEffect } from 'react';
import './App.css';
import { useAppStore } from './store/useAppStore';
import { Toolbar } from './components/toolbar/Toolbar';
import { CanvasArea } from './components/canvas/CanvasArea';
import { PropertiesPanel } from './components/properties/PropertiesPanel';

// CalibrationMode is exported so toolbar and canvas components can share the type.
export type CalibrationMode = 'ruler' | 'tatami' | null;

function App() {
  const loadProject = useAppStore((s) => s.loadProject);

  // Restore saved project on first load
  useEffect(() => { loadProject(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calibration state is lifted here because ScaleCalibrator (left panel)
  // and RulerOverlay (canvas) both need to read and update it.
  const [calibrationMode, setCalibrationMode] = useState<CalibrationMode>(null);
  const [rulerPoints, setRulerPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [tatamiRect, setTatamiRect] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);

  const startCalibration = (mode: 'ruler' | 'tatami') => {
    setCalibrationMode(mode);
    setRulerPoints([]);
    setTatamiRect(null);
  };

  const cancelCalibration = () => {
    setCalibrationMode(null);
    setRulerPoints([]);
    setTatamiRect(null);
  };

  const handleRulerPoint = (point: { x: number; y: number }) => {
    setRulerPoints((prev) => [...prev, point].slice(0, 2));
  };

  const handleTatamiRect = (rect: { x: number; y: number; width: number; height: number }) => {
    setTatamiRect(rect);
  };

  const handleScaleSet = () => {
    setCalibrationMode(null);
    setRulerPoints([]);
    setTatamiRect(null);
  };

  return (
    <div className="app-layout">
      <div className="left-panel">
        <Toolbar
          calibrationMode={calibrationMode}
          rulerPoints={rulerPoints}
          tatamiRect={tatamiRect}
          onStartCalibration={startCalibration}
          onCancelCalibration={cancelCalibration}
          onScaleSet={handleScaleSet}
        />
      </div>
      <div className="canvas-container">
        <CanvasArea
          calibrationMode={calibrationMode}
          onRulerPoint={handleRulerPoint}
          onTatamiRect={handleTatamiRect}
        />
      </div>
      <div className="right-panel">
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Create placeholder components so the app compiles**

Create `src/components/toolbar/Toolbar.tsx`:
```tsx
import type { CalibrationMode } from '../../App';

interface ToolbarProps {
  calibrationMode: CalibrationMode;
  rulerPoints: Array<{ x: number; y: number }>;
  tatamiRect: { x: number; y: number; width: number; height: number } | null;
  onStartCalibration: (mode: 'ruler' | 'tatami') => void;
  onCancelCalibration: () => void;
  onScaleSet: () => void;
}

export function Toolbar(_props: ToolbarProps) {
  return <div style={{ padding: 12 }}>Toolbar (placeholder)</div>;
}
```

Create `src/components/canvas/CanvasArea.tsx`:
```tsx
import type { CalibrationMode } from '../../App';

interface CanvasAreaProps {
  calibrationMode: CalibrationMode;
  onRulerPoint: (point: { x: number; y: number }) => void;
  onTatamiRect: (rect: { x: number; y: number; width: number; height: number }) => void;
}

export function CanvasArea(_props: CanvasAreaProps) {
  return <div style={{ width: '100%', height: '100%', background: '#ddd' }}>Canvas</div>;
}
```

Create `src/components/properties/PropertiesPanel.tsx`:
```tsx
export function PropertiesPanel() {
  return <div style={{ padding: 12 }}>Properties</div>;
}
```

- [ ] **Step 5: Verify app runs**

```bash
npm run dev
```
Open `http://localhost:5173`. Expect 3-column layout, no errors in console.

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: add 3-column app layout and calibration state"
```

---

## Task 5: CanvasArea — Konva Stage with zoom and pan

**Files:**
- Modify: `src/components/canvas/CanvasArea.tsx`
- Create: `src/components/canvas/FloorplanLayer.tsx` (stub)
- Create: `src/components/canvas/FurnitureLayer.tsx` (stub)
- Create: `src/components/canvas/RulerOverlay.tsx` (stub)

- [ ] **Step 1: Implement CanvasArea**

Replace `src/components/canvas/CanvasArea.tsx`:
```tsx
import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { CalibrationMode } from '../../App';
import { FloorplanLayer } from './FloorplanLayer';
import { FurnitureLayer } from './FurnitureLayer';
import { RulerOverlay } from './RulerOverlay';
import { useAppStore } from '../../store/useAppStore';

interface CanvasAreaProps {
  calibrationMode: CalibrationMode;
  onRulerPoint: (point: { x: number; y: number }) => void;
  onTatamiRect: (rect: { x: number; y: number; width: number; height: number }) => void;
}

const SCALE_STEP = 1.12;
const MIN_SCALE = 0.1;
const MAX_SCALE = 20;

export function CanvasArea({ calibrationMode, onRulerPoint, onTatamiRect }: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const selectFurniture = useAppStore((s) => s.selectFurniture);
  const scale = useAppStore((s) => s.project.scale);

  // Keep Stage size in sync with its container element
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: container.clientWidth, height: container.clientHeight });
    });
    observer.observe(container);
    setSize({ width: container.clientWidth, height: container.clientHeight });
    return () => observer.disconnect();
  }, []);

  // Zoom toward the cursor on mouse wheel
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage() as Konva.Stage;
    const pointer = stage.getPointerPosition()!;
    const oldScale = stageScale;
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, oldScale * (direction > 0 ? SCALE_STEP : 1 / SCALE_STEP))
    );
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, [stageScale, stagePos]);

  // Deselect furniture when clicking empty canvas area
  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) selectFurniture(null);
  };

  // Update stage position after dragging the canvas to pan
  const handleStageDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) setStagePos(e.target.position());
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Stage
        width={size.width}
        height={size.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDragEnd={handleStageDragEnd}
      >
        <FloorplanLayer />
        <FurnitureLayer stageScale={stageScale} stagePos={stagePos} canvasSize={size} />
        {calibrationMode && (
          <RulerOverlay
            mode={calibrationMode}
            onRulerPoint={onRulerPoint}
            onTatamiRect={onTatamiRect}
          />
        )}
      </Stage>

      <div className="canvas-status">
        {scale
          ? `縮尺: ${scale.pixelsPerCm.toFixed(2)} px/cm (${scale.accuracy === 'estimated' ? '推定' : '実測'})`
          : '縮尺未設定（参考表示）'}
        {'　'}ズーム: {(stageScale * 100).toFixed(0)}%
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create FloorplanLayer stub**

Create `src/components/canvas/FloorplanLayer.tsx`:
```tsx
import { Layer } from 'react-konva';

export function FloorplanLayer() {
  return <Layer />;
}
```

- [ ] **Step 3: Create FurnitureLayer stub**

Create `src/components/canvas/FurnitureLayer.tsx`:
```tsx
import { Layer } from 'react-konva';

interface FurnitureLayerProps {
  stageScale: number;
  stagePos: { x: number; y: number };
  canvasSize: { width: number; height: number };
}

export function FurnitureLayer(_props: FurnitureLayerProps) {
  return <Layer />;
}
```

- [ ] **Step 4: Create RulerOverlay stub**

Create `src/components/canvas/RulerOverlay.tsx`:
```tsx
import { Layer } from 'react-konva';
import type { CalibrationMode } from '../../App';

interface RulerOverlayProps {
  mode: Exclude<CalibrationMode, null>;
  onRulerPoint: (point: { x: number; y: number }) => void;
  onTatamiRect: (rect: { x: number; y: number; width: number; height: number }) => void;
}

export function RulerOverlay(_props: RulerOverlayProps) {
  return <Layer />;
}
```

- [ ] **Step 5: Verify zoom/pan in browser**

```bash
npm run dev
```
Verify: mouse wheel zooms toward cursor, dragging empty canvas pans, zoom % shown in status bar.

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: add Konva Stage with wheel zoom and drag-to-pan"
```

---

## Task 6: FloorplanLayer and ImageUploader

**Files:**
- Modify: `src/components/canvas/FloorplanLayer.tsx`
- Create: `src/components/toolbar/ImageUploader.tsx`

- [ ] **Step 1: Implement FloorplanLayer**

Replace `src/components/canvas/FloorplanLayer.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { Layer, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { useAppStore } from '../../store/useAppStore';

export function FloorplanLayer() {
  const floorplan = useAppStore((s) => s.project.floorplan);
  const imageRef = useRef<Konva.Image>(null);

  // Re-create HTMLImageElement whenever the stored base64 data changes
  useEffect(() => {
    if (!floorplan || !imageRef.current) return;
    const img = new window.Image();
    img.src = floorplan.dataUrl;
    img.onload = () => {
      imageRef.current?.image(img);
      imageRef.current?.getLayer()?.batchDraw();
    };
  }, [floorplan]);

  if (!floorplan) return <Layer />;

  return (
    <Layer>
      <KonvaImage
        ref={imageRef}
        x={0}
        y={0}
        width={floorplan.widthPx}
        height={floorplan.heightPx}
        listening={false}   // floor plan does not receive pointer events
      />
    </Layer>
  );
}
```

- [ ] **Step 2: Implement ImageUploader**

Create `src/components/toolbar/ImageUploader.tsx`:
```tsx
import { useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function ImageUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const setFloorplan = useAppStore((s) => s.setFloorplan);
  const hasFloorplan = useAppStore((s) => !!s.project.floorplan);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Measure natural dimensions before storing
      const img = new window.Image();
      img.onload = () => {
        setFloorplan({ dataUrl, widthPx: img.naturalWidth, heightPx: img.naturalHeight });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';  // Allow re-uploading the same file
  };

  return (
    <div className="panel-section">
      <h3>間取り画像</h3>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button onClick={() => inputRef.current?.click()} style={{ width: '100%' }}>
        {hasFloorplan ? '画像を変更' : '画像をアップロード'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Add ImageUploader to Toolbar**

Replace `src/components/toolbar/Toolbar.tsx`:
```tsx
import type { CalibrationMode } from '../../App';
import { ImageUploader } from './ImageUploader';

interface ToolbarProps {
  calibrationMode: CalibrationMode;
  rulerPoints: Array<{ x: number; y: number }>;
  tatamiRect: { x: number; y: number; width: number; height: number } | null;
  onStartCalibration: (mode: 'ruler' | 'tatami') => void;
  onCancelCalibration: () => void;
  onScaleSet: () => void;
}

export function Toolbar(props: ToolbarProps) {
  return (
    <>
      <ImageUploader />
      {/* Further sections added in subsequent tasks */}
    </>
  );
}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```
Upload a floor plan image. Verify it appears on canvas at natural size. Zoom/pan still works.

- [ ] **Step 5: Commit**

```bash
git add src/components/canvas/FloorplanLayer.tsx src/components/toolbar/ImageUploader.tsx src/components/toolbar/Toolbar.tsx
git commit -m "feat: add floor plan image upload and canvas rendering"
```

---

## Task 7: FurnitureShape and FurnitureLayer

**Files:**
- Create: `src/components/canvas/FurnitureShape.tsx`
- Modify: `src/components/canvas/FurnitureLayer.tsx`

- [ ] **Step 1: Implement FurnitureShape**

Create `src/components/canvas/FurnitureShape.tsx`:
```tsx
import { useRef, useLayoutEffect } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { FurnitureItem, ScaleSetting } from '../../types';
import { getPixelsPerCm, snapToCm } from '../../utils/scaleUtils';

interface FurnitureShapeProps {
  item: FurnitureItem;
  scale: ScaleSetting | undefined;
  snapGrid: { enabled: boolean; sizeCm: number };
  isSelected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<FurnitureItem>) => void;
  // Register Konva node so FurnitureLayer can attach the shared Transformer
  onRef: (id: string, node: Konva.Group | null) => void;
}

export function FurnitureShape({
  item, scale, snapGrid, isSelected, onSelect, onChange, onRef,
}: FurnitureShapeProps) {
  const ppc = getPixelsPerCm(scale);
  const widthPx = item.widthCm * ppc;
  const heightPx = item.depthCm * ppc;
  const groupRef = useRef<Konva.Group>(null);

  // xCm/yCm are the CENTER of the furniture; Group is positioned at center
  // and offsetX/offsetY pull the visual back so it renders centered.
  const xPx = item.xCm * ppc;
  const yPx = item.yCm * ppc;

  useLayoutEffect(() => {
    onRef(item.id, groupRef.current);
    return () => onRef(item.id, null);
  }, [item.id, onRef]);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    let newXCm = e.target.x() / ppc;
    let newYCm = e.target.y() / ppc;

    if (snapGrid.enabled) {
      newXCm = snapToCm(newXCm, snapGrid.sizeCm);
      newYCm = snapToCm(newYCm, snapGrid.sizeCm);
      // Update node position immediately to avoid visual jump on re-render
      e.target.x(newXCm * ppc);
      e.target.y(newYCm * ppc);
    }

    onChange({ xCm: newXCm, yCm: newYCm });
  };

  const handleTransformEnd = () => {
    const node = groupRef.current!;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset Konva's applied scale — correct dimensions come from Zustand re-render
    node.scaleX(1);
    node.scaleY(1);

    onChange({
      xCm: node.x() / ppc,
      yCm: node.y() / ppc,
      widthCm: Math.max(10, item.widthCm * Math.abs(scaleX)),
      depthCm: Math.max(10, item.depthCm * Math.abs(scaleY)),
      rotation: node.rotation(),
    });
  };

  const fontSize = Math.max(10, Math.min(14, widthPx / 8));

  return (
    <Group
      ref={groupRef}
      x={xPx}
      y={yPx}
      offsetX={widthPx / 2}   // rotate/scale around the center of the furniture
      offsetY={heightPx / 2}
      rotation={item.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      <Rect
        width={widthPx}
        height={heightPx}
        fill={item.color}
        stroke={isSelected ? '#2563EB' : '#666'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={3}
        opacity={0.85}
        shadowColor="rgba(0,0,0,0.15)"
        shadowBlur={isSelected ? 6 : 0}
        shadowEnabled={isSelected}
      />
      <Text
        width={widthPx}
        height={heightPx}
        text={`${item.name}\n${item.widthCm}×${item.depthCm}cm`}
        align="center"
        verticalAlign="middle"
        fontSize={fontSize}
        fill="#222"
        listening={false}
      />
    </Group>
  );
}
```

- [ ] **Step 2: Implement FurnitureLayer**

Replace `src/components/canvas/FurnitureLayer.tsx`:
```tsx
import { useRef, useEffect, useCallback } from 'react';
import { Layer, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useAppStore } from '../../store/useAppStore';
import { FurnitureShape } from './FurnitureShape';

interface FurnitureLayerProps {
  stageScale: number;
  stagePos: { x: number; y: number };
  canvasSize: { width: number; height: number };
}

export function FurnitureLayer(_props: FurnitureLayerProps) {
  const furniture = useAppStore((s) => s.project.furniture);
  const scale = useAppStore((s) => s.project.scale);
  const snapGrid = useAppStore((s) => s.project.snapGrid);
  const selectedId = useAppStore((s) => s.selectedId);
  const selectFurniture = useAppStore((s) => s.selectFurniture);
  const updateFurniture = useAppStore((s) => s.updateFurniture);

  const trRef = useRef<Konva.Transformer>(null);
  // Map from furniture id to its Konva.Group node, for Transformer attachment
  const nodesRef = useRef<Map<string, Konva.Group>>(new Map());

  // Attach or detach the Transformer whenever selection changes
  useEffect(() => {
    if (!trRef.current) return;
    const node = selectedId ? nodesRef.current.get(selectedId) : undefined;
    trRef.current.nodes(node ? [node] : []);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId, furniture]);

  const handleRef = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  return (
    <Layer>
      {furniture.map((item) => (
        <FurnitureShape
          key={item.id}
          item={item}
          scale={scale}
          snapGrid={snapGrid}
          isSelected={item.id === selectedId}
          onSelect={() => selectFurniture(item.id)}
          onChange={(changes) => updateFurniture(item.id, changes)}
          onRef={handleRef}
        />
      ))}
      <Transformer
        ref={trRef}
        rotateEnabled={true}
        keepRatio={false}
        boundBoxFunc={(oldBox, newBox) => {
          // Prevent shrinking furniture below 10px
          if (newBox.width < 10 || newBox.height < 10) return oldBox;
          return newBox;
        }}
      />
    </Layer>
  );
}
```

- [ ] **Step 3: Verify build is clean**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/FurnitureShape.tsx src/components/canvas/FurnitureLayer.tsx
git commit -m "feat: add FurnitureShape and FurnitureLayer with drag, resize, rotate"
```

---

## Task 8: Left toolbar — PresetList, SnapGridToggle, ProjectActions

**Files:**
- Create: `src/components/toolbar/FurniturePresetList.tsx`
- Create: `src/components/toolbar/SnapGridToggle.tsx`
- Create: `src/components/toolbar/ProjectActions.tsx`
- Create: `src/components/toolbar/ScaleCalibrator.tsx` (placeholder)
- Modify: `src/components/toolbar/Toolbar.tsx`

- [ ] **Step 1: Implement FurniturePresetList**

Create `src/components/toolbar/FurniturePresetList.tsx`:
```tsx
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FURNITURE_PRESETS, PRESET_CATEGORIES } from '../../data/furniturePresets';
import type { FurniturePreset } from '../../types';

// Default center position in cm when no viewport information is available
const DEFAULT_PLACE_CM = 50;

export function FurniturePresetList() {
  const addFurniture = useAppStore((s) => s.addFurniture);
  const [customName, setCustomName] = useState('');
  const [customW, setCustomW] = useState('100');
  const [customD, setCustomD] = useState('80');

  const handleAddPreset = (preset: FurniturePreset) => {
    addFurniture({
      name: preset.name,
      xCm: DEFAULT_PLACE_CM,
      yCm: DEFAULT_PLACE_CM,
      widthCm: preset.widthCm,
      depthCm: preset.depthCm,
      rotation: 0,
      color: preset.color,
      presetId: preset.id,
    });
  };

  const handleAddCustom = () => {
    const w = parseFloat(customW);
    const d = parseFloat(customD);
    if (!customName.trim() || isNaN(w) || w <= 0 || isNaN(d) || d <= 0) return;
    addFurniture({
      name: customName.trim(),
      xCm: DEFAULT_PLACE_CM,
      yCm: DEFAULT_PLACE_CM,
      widthCm: w,
      depthCm: d,
      rotation: 0,
      color: '#E8DAEF',
    });
    setCustomName('');
  };

  return (
    <div className="panel-section">
      <h3>家具を追加</h3>

      {PRESET_CATEGORIES.map((category) => (
        <div key={category} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{category}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {FURNITURE_PRESETS.filter((p) => p.category === category).map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleAddPreset(preset)}
                style={{ fontSize: 11, padding: '3px 6px', background: preset.color, borderColor: '#bbb' }}
                title={`${preset.widthCm}×${preset.depthCm}cm`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8 }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>カスタム</div>
        <div style={{ marginBottom: 4 }}>
          <label>名前</label>
          <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="例: 本棚" />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <label>幅 (cm)</label>
            <input type="number" value={customW} min="1" onChange={(e) => setCustomW(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>奥行 (cm)</label>
            <input type="number" value={customD} min="1" onChange={(e) => setCustomD(e.target.value)} />
          </div>
        </div>
        <button onClick={handleAddCustom} disabled={!customName.trim()} style={{ width: '100%' }}>
          ＋ 追加
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement SnapGridToggle**

Create `src/components/toolbar/SnapGridToggle.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore';

export function SnapGridToggle() {
  const snapGrid = useAppStore((s) => s.project.snapGrid);
  const setSnapGrid = useAppStore((s) => s.setSnapGrid);

  return (
    <div className="panel-section">
      <h3>スナップ</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <input
          type="checkbox"
          id="snap-toggle"
          checked={snapGrid.enabled}
          onChange={(e) => setSnapGrid(e.target.checked, snapGrid.sizeCm)}
        />
        <label htmlFor="snap-toggle" style={{ margin: 0 }}>
          グリッドスナップ {snapGrid.enabled ? 'ON' : 'OFF'}
        </label>
      </div>
      {snapGrid.enabled && (
        <div>
          <label>グリッドサイズ (cm)</label>
          <input
            type="number"
            value={snapGrid.sizeCm}
            min="1"
            max="100"
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v > 0) setSnapGrid(snapGrid.enabled, v);
            }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement ProjectActions**

Create `src/components/toolbar/ProjectActions.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore';

export function ProjectActions() {
  const saveProject = useAppStore((s) => s.saveProject);
  const loadProject = useAppStore((s) => s.loadProject);
  const resetProject = useAppStore((s) => s.resetProject);

  const handleReset = () => {
    if (window.confirm('プロジェクトをリセットしますか？（保存データは維持されます）')) {
      resetProject();
    }
  };

  return (
    <div className="panel-section">
      <h3>プロジェクト</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={saveProject}>保存</button>
        <button onClick={loadProject}>読み込み</button>
        <button onClick={handleReset} style={{ color: '#c0392b' }}>リセット</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add ScaleCalibrator placeholder**

Create `src/components/toolbar/ScaleCalibrator.tsx`:
```tsx
import type { CalibrationMode } from '../../App';

export interface ScaleCalibratorProps {
  calibrationMode: CalibrationMode;
  rulerPoints: Array<{ x: number; y: number }>;
  tatamiRect: { x: number; y: number; width: number; height: number } | null;
  onStartCalibration: (mode: 'ruler' | 'tatami') => void;
  onCancelCalibration: () => void;
  onScaleSet: () => void;
}

export function ScaleCalibrator(_props: ScaleCalibratorProps) {
  return (
    <div className="panel-section">
      <h3>縮尺設定</h3>
      <p style={{ fontSize: 11, color: '#999' }}>（Task 10 で実装）</p>
    </div>
  );
}
```

- [ ] **Step 5: Update Toolbar to include all sections**

Replace `src/components/toolbar/Toolbar.tsx`:
```tsx
import type { CalibrationMode } from '../../App';
import { ImageUploader } from './ImageUploader';
import { FurniturePresetList } from './FurniturePresetList';
import { ScaleCalibrator } from './ScaleCalibrator';
import { SnapGridToggle } from './SnapGridToggle';
import { ProjectActions } from './ProjectActions';

interface ToolbarProps {
  calibrationMode: CalibrationMode;
  rulerPoints: Array<{ x: number; y: number }>;
  tatamiRect: { x: number; y: number; width: number; height: number } | null;
  onStartCalibration: (mode: 'ruler' | 'tatami') => void;
  onCancelCalibration: () => void;
  onScaleSet: () => void;
}

export function Toolbar({
  calibrationMode, rulerPoints, tatamiRect,
  onStartCalibration, onCancelCalibration, onScaleSet,
}: ToolbarProps) {
  return (
    <>
      <ImageUploader />
      <FurniturePresetList />
      <ScaleCalibrator
        calibrationMode={calibrationMode}
        rulerPoints={rulerPoints}
        tatamiRect={tatamiRect}
        onStartCalibration={onStartCalibration}
        onCancelCalibration={onCancelCalibration}
        onScaleSet={onScaleSet}
      />
      <SnapGridToggle />
      <ProjectActions />
    </>
  );
}
```

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```
Verify:
- Clicking a preset button adds furniture to canvas
- Furniture can be dragged, rotated, and resized
- Snap grid toggle works (drag furniture and observe snapping behavior)
- Save → reset → load restores furniture

- [ ] **Step 7: Commit**

```bash
git add src/components/toolbar/
git commit -m "feat: add furniture preset list, snap grid toggle, and project actions"
```

---

## Task 9: PropertiesPanel and FurnitureEditor

**Files:**
- Modify: `src/components/properties/PropertiesPanel.tsx`
- Create: `src/components/properties/FurnitureEditor.tsx`

- [ ] **Step 1: Implement FurnitureEditor**

Create `src/components/properties/FurnitureEditor.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore';
import type { FurnitureItem } from '../../types';

interface FurnitureEditorProps {
  item: FurnitureItem;
}

export function FurnitureEditor({ item }: FurnitureEditorProps) {
  const updateFurniture = useAppStore((s) => s.updateFurniture);
  const deleteFurniture = useAppStore((s) => s.deleteFurniture);
  const selectFurniture = useAppStore((s) => s.selectFurniture);

  const update = (changes: Partial<FurnitureItem>) => updateFurniture(item.id, changes);

  const handleDelete = () => {
    deleteFurniture(item.id);
    selectFurniture(null);
  };

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label>名前</label>
        <input value={item.name} onChange={(e) => update({ name: e.target.value })} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label>幅 (cm)</label>
          <input
            type="number" value={item.widthCm} min="1"
            onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0) update({ widthCm: v }); }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>奥行 (cm)</label>
          <input
            type="number" value={item.depthCm} min="1"
            onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0) update({ depthCm: v }); }}
          />
        </div>
      </div>

      <div>
        <label>回転 (°)</label>
        <input
          type="number" value={Math.round(item.rotation)}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) update({ rotation: v % 360 }); }}
        />
      </div>

      <div>
        <label>色</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="color" value={item.color}
            onChange={(e) => update({ color: e.target.value })}
            style={{ width: 40, height: 28, padding: 1, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: '#888' }}>{item.color}</span>
        </div>
      </div>

      {/* Position info for reference (read-only) */}
      <div style={{ fontSize: 11, color: '#aaa', borderTop: '1px solid #eee', paddingTop: 8 }}>
        中心位置: ({Math.round(item.xCm)}, {Math.round(item.yCm)}) cm
      </div>

      <button onClick={handleDelete} style={{ color: '#c0392b', borderColor: '#e74c3c' }}>
        削除
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Implement PropertiesPanel**

Replace `src/components/properties/PropertiesPanel.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore';
import { FurnitureEditor } from './FurnitureEditor';

export function PropertiesPanel() {
  const selectedId = useAppStore((s) => s.selectedId);
  const selectedItem = useAppStore((s) => s.project.furniture.find((f) => f.id === s.selectedId));

  return (
    <div>
      <div className="panel-section">
        <h3>プロパティ</h3>
      </div>
      {selectedItem ? (
        <FurnitureEditor item={selectedItem} />
      ) : (
        <div style={{ padding: 12, color: '#999', fontSize: 12 }}>
          家具を選択すると編集できます
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Verify:
- Clicking furniture shows its properties in the right panel
- Editing name/width/depth/rotation updates canvas in real time
- Color picker changes furniture color
- Delete button removes furniture and clears the panel
- Clicking empty canvas clears the panel

- [ ] **Step 4: Commit**

```bash
git add src/components/properties/
git commit -m "feat: add properties panel with furniture editor and delete"
```

---

## Task 10: ScaleCalibrator and RulerOverlay

**Files:**
- Modify: `src/components/toolbar/ScaleCalibrator.tsx`
- Modify: `src/components/canvas/RulerOverlay.tsx`

- [ ] **Step 1: Implement RulerOverlay**

Replace `src/components/canvas/RulerOverlay.tsx`:
```tsx
import { useState } from 'react';
import { Layer, Line, Circle, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import type { CalibrationMode } from '../../App';

interface RulerOverlayProps {
  mode: Exclude<CalibrationMode, null>;
  onRulerPoint: (point: { x: number; y: number }) => void;
  onTatamiRect: (rect: { x: number; y: number; width: number; height: number }) => void;
}

export function RulerOverlay({ mode, onRulerPoint, onTatamiRect }: RulerOverlayProps) {
  const [rulerPoints, setRulerPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // Transform a pointer position from screen coordinates to world (layer) coordinates,
  // accounting for the Stage's current zoom and pan transform.
  const toWorldPoint = (e: KonvaEventObject<MouseEvent>): { x: number; y: number } => {
    const stage = e.target.getStage()!;
    const pointer = stage.getPointerPosition()!;
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(pointer);
  };

  const handleRulerClick = (e: KonvaEventObject<MouseEvent>) => {
    const point = toWorldPoint(e);
    const next = [...rulerPoints, point].slice(0, 2);
    setRulerPoints(next);
    onRulerPoint(point);
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const point = toWorldPoint(e);
    setDragStart(point);
    setDragCurrent(point);
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!dragStart) return;
    setDragCurrent(toWorldPoint(e));
  };

  const handleMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    if (!dragStart) return;
    const end = toWorldPoint(e);
    const rect = {
      x: Math.min(dragStart.x, end.x),
      y: Math.min(dragStart.y, end.y),
      width: Math.abs(end.x - dragStart.x),
      height: Math.abs(end.y - dragStart.y),
    };
    if (rect.width > 5 && rect.height > 5) onTatamiRect(rect);
    setDragStart(null);
    setDragCurrent(null);
  };

  const instructionText =
    mode === 'ruler'
      ? rulerPoints.length === 0 ? '1点目をクリック'
      : rulerPoints.length === 1 ? '2点目をクリック'
      : '左パネルで距離を入力してください'
      : '部屋の矩形をドラッグで選択してください';

  return (
    <Layer
      onClick={mode === 'ruler' ? handleRulerClick : undefined}
      onMouseDown={mode === 'tatami' ? handleMouseDown : undefined}
      onMouseMove={mode === 'tatami' ? handleMouseMove : undefined}
      onMouseUp={mode === 'tatami' ? handleMouseUp : undefined}
    >
      {/* Large transparent rect to capture events over the whole canvas */}
      <Rect x={-50000} y={-50000} width={100000} height={100000} fill="transparent" />

      {/* Ruler mode: points and connecting line */}
      {mode === 'ruler' && (
        <>
          {rulerPoints.length === 2 && (
            <Line
              points={[rulerPoints[0].x, rulerPoints[0].y, rulerPoints[1].x, rulerPoints[1].y]}
              stroke="#E74C3C" strokeWidth={2} dash={[6, 3]}
            />
          )}
          {rulerPoints.map((pt, i) => (
            <Circle key={i} x={pt.x} y={pt.y} radius={5} fill="#E74C3C" />
          ))}
        </>
      )}

      {/* Tatami mode: rectangle drag preview */}
      {mode === 'tatami' && dragStart && dragCurrent && (
        <Rect
          x={Math.min(dragStart.x, dragCurrent.x)}
          y={Math.min(dragStart.y, dragCurrent.y)}
          width={Math.abs(dragCurrent.x - dragStart.x)}
          height={Math.abs(dragCurrent.y - dragStart.y)}
          stroke="#E67E22" strokeWidth={2} dash={[6, 3]}
          fill="rgba(230, 126, 34, 0.08)"
        />
      )}

      {/* Instruction text pinned to top-left of canvas (ignores zoom/pan) */}
      <Text
        x={10} y={10}
        text={instructionText}
        fontSize={14} fill="#E74C3C" fontStyle="bold"
        shadowColor="#fff" shadowBlur={4}
      />
    </Layer>
  );
}
```

- [ ] **Step 2: Implement ScaleCalibrator**

Replace `src/components/toolbar/ScaleCalibrator.tsx`:
```tsx
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { estimateScaleFromTatami } from '../../utils/scaleUtils';
import type { TatamiType } from '../../types';
import type { CalibrationMode } from '../../App';

export interface ScaleCalibratorProps {
  calibrationMode: CalibrationMode;
  rulerPoints: Array<{ x: number; y: number }>;
  tatamiRect: { x: number; y: number; width: number; height: number } | null;
  onStartCalibration: (mode: 'ruler' | 'tatami') => void;
  onCancelCalibration: () => void;
  onScaleSet: () => void;
}

export function ScaleCalibrator({
  calibrationMode, rulerPoints, tatamiRect,
  onStartCalibration, onCancelCalibration, onScaleSet,
}: ScaleCalibratorProps) {
  const setScale = useAppStore((s) => s.setScale);
  const scale = useAppStore((s) => s.project.scale);

  const [rulerCm, setRulerCm] = useState('');
  const [tatamiCount, setTatamiCount] = useState('6');
  const [tatamiType, setTatamiType] = useState<TatamiType>('edo');

  // Distance in px between the two ruler points
  const rulerDistancePx = rulerPoints.length === 2
    ? Math.sqrt(
        Math.pow(rulerPoints[1].x - rulerPoints[0].x, 2) +
        Math.pow(rulerPoints[1].y - rulerPoints[0].y, 2)
      )
    : null;

  const handleConfirmRuler = () => {
    const cm = parseFloat(rulerCm);
    if (!rulerDistancePx || isNaN(cm) || cm <= 0) return;
    setScale({ pixelsPerCm: rulerDistancePx / cm, method: 'ruler', accuracy: 'exact' });
    setRulerCm('');
    onScaleSet();
  };

  const handleConfirmTatami = () => {
    if (!tatamiRect) return;
    const count = parseFloat(tatamiCount);
    if (isNaN(count) || count <= 0) return;
    const ppc = estimateScaleFromTatami(tatamiRect.width, tatamiRect.height, count, tatamiType);
    setScale({ pixelsPerCm: ppc, method: 'tatami', accuracy: 'estimated' });
    onScaleSet();
  };

  return (
    <div className="panel-section">
      <h3>縮尺設定</h3>

      {/* Show current scale when not actively calibrating */}
      {scale && calibrationMode === null && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 8, padding: '4px 6px', background: '#f0f0f0', borderRadius: 4 }}>
          {scale.pixelsPerCm.toFixed(2)} px/cm
          <span style={{ marginLeft: 6, color: scale.accuracy === 'estimated' ? '#E67E22' : '#27AE60' }}>
            ({scale.accuracy === 'estimated' ? '推定値' : '実測値'})
          </span>
        </div>
      )}

      {calibrationMode === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => onStartCalibration('ruler')}>ルーラーで設定</button>
          <button onClick={() => onStartCalibration('tatami')}>畳数で推定</button>
        </div>
      ) : calibrationMode === 'ruler' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, color: '#888' }}>
            {rulerPoints.length < 2
              ? `キャンバスで点を選択 (${rulerPoints.length}/2)`
              : `測定距離: ${rulerDistancePx!.toFixed(1)} px`}
          </div>
          {rulerDistancePx !== null && (
            <>
              <label>実寸 (cm)</label>
              <input
                type="number" value={rulerCm} min="1" placeholder="例: 350"
                onChange={(e) => setRulerCm(e.target.value)}
              />
              <button onClick={handleConfirmRuler} disabled={!rulerCm || parseFloat(rulerCm) <= 0}>
                縮尺を確定
              </button>
            </>
          )}
          <button onClick={onCancelCalibration} style={{ color: '#888' }}>キャンセル</button>
        </div>
      ) : (
        // tatami mode
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <label>畳タイプ</label>
            <select value={tatamiType} onChange={(e) => setTatamiType(e.target.value as TatamiType)}>
              <option value="edo">江戸間 (176×88cm)</option>
              <option value="kyo">京間 (191×95.5cm)</option>
              <option value="chukyo">中京間 (182×91cm)</option>
              <option value="danchi">団地間 (170×85cm)</option>
            </select>
          </div>
          <div>
            <label>畳数</label>
            <input type="number" value={tatamiCount} min="1" step="0.5"
              onChange={(e) => setTatamiCount(e.target.value)} />
          </div>
          <div style={{ fontSize: 11, color: '#888' }}>
            {tatamiRect
              ? `選択済み: ${Math.round(tatamiRect.width)}×${Math.round(tatamiRect.height)} px`
              : 'キャンバスで部屋を矩形選択してください'}
          </div>
          <button
            onClick={handleConfirmTatami}
            disabled={!tatamiRect || !tatamiCount || parseFloat(tatamiCount) <= 0}
          >
            縮尺を確定（推定値）
          </button>
          <button onClick={onCancelCalibration} style={{ color: '#888' }}>キャンセル</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Verify:
1. **Ruler:** Click "ルーラーで設定" → click 2 points on floor plan → enter real cm distance → confirm → status bar updates with "実測値"
2. **Tatami:** Click "畳数で推定" → set tatami type and count → drag room rectangle → confirm → status bar updates with "推定値"
3. After scale is set, newly added furniture appears at the correct visual size relative to the floor plan.

- [ ] **Step 4: Commit**

```bash
git add src/components/toolbar/ScaleCalibrator.tsx src/components/canvas/RulerOverlay.tsx
git commit -m "feat: add scale calibration with ruler and tatami estimation"
```

---

## Task 11: Final test run and manual verification

**Files:**
- No new files

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: All 13 tests pass (8 scaleUtils + 5 store).

- [ ] **Step 2: Build production bundle**

```bash
npm run build
```
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Full manual verification checklist**

```bash
npm run dev
```

- [ ] Upload a floor plan image → appears on canvas
- [ ] Add a preset bed → appears at (50, 50) cm, auto-selected
- [ ] Drag the bed → position updates (visible in properties panel)
- [ ] Resize the bed via handles → width/depth update in properties panel
- [ ] Rotate the bed via rotate handle → rotation updates in properties panel
- [ ] Edit name in properties panel → canvas label updates immediately
- [ ] Edit width/depth numerically → canvas shape updates
- [ ] Enable snap grid (10cm) → drag furniture, observe snapping
- [ ] Add custom furniture → appears on canvas
- [ ] Set ruler scale: click 2 points, enter real cm → scale shown in status bar as "実測値"
- [ ] Set tatami scale: enter tatami info, drag room rect → scale shown as "推定値"
- [ ] After scale set, add furniture → visual size reflects real cm dimensions
- [ ] Click empty canvas → furniture deselects, properties panel shows empty state
- [ ] Delete furniture → disappears, properties panel clears
- [ ] Save → reload page → project auto-loads
- [ ] Save → reset → load manually → project restored
- [ ] Zoom with scroll wheel → zooms toward cursor
- [ ] Pan by dragging empty canvas area

- [ ] **Step 4: Commit (if any fixes were made)**

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Floor plan image upload | 6 |
| Canvas rendering of image | 6 |
| Add furniture (preset + custom) | 8 |
| Furniture drag/move | 7 |
| Furniture rotate | 7 |
| Furniture resize | 7 |
| Properties panel edit | 9 |
| Delete furniture | 9 |
| localStorage save/load/reset | 3 + 8 |
| Scale: ruler method | 10 |
| Scale: tatami estimation | 10 |
| Snap grid ON/OFF + size | 8 |
| Zoom/pan | 5 |
| Default pixelsPerCm fallback | 7 (getPixelsPerCm in FurnitureShape) |
| RulerOverlay activation control | 5 + 10 |
| Furniture initial position | 8 (DEFAULT_PLACE_CM) |
| resetProject | 3 + 8 |
| try/catch in save/load | 3 |
| Transformer results via Zustand | 7 |
| Auto-load on startup | 4 |

**Type consistency confirmed:**
- `xCm/yCm` = center of furniture throughout FurnitureShape, FurnitureEditor, and store
- `cmToPx`/`pxToCm`/`snapToCm`/`getPixelsPerCm` from `scaleUtils` used consistently
- `AppStore` type in `types/index.ts` matches implementation in `useAppStore.ts`
- `CalibrationMode` exported from `App.tsx`, imported in both Toolbar and CanvasArea
- `ScaleCalibratorProps` interface exported from `ScaleCalibrator.tsx` for Toolbar type safety
