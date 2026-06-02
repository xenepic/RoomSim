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
