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

// 'memo' = free-text note (text shown on the canvas); the others are icon marks
// whose text is an optional note that is NOT shown on the canvas.
export type PinKind = 'memo' | 'outlet' | 'tv' | 'lan' | 'aircon';

export type MemoPin = {
  id: string;
  pos: ImagePoint;
  text: string;
  kind?: PinKind;   // undefined = 'memo' (data saved before pin kinds existed)
};

// ---- Drawn floor plan (plan mode) ----
// All plan coordinates are in cm, with the origin at the floorplan image's (0, 0),
// so the plan lines up with furniture (also cm) whatever the scale setting is.
export type CmPoint = { x: number; y: number };

// Plan values linked to measured dimensions (Dimension ids), for comparison.
// Measure data is only read, never changed by the plan.
export type MeasuredField = 'w' | 'h' | 'width' | 'length';
export type MeasureLinks = Partial<Record<MeasuredField, string>>;

// A rectangular room. x/y/w/h are the INTERIOR (usable) area; walls are drawn outside it.
// L-shaped rooms are two overlapping rooms: floors are painted over walls, so the
// walls inside the overlap disappear.
export type PlanRoom = {
  id: string;
  name: string;
  x: number;   // top-left
  y: number;
  w: number;
  h: number;
  wallCm?: number;   // undefined = plan.wallCm
  measured?: MeasureLinks;   // w, h
};

// A free-standing wall segment (for what rooms can't express)
export type PlanWall = {
  id: string;
  a: CmPoint;
  b: CmPoint;
  thicknessCm?: number;   // undefined = plan.wallCm
  measured?: MeasureLinks;   // length
};

export type RoomSide = 'top' | 'right' | 'bottom' | 'left';

// The wall an opening sits in. Room sides run clockwise, so their normal points into the room.
export type WallHost =
  | { kind: 'room'; roomId: string; side: RoomSide }
  | { kind: 'wall'; wallId: string };

export type DoorType = 'hinged' | 'sliding' | 'double' | 'opening';
export type WindowType = 'sliding' | 'floor' | 'fix';   // 引き違い / 掃き出し / FIX

type OpeningBase = {
  id: string;
  host: WallHost;
  offsetCm: number;   // from the host segment's start to the opening's CENTER
  widthCm: number;
  measured?: MeasureLinks;   // width
};
export type PlanDoor = OpeningBase & {
  type: 'door';
  door: DoorType;
  hinge: 'start' | 'end';   // hinged: hinge side / sliding: the end the door slides toward
  swing: 'in' | 'out';      // 'in' = toward the host normal (into the room)
};
export type PlanWindow = OpeningBase & {
  type: 'window';
  window: WindowType;
  sillCm: number;     // floor to the bottom of the window
  heightCm: number;
};
export type PlanOpening = PlanDoor | PlanWindow;

export type FixtureKind = 'column' | 'beam' | 'closet' | 'stairs' | 'kitchen' | 'sanitary' | 'other';

// Columns, closets, fixed equipment etc.: a labelled rectangle (x/y = top-left)
export type PlanFixture = {
  id: string;
  kind: FixtureKind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  measured?: MeasureLinks;   // w, h
};

export type Plan = {
  rooms: PlanRoom[];
  walls: PlanWall[];
  openings: PlanOpening[];
  fixtures: PlanFixture[];
  wallCm: number;   // default wall thickness
  underlay: {
    visible: boolean;       // floorplan image over the plan in plan mode
    opacity: number;        // 0..1
    inFurniture: boolean;   // also overlay the image in furniture mode
  };
};

export type PlanElementKind = 'room' | 'wall' | 'opening' | 'fixture';
export type PlanRef = { kind: PlanElementKind; id: string };

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
  plan?: Plan;   // undefined until plan mode is first opened
  background?: 'image' | 'plan';   // furniture mode background; undefined = 'image'
};

export type ProjectMeta = {
  id: string;
  name: string;
  updatedAt: number;
};

export type AppMode = 'furniture' | 'measure' | 'plan';
export type PlanTool = 'select' | 'room' | 'wall' | 'door' | 'window' | 'fixture';
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
  selectedId: string | null;   // the single selected furniture (edited in the properties panel)
  furnitureSelection: string[];   // all selected furniture (Shift+click / marquee); kept in sync with selectedId
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
  pinKind: PinKind;   // kind placed by the 'memo' (mark) tool
  measureUndo: Array<{ dimensions: Dimension[]; memos: MemoPin[] }>;
  lastUndoKey: string | null;
  // Request for the canvas to center the view on a point (seq makes repeats fire)
  viewFocusRequest: { point: ImagePoint; seq: number } | null;

  planTool: PlanTool;
  planSelection: PlanRef[];
  // Kinds placed by the door / window / fixture tools
  planDoorType: DoorType;
  planWindowType: WindowType;
  planFixtureKind: FixtureKind;
  planMoveFurniture: boolean;   // furniture follows moved rooms (see furnitureToMove)
  planUndo: PlanSnapshot[];
  planRedo: PlanSnapshot[];
  lastPlanUndoKey: string | null;
};

// Furniture is included because moving rooms can move furniture along
export type PlanSnapshot = { plan: Plan; furniture: FurnitureItem[] };

export type AppStore = AppState & {
  addFurniture: (item: Omit<FurnitureItem, 'id'>) => void;
  updateFurniture: (id: string, changes: Partial<FurnitureItem>) => void;
  deleteFurniture: (id: string) => void;
  duplicateFurniture: (id: string) => void;
  selectFurniture: (id: string | null) => void;
  setFurnitureSelection: (ids: string[]) => void;
  toggleFurnitureSelection: (id: string) => void;
  deleteSelectedFurniture: () => void;
  duplicateSelectedFurniture: () => void;
  moveFurnitureBy: (ids: string[], dxCm: number, dyCm: number) => void;
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
  setPinKind: (kind: PinKind) => void;
  selectMeasure: (selection: MeasureSelection) => void;
  // Handles a tap on empty canvas in measure mode according to the current tool
  placeMeasurePoint: (point: ImagePoint) => void;
  cancelDimensionDraft: () => void;
  addDimension: (a: ImagePoint, b: ImagePoint) => string;
  updateDimension: (id: string, changes: Partial<Omit<Dimension, 'id'>>, opts?: UndoOption) => void;
  deleteDimension: (id: string) => void;
  addMemo: (pos: ImagePoint, kind?: PinKind) => string;
  updateMemo: (id: string, changes: Partial<Omit<MemoPin, 'id'>>, opts?: UndoOption) => void;
  deleteMemo: (id: string) => void;
  pushMeasureUndo: (undoKey?: string) => void;
  undoMeasure: () => void;
  requestViewFocus: (point: ImagePoint) => void;

  setBackground: (background: 'image' | 'plan') => void;
  setPlanTool: (tool: PlanTool) => void;
  setPlanPlaceType: (changes: Partial<Pick<AppState, 'planDoorType' | 'planWindowType' | 'planFixtureKind'>>) => void;
  setPlanMoveFurniture: (enabled: boolean) => void;
  // additive: Shift+click toggles the element in the selection
  selectPlan: (ref: PlanRef | null, additive?: boolean) => void;
  setPlanSelection: (refs: PlanRef[]) => void;
  updatePlanSettings: (changes: Partial<Pick<Plan, 'wallCm' | 'underlay'>>, opts?: UndoOption) => void;
  addRoom: (rect: Omit<PlanRoom, 'id' | 'name'> & { name?: string }) => string;
  updateRoom: (id: string, changes: Partial<Omit<PlanRoom, 'id'>>, opts?: UndoOption) => void;
  addWall: (a: CmPoint, b: CmPoint) => string;
  updateWall: (id: string, changes: Partial<Omit<PlanWall, 'id'>>, opts?: UndoOption) => void;
  // Places a door/window (of the current tool's type) on the wall nearest to the point
  placeOpening: (point: CmPoint, maxDistCm: number) => string | null;
  updateOpening: (id: string, changes: Partial<PlanDoor> | Partial<PlanWindow>, opts?: UndoOption) => void;
  addFixture: (rect: Omit<PlanFixture, 'id' | 'kind' | 'label'> & { kind?: FixtureKind }) => string;
  updateFixture: (id: string, changes: Partial<Omit<PlanFixture, 'id'>>, opts?: UndoOption) => void;
  deletePlanSelection: () => void;
  duplicatePlanSelection: () => void;
  // Link a plan value to a measured dimension (null = unlink); apply = also set the
  // plan value to the measured one
  linkMeasure: (ref: PlanRef, field: MeasuredField, dimensionId: string | null, apply?: boolean) => void;
  movePlanSelection: (dx: number, dy: number, opts?: UndoOption) => void;
  // Live drag: re-apply the move to the state captured at drag start (no undo push)
  movePlanSelectionFrom: (base: PlanSnapshot, dx: number, dy: number) => void;
  pushPlanUndo: (undoKey?: string) => void;
  undoPlan: () => void;
  redoPlan: () => void;
};
