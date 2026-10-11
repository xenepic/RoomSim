import type { Project } from '../types';

export const makeInitialProject = (name = '新しい物件'): Project => ({
  id: crypto.randomUUID(),
  name,
  snapGrid: { enabled: false, sizeCm: 50 },
  furniture: [],
  dimensions: [],
  memos: [],
});

// Fill in fields missing from data saved by older versions (or imported files)
export function normalizeProject(raw: Partial<Project>): Project {
  const base = makeInitialProject();
  return {
    ...base,
    ...raw,
    id: raw.id ?? base.id,
    name: raw.name ?? base.name,
    snapGrid: raw.snapGrid ?? base.snapGrid,
    furniture: Array.isArray(raw.furniture) ? raw.furniture : [],
    dimensions: Array.isArray(raw.dimensions) ? raw.dimensions : [],
    memos: Array.isArray(raw.memos) ? raw.memos : [],
  };
}
