import { useRef, useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useAppStore } from '../../store/useAppStore';
import { snapToAxis } from '../../utils/measureUtils';
import { DEFAULT_ROOM_CM, MIN_ROOM_CM, MIN_WALL_CM, snapDelta, snapLines } from '../../utils/planUtils';
import { getFixtureKind } from '../../data/planKinds';
import type { CmPoint } from '../../types';
import { SNAP_PX, type PlanDraft } from './PlanLayer';

const CLICK_PX = 4;          // pointer travel below this is a click, not a drag
const OPENING_PICK_PX = 24;  // how close to a wall a door/window click must be

/**
 * Plan-mode creation tools on the Stage: drag to draw a room/fixture rectangle or a
 * wall (a click drops a default-size room/fixture), click near a wall to place a
 * door/window. Rooms, fixtures and walls switch back to the select tool afterwards.
 */
export function usePlanDrawing(stageScale: number, ppc: number) {
  const [draft, setDraft] = useState<PlanDraft>(null);
  const startRef = useRef<{ raw: CmPoint; snapped: CmPoint } | null>(null);
  // The click that follows the pointerup of a drawing gesture must not deselect
  // what was just created (the tool is back to 'select' by then)
  const swallowClickRef = useRef(false);

  const k = 1 / (ppc * stageScale);   // screen px → cm

  const pointerCm = (e: KonvaEventObject<PointerEvent>): CmPoint | null => {
    const p = e.target.getStage()?.getRelativePointerPosition();
    return p ? { x: p.x / ppc, y: p.y / ppc } : null;
  };

  const snapPoint = (p: CmPoint): CmPoint => {
    const { project } = useAppStore.getState();
    const lines = snapLines(project.plan!, []);
    const grid = project.snapGrid.enabled ? project.snapGrid.sizeCm : undefined;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    return {
      x: x + snapDelta([x], lines.xs, SNAP_PX * k, grid),
      y: y + snapDelta([y], lines.ys, SNAP_PX * k, grid),
    };
  };

  const draftFor = (a: CmPoint, b: CmPoint): PlanDraft => {
    if (useAppStore.getState().planTool === 'wall') return { kind: 'line', a, b: snapToAxis(a, b) };
    return { kind: 'rect', x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
  };

  const onPointerDown = (e: KonvaEventObject<PointerEvent>) => {
    if (e.evt.button !== 0) return;
    swallowClickRef.current = false;
    // Presses on an existing door/window select/drag it instead of placing a new one
    if (e.target !== e.target.getStage()) return;
    const p = pointerCm(e);
    if (!p) return;
    startRef.current = { raw: p, snapped: snapPoint(p) };
  };

  const onPointerMove = (e: KonvaEventObject<PointerEvent>) => {
    const start = startRef.current;
    const p = start && pointerCm(e);
    if (!start || !p) return;
    const tool = useAppStore.getState().planTool;
    if (tool === 'door' || tool === 'window') return;
    if (Math.hypot(p.x - start.raw.x, p.y - start.raw.y) < CLICK_PX * k && !draft) return;
    setDraft(draftFor(start.snapped, snapPoint(p)));
  };

  const onPointerUp = (e: KonvaEventObject<PointerEvent>) => {
    const start = startRef.current;
    startRef.current = null;
    setDraft(null);
    const p = start && pointerCm(e);
    if (!start || !p) return;
    swallowClickRef.current = true;
    const st = useAppStore.getState();
    const isClick = Math.hypot(p.x - start.raw.x, p.y - start.raw.y) < CLICK_PX * k;
    const tool = st.planTool;

    if (tool === 'door' || tool === 'window') {
      if (isClick) st.placeOpening(p, OPENING_PICK_PX * k);
      return;
    }

    const d = draftFor(start.snapped, snapPoint(p));
    if (tool === 'wall') {
      if (d?.kind !== 'line' || Math.hypot(d.b.x - d.a.x, d.b.y - d.a.y) < MIN_WALL_CM) return;
      st.addWall(d.a, d.b);
    } else if (tool === 'room' || tool === 'fixture') {
      let rect = d?.kind === 'rect' ? { x: d.x, y: d.y, w: d.w, h: d.h } : null;
      if (isClick || !rect || rect.w < MIN_ROOM_CM || rect.h < MIN_ROOM_CM) {
        // A click drops a default-size element centered on the point
        const size = tool === 'room'
          ? { w: DEFAULT_ROOM_CM, h: DEFAULT_ROOM_CM }
          : getFixtureKind(st.planFixtureKind);
        rect = { x: Math.round(p.x - size.w / 2), y: Math.round(p.y - size.h / 2), w: size.w, h: size.h };
      }
      if (tool === 'room') st.addRoom(rect);
      else st.addFixture(rect);
    } else {
      return;
    }
    st.setPlanTool('select');
  };

  const consumeClick = () => {
    const swallow = swallowClickRef.current;
    swallowClickRef.current = false;
    return swallow;
  };

  return { draft, handlers: { onPointerDown, onPointerMove, onPointerUp }, consumeClick };
}
