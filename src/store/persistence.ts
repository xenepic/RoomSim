import { get, set, del } from 'idb-keyval';
import { useAppStore } from './useAppStore';
import type { FloorplanImage, Project, ProjectMeta } from '../types';
import { makeInitialProject, normalizeProject } from '../utils/projectUtils';

// IndexedDB layout. The floorplan image (large data URL) is stored under its own
// key and rewritten only when it changes, so frequent autosaves stay small.
const K_INDEX = 'projects';
const K_CURRENT = 'currentProjectId';
const kProject = (id: string) => `project:${id}`;
const kFloorplan = (id: string) => `floorplan:${id}`;

const LEGACY_STORAGE_KEY = 'roomsim-project';   // localStorage key used before autosave
const AUTOSAVE_DELAY_MS = 500;
const EXPORT_FORMAT = 'roomsim';

let lastSaved: Project | null = null;           // reference of the last persisted project
let lastSavedFloorplan: FloorplanImage | undefined;
let timer: ReturnType<typeof setTimeout> | null = null;
let saving: Promise<void> = Promise.resolve();

const setList = (list: ProjectMeta[]) => useAppStore.setState({ projectList: list });

async function readIndex(): Promise<ProjectMeta[]> {
  return (await get<ProjectMeta[]>(K_INDEX)) ?? [];
}

async function writeProject(project: Project, floorplanChanged: boolean): Promise<void> {
  const { floorplan, ...rest } = project;
  await set(kProject(project.id), rest);
  if (floorplanChanged) {
    if (floorplan) await set(kFloorplan(project.id), floorplan);
    else await del(kFloorplan(project.id));
  }
  const meta: ProjectMeta = { id: project.id, name: project.name, updatedAt: Date.now() };
  const index = await readIndex();
  const next = [meta, ...index.filter((p) => p.id !== project.id)];
  await set(K_INDEX, next);
  await set(K_CURRENT, project.id);
  setList(next);
}

async function readProject(id: string): Promise<Project | null> {
  const raw = await get<Partial<Project>>(kProject(id));
  if (!raw) return null;
  const floorplan = await get<FloorplanImage>(kFloorplan(id));
  return normalizeProject({ ...raw, id, floorplan });
}

// Put a project into the store without triggering an autosave of it
function applyLoaded(project: Project) {
  lastSaved = project;
  lastSavedFloorplan = project.floorplan;
  useAppStore.getState().replaceProject(project);
}

/** Write pending changes immediately (also used before switching projects). */
export function flushSave(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  const project = useAppStore.getState().project;
  if (project === lastSaved) return saving;
  const floorplanChanged = project.floorplan !== lastSavedFloorplan;
  lastSaved = project;
  lastSavedFloorplan = project.floorplan;
  saving = saving
    .then(() => writeProject(project, floorplanChanged))
    .then(() => { if (useAppStore.getState().saveError) useAppStore.setState({ saveError: false }); })
    .catch((err) => {
      console.error('[RoomSim] 自動保存に失敗しました:', err);
      lastSaved = null;   // retry on the next change
      useAppStore.setState({ saveError: true });
    });
  return saving;
}

async function migrateLegacy(): Promise<Project | null> {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const project = normalizeProject(JSON.parse(raw));
    await writeProject(project, true);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return project;
  } catch (err) {
    console.error('[RoomSim] 旧データの移行に失敗しました:', err);
    return null;
  }
}

/** Load the last-opened project and start autosaving. Call once on startup. */
export async function initPersistence(): Promise<void> {
  // Ask the browser not to evict our data under storage pressure (best effort)
  navigator.storage?.persist?.().catch(() => {});

  let index = await readIndex();
  let project: Project | null = null;
  if (index.length === 0) project = await migrateLegacy();
  if (!project) {
    const currentId = (await get<string>(K_CURRENT)) ?? index[0]?.id;
    if (currentId) project = await readProject(currentId);
  }
  if (!project) {
    project = makeInitialProject(nextDefaultName(index));
    await writeProject(project, true);
  }
  index = await readIndex();
  setList(index);
  applyLoaded(project);

  useAppStore.subscribe((state, prev) => {
    if (state.project === prev.project || state.project === lastSaved) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void flushSave(); }, AUTOSAVE_DELAY_MS);
  });

  // Mobile browsers may kill a backgrounded tab at any time: save right away
  const flushNow = () => { void flushSave(); };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
  window.addEventListener('pagehide', flushNow);
}

// Default names are numbered so they can be told apart in the project picker
const nextDefaultName = (index: ProjectMeta[]) => `物件 ${index.length + 1}`;

export async function createProject(): Promise<void> {
  await flushSave();
  const project = makeInitialProject(nextDefaultName(await readIndex()));
  await writeProject(project, true);
  applyLoaded(project);
}

export async function switchProject(id: string): Promise<void> {
  if (id === useAppStore.getState().project.id) return;
  await flushSave();
  const project = await readProject(id);
  if (!project) return;
  await set(K_CURRENT, id);
  applyLoaded(project);
}

export async function deleteProject(id: string): Promise<void> {
  await flushSave();
  await del(kProject(id));
  await del(kFloorplan(id));
  const index = (await readIndex()).filter((p) => p.id !== id);
  await set(K_INDEX, index);
  setList(index);
  if (id !== useAppStore.getState().project.id) return;
  const nextId = index[0]?.id;
  const next = nextId ? await readProject(nextId) : null;
  if (next) {
    await set(K_CURRENT, next.id);
    applyLoaded(next);
  } else {
    await createProject();
  }
}

/** Download the current project (including the floorplan image) as a JSON file. */
export function exportCurrentProject(): void {
  const project = useAppStore.getState().project;
  const json = JSON.stringify({ format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), project });
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[\\/:*?"<>|]/g, '_') || 'roomsim'}.roomsim.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Import an exported file as a NEW project (never overwrites an existing one). */
export async function importProjectFile(file: File): Promise<void> {
  const data = JSON.parse(await readFileText(file));
  // Accept both the export wrapper and a bare project (old localStorage format)
  const raw = data?.format === EXPORT_FORMAT ? data.project : data;
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.furniture)) {
    throw new Error('RoomSim のデータではありません');
  }
  await flushSave();
  const project = normalizeProject({ ...raw, id: crypto.randomUUID() });
  await writeProject(project, true);
  applyLoaded(project);
}
