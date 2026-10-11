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

// Floorplan image pixel coordinates (= Stage world coordinates). Independent of
// the scale setting, so measurements never move when the scale changes.
export type ImagePoint = { x: number; y: number };

// A measured (or to-be-measured) dimension. valueCm is the real-world value
// entered by the user and is NEVER derived from the on-image length.
export type Dimension = {
  id: string;
  a: ImagePoint;
  b: ImagePoint;
  valueCm: number | null;   // null = not measured yet (line prepared before the viewing)
  note?: string;
};

export type MemoPin = {
  id: string;
  pos: ImagePoint;
  text: string;
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
  dimensions: Dimension[];
  memos: MemoPin[];
};

export type ProjectMeta = {
  id: string;
  name: string;
  updatedAt: number;
};

export type AppMode = 'furniture' | 'measure';
export type MeasureTool = 'select' | 'dimension' | 'memo';
export type MeasureSelection = { kind: 'dimension' | 'memo'; id: string } | null;

// undoKey: undefined = always push an undo snapshot, false = don't push,
// string = push only if the previous push used a different key (coalesces typing)
export type UndoOption = { undoKey?: string | false };

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
  // World-space center of the visible canvas (not persisted); null until the canvas mounts
  viewCenterCm: { x: number; y: number } | null;
  // Incremented whenever the project is replaced or cleared (signal to reset local form state)
  projectRev: number;
  projectList: ProjectMeta[];
  saveError: boolean;

  mode: AppMode;
  measureTool: MeasureTool;
  measureSelection: MeasureSelection;
  dimensionDraft: ImagePoint | null;   // first point of a dimension being created
  axisSnap: boolean;
  measureUndo: Array<{ dimensions: Dimension[]; memos: MemoPin[] }>;
  lastUndoKey: string | null;
  // Request for the canvas to center the view on a point (seq makes repeats fire)
  viewFocusRequest: { point: ImagePoint; seq: number } | null;
};

export type AppStore = AppState & {
  addFurniture: (item: Omit<FurnitureItem, 'id'>) => void;
  updateFurniture: (id: string, changes: Partial<FurnitureItem>) => void;
  deleteFurniture: (id: string) => void;
  duplicateFurniture: (id: string) => void;
  selectFurniture: (id: string | null) => void;
  setFloorplan: (image: FloorplanImage) => void;
  setScale: (scale: ScaleSetting) => void;
  setSnapGrid: (enabled: boolean, sizeCm?: number) => void;
  renameProject: (name: string) => void;
  replaceProject: (project: Project) => void;
  resetProject: () => void;
  setViewCenterCm: (center: { x: number; y: number }) => void;

  setMode: (mode: AppMode) => void;
  setMeasureTool: (tool: MeasureTool) => void;
  setAxisSnap: (enabled: boolean) => void;
  selectMeasure: (selection: MeasureSelection) => void;
  // Handles a tap on empty canvas in measure mode according to the current tool
  placeMeasurePoint: (point: ImagePoint) => void;
  cancelDimensionDraft: () => void;
  addDimension: (a: ImagePoint, b: ImagePoint) => string;
  updateDimension: (id: string, changes: Partial<Omit<Dimension, 'id'>>, opts?: UndoOption) => void;
  deleteDimension: (id: string) => void;
  addMemo: (pos: ImagePoint) => string;
  updateMemo: (id: string, changes: Partial<Omit<MemoPin, 'id'>>, opts?: UndoOption) => void;
  deleteMemo: (id: string) => void;
  pushMeasureUndo: (undoKey?: string) => void;
  undoMeasure: () => void;
  requestViewFocus: (point: ImagePoint) => void;
};
