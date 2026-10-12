import type { StateCreator } from 'zustand';
import type {
  AppState, AppStore, Plan, PlanOpening, PlanRef, PlanSnapshot, UndoOption,
} from '../types';
import {
  clampOffset, deleteFromPlan, findNearestHost, fitOpenings, furnitureToMove, hostFrame, translatePlan,
} from '../utils/planUtils';
import { getDoorType, getFixtureKind, getWindowType } from '../data/planKinds';
import { setMeasureLink, setPlanValue } from '../utils/planMeasure';

const MAX_UNDO = 50;
const DUPLICATE_OFFSET_CM = 20;

export type PlanSlice = Pick<AppStore,
  | 'planTool' | 'planSelection' | 'planDoorType' | 'planWindowType' | 'planFixtureKind'
  | 'planMoveFurniture' | 'planUndo' | 'planRedo' | 'lastPlanUndoKey'
  | 'setBackground' | 'setPlanTool' | 'setPlanPlaceType' | 'setPlanMoveFurniture'
  | 'selectPlan' | 'setPlanSelection' | 'updatePlanSettings'
  | 'addRoom' | 'updateRoom' | 'addWall' | 'updateWall' | 'placeOpening' | 'updateOpening'
  | 'addFixture' | 'updateFixture' | 'deletePlanSelection' | 'duplicatePlanSelection'
  | 'linkMeasure' | 'movePlanSelection' | 'movePlanSelectionFrom' | 'pushPlanUndo' | 'undoPlan' | 'redoPlan'>;

// Plan UI state cleared whenever the project is swapped or cleared
export const clearedPlanSessionState = {
  planSelection: [],
  planUndo: [],
  planRedo: [],
  lastPlanUndoKey: null,
} satisfies Partial<AppState>;

const sameRef = (x: PlanRef, y: PlanRef) => x.kind === y.kind && x.id === y.id;

export const createPlanSlice: StateCreator<AppStore, [], [], PlanSlice> = (set, get) => {
  // Apply a change to the plan, pushing an undo snapshot first (see UndoOption)
  const commit = (fn: (plan: Plan) => Plan, opts?: UndoOption, extra?: Partial<AppState>) => {
    if (!get().project.plan) return;
    if (opts?.undoKey !== false) get().pushPlanUndo(opts?.undoKey);
    set((state) => ({ project: { ...state.project, plan: fn(state.project.plan!) }, ...extra }));
  };

  const restore = (snap: PlanSnapshot) => {
    const exists = (r: PlanRef) => {
      const list: Array<{ id: string }> = r.kind === 'room' ? snap.plan.rooms
        : r.kind === 'wall' ? snap.plan.walls
          : r.kind === 'opening' ? snap.plan.openings : snap.plan.fixtures;
      return list.some((x) => x.id === r.id);
    };
    set((state) => ({
      project: { ...state.project, plan: snap.plan, furniture: snap.furniture },
      planSelection: state.planSelection.filter(exists),
      lastPlanUndoKey: null,
    }));
  };

  const snapshot = (): PlanSnapshot => ({ plan: get().project.plan!, furniture: get().project.furniture });

  return {
    planTool: 'select',
    planSelection: [],
    planDoorType: 'hinged',
    planWindowType: 'sliding',
    planFixtureKind: 'column',
    planMoveFurniture: false,
    planUndo: [],
    planRedo: [],
    lastPlanUndoKey: null,

    setBackground: (background) => set((state) => ({ project: { ...state.project, background } })),

    setPlanTool: (tool) => set({ planTool: tool }),

    // Picking a kind also switches to the tool that places it
    setPlanPlaceType: (changes) => set({
      ...changes,
      ...(changes.planDoorType ? { planTool: 'door' as const } : {}),
      ...(changes.planWindowType ? { planTool: 'window' as const } : {}),
      ...(changes.planFixtureKind ? { planTool: 'fixture' as const } : {}),
    }),

    setPlanMoveFurniture: (enabled) => set({ planMoveFurniture: enabled }),

    selectPlan: (ref, additive = false) => {
      if (!ref) { set({ planSelection: [] }); return; }
      const sel = get().planSelection;
      if (!additive) { set({ planSelection: [ref] }); return; }
      set({ planSelection: sel.some((r) => sameRef(r, ref)) ? sel.filter((r) => !sameRef(r, ref)) : [...sel, ref] });
    },

    setPlanSelection: (refs) => set({ planSelection: refs }),

    updatePlanSettings: (changes, opts) => commit((plan) => fitOpenings({ ...plan, ...changes }), opts),

    addRoom: ({ name, ...rect }) => {
      const id = crypto.randomUUID();
      commit(
        (plan) => ({ ...plan, rooms: [...plan.rooms, { id, name: name ?? `部屋${plan.rooms.length + 1}`, ...rect }] }),
        undefined,
        { planSelection: [{ kind: 'room', id }] },
      );
      return id;
    },

    updateRoom: (id, changes, opts) => commit((plan) => fitOpenings({
      ...plan,
      rooms: plan.rooms.map((r) => (r.id === id ? { ...r, ...changes } : r)),
    }), opts),

    addWall: (a, b) => {
      const id = crypto.randomUUID();
      commit((plan) => ({ ...plan, walls: [...plan.walls, { id, a, b }] }), undefined, { planSelection: [{ kind: 'wall', id }] });
      return id;
    },

    updateWall: (id, changes, opts) => commit((plan) => fitOpenings({
      ...plan,
      walls: plan.walls.map((w) => (w.id === id ? { ...w, ...changes } : w)),
    }), opts),

    placeOpening: (point, maxDistCm) => {
      const { project, planTool, planDoorType, planWindowType } = get();
      const plan = project.plan;
      if (!plan || (planTool !== 'door' && planTool !== 'window')) return null;
      const hit = findNearestHost(plan, point, maxDistCm);
      const f = hit && hostFrame(plan, hit.host);
      if (!hit || !f) return null;
      const id = crypto.randomUUID();
      let opening: PlanOpening;
      if (planTool === 'door') {
        const def = getDoorType(planDoorType);
        const widthCm = Math.min(def.widthCm, f.len);
        opening = {
          id, host: hit.host, type: 'door', door: def.id, widthCm,
          offsetCm: clampOffset(f.len, widthCm, hit.offsetCm), hinge: 'start', swing: 'in',
        };
      } else {
        const def = getWindowType(planWindowType);
        const widthCm = Math.min(def.widthCm, f.len);
        opening = {
          id, host: hit.host, type: 'window', window: def.id, widthCm,
          offsetCm: clampOffset(f.len, widthCm, hit.offsetCm), sillCm: def.sillCm, heightCm: def.heightCm,
        };
      }
      commit((p) => ({ ...p, openings: [...p.openings, opening] }), undefined, { planSelection: [{ kind: 'opening', id }] });
      return id;
    },

    updateOpening: (id, changes, opts) => commit((plan) => fitOpenings({
      ...plan,
      openings: plan.openings.map((o) => (o.id === id ? { ...o, ...changes } as PlanOpening : o)),
    }), opts),

    addFixture: ({ kind, ...rect }) => {
      const def = getFixtureKind(kind ?? get().planFixtureKind);
      const id = crypto.randomUUID();
      commit(
        (plan) => ({ ...plan, fixtures: [...plan.fixtures, { id, kind: def.id, label: def.label, ...rect }] }),
        undefined,
        { planSelection: [{ kind: 'fixture', id }] },
      );
      return id;
    },

    updateFixture: (id, changes, opts) => commit((plan) => ({
      ...plan,
      fixtures: plan.fixtures.map((f) => (f.id === id ? { ...f, ...changes } : f)),
    }), opts),

    deletePlanSelection: () => {
      const sel = get().planSelection;
      if (sel.length === 0) return;
      commit((plan) => deleteFromPlan(plan, sel), undefined, { planSelection: [] });
    },

    // Copies are offset so they are visibly separate; openings on copied rooms/walls
    // are copied with them. The copies become the selection.
    duplicatePlanSelection: () => {
      const sel = get().planSelection;
      if (sel.length === 0) return;
      const d = DUPLICATE_OFFSET_CM;
      const newIds = new Map<string, string>();
      const copyId = (id: string) => { const n = crypto.randomUUID(); newIds.set(id, n); return n; };
      const picked = (kind: PlanRef['kind'], id: string) => sel.some((r) => r.kind === kind && r.id === id);
      const next: PlanRef[] = [];
      commit((plan) => {
        const rooms = plan.rooms.filter((r) => picked('room', r.id))
          .map((r) => ({ ...r, id: copyId(r.id), x: r.x + d, y: r.y + d }));
        const walls = plan.walls.filter((w) => picked('wall', w.id))
          .map((w) => ({ ...w, id: copyId(w.id), a: { x: w.a.x + d, y: w.a.y + d }, b: { x: w.b.x + d, y: w.b.y + d } }));
        const fixtures = plan.fixtures.filter((f) => picked('fixture', f.id))
          .map((f) => ({ ...f, id: copyId(f.id), x: f.x + d, y: f.y + d }));
        const openings: PlanOpening[] = [];
        for (const o of plan.openings) {
          const hostId = o.host.kind === 'room' ? o.host.roomId : o.host.wallId;
          const newHost = newIds.get(hostId);
          const id = crypto.randomUUID();
          if (newHost) {
            openings.push({
              ...o, id,
              host: o.host.kind === 'room' ? { ...o.host, roomId: newHost } : { kind: 'wall', wallId: newHost },
            });
          } else if (picked('opening', o.id)) {
            // A lone opening is copied next to itself on the same wall
            const f = hostFrame(plan, o.host);
            if (!f) continue;
            openings.push({ ...o, id, offsetCm: clampOffset(f.len, o.widthCm, o.offsetCm + o.widthCm + d) });
          } else {
            continue;
          }
          if (picked('opening', o.id)) next.push({ kind: 'opening', id });
        }
        rooms.forEach((r) => next.push({ kind: 'room', id: r.id }));
        walls.forEach((w) => next.push({ kind: 'wall', id: w.id }));
        fixtures.forEach((f) => next.push({ kind: 'fixture', id: f.id }));
        return {
          ...plan,
          rooms: [...plan.rooms, ...rooms],
          walls: [...plan.walls, ...walls],
          fixtures: [...plan.fixtures, ...fixtures],
          openings: [...plan.openings, ...openings],
        };
      });
      set({ planSelection: next });
    },

    linkMeasure: (ref, field, dimensionId, apply = false) => {
      const value = dimensionId ? get().project.dimensions.find((d) => d.id === dimensionId)?.valueCm : null;
      commit((plan) => {
        const linked = setMeasureLink(plan, ref, field, dimensionId);
        return apply && value != null ? setPlanValue(linked, ref, field, value) : linked;
      });
    },

    movePlanSelection: (dx, dy, opts) => {
      if (!get().project.plan || get().planSelection.length === 0) return;
      if (opts?.undoKey !== false) get().pushPlanUndo(opts?.undoKey);
      get().movePlanSelectionFrom(snapshot(), dx, dy);
    },

    movePlanSelectionFrom: (base, dx, dy) => {
      const { planSelection, planMoveFurniture } = get();
      const plan = translatePlan(base.plan, planSelection, dx, dy);
      const ids = planMoveFurniture ? furnitureToMove(base.plan, planSelection, base.furniture) : null;
      set((state) => ({
        project: {
          ...state.project,
          plan,
          furniture: ids && ids.size > 0
            ? base.furniture.map((f) => (ids.has(f.id) ? { ...f, xCm: f.xCm + dx, yCm: f.yCm + dy } : f))
            : state.project.furniture,
        },
      }));
    },

    pushPlanUndo: (undoKey) => {
      const { project, planUndo, lastPlanUndoKey } = get();
      if (!project.plan) return;
      if (undoKey && undoKey === lastPlanUndoKey) return;
      set({
        planUndo: [...planUndo, snapshot()].slice(-MAX_UNDO),
        planRedo: [],
        lastPlanUndoKey: undoKey ?? null,
      });
    },

    undoPlan: () => {
      const { planUndo, planRedo, project } = get();
      const prev = planUndo[planUndo.length - 1];
      if (!prev || !project.plan) return;
      set({ planUndo: planUndo.slice(0, -1), planRedo: [...planRedo, snapshot()] });
      restore(prev);
    },

    redoPlan: () => {
      const { planUndo, planRedo, project } = get();
      const next = planRedo[planRedo.length - 1];
      if (!next || !project.plan) return;
      set({ planRedo: planRedo.slice(0, -1), planUndo: [...planUndo, snapshot()] });
      restore(next);
    },
  };
};
