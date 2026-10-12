import { useRef, useEffect, useCallback } from 'react';
import { Layer, Group, Rect, Text, Line, Transformer, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useAppStore } from '../../store/useAppStore';
import { getPixelsPerCm } from '../../utils/scaleUtils';
import {
  MIN_ROOM_CM, roomWallCm, roundCm, selectionEdges, snapDelta, snapLines, type SnapLines,
} from '../../utils/planUtils';
import type { CmPoint, PlanRef, PlanSnapshot } from '../../types';
import type { LoadedFloorplan } from './FloorplanLayer';

export const WALL_COLOR = '#3F3F46';
export const FLOOR_COLOR = '#FFFFFF';
const SELECT_COLOR = '#2563EB';
export const SNAP_PX = 8;   // snap distance on screen

export type PlanDraft =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'line'; a: CmPoint; b: CmPoint }
  | null;

interface PlanLayerProps {
  stageScale: number;
  interactive: boolean;   // plan mode with the select tool: elements can be selected/moved
  editing: boolean;       // plan mode (selection outlines, draft)
  underlay: LoadedFloorplan | null;   // floorplan image drawn over the plan (multiply)
  underlayOpacity: number;
  draft: PlanDraft;
}

// Draw order paints floors over walls, so walls inside overlapping rooms (L shapes)
// disappear, and openings are painted over walls afterwards.
// Everything plan-related lives in a Group scaled by px/cm, so children use cm;
// k converts screen px to cm for constant-size strokes and labels.
// Only a handful of shapes per element and no strokes on filled shapes, to keep
// pan/zoom cheap (the plan is also drawn in furniture mode).
export function PlanLayer({ stageScale, interactive, editing, underlay, underlayOpacity, draft }: PlanLayerProps) {
  const plan = useAppStore((s) => s.project.plan);
  const scale = useAppStore((s) => s.project.scale);
  const snapGrid = useAppStore((s) => s.project.snapGrid);
  const selection = useAppStore((s) => s.planSelection);
  const selectPlan = useAppStore((s) => s.selectPlan);
  const updateRoom = useAppStore((s) => s.updateRoom);

  const ppc = getPixelsPerCm(scale);
  const k = 1 / (ppc * stageScale);
  const snapThreshold = SNAP_PX * k;
  const gridCm = snapGrid.enabled ? snapGrid.sizeCm : undefined;

  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodesRef = useRef<Map<string, Konva.Node>>(new Map());
  const dragRef = useRef<{ base: PlanSnapshot; start: CmPoint; edges: SnapLines; lines: SnapLines } | null>(null);
  const resizeLinesRef = useRef<SnapLines | null>(null);

  const isSelected = (kind: PlanRef['kind'], id: string) => selection.some((r) => r.kind === kind && r.id === id);
  const single = selection.length === 1 ? selection[0] : null;
  const resizable = single && (single.kind === 'room' || single.kind === 'fixture') ? single : null;

  // Attach the Transformer to a single selected room/fixture
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = resizable ? nodesRef.current.get(resizable.id) : undefined;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [resizable?.id, plan, interactive]); // eslint-disable-line react-hooks/exhaustive-deps

  const setNode = useCallback((id: string) => (node: Konva.Node | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  if (!plan) return <Layer listening={false} />;

  const handleClick = (ref: PlanRef) => (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    selectPlan(ref, e.evt.shiftKey);
  };

  // Dragging any selected element moves the whole selection, snapping its edges
  // to the other elements (and the grid)
  const handleDragStart = (ref: PlanRef) => (e: KonvaEventObject<DragEvent>) => {
    const st = useAppStore.getState();
    let sel = st.planSelection;
    if (!sel.some((r) => r.kind === ref.kind && r.id === ref.id)) {
      sel = e.evt.shiftKey ? [...sel, ref] : [ref];
      st.setPlanSelection(sel);
    }
    st.pushPlanUndo();
    const base = { plan: st.project.plan!, furniture: st.project.furniture };
    dragRef.current = { base, start: e.target.position(), edges: selectionEdges(base.plan, sel), lines: snapLines(base.plan, sel) };
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    const d = dragRef.current;
    if (!d) return;
    let dx = Math.round(e.target.x() - d.start.x);
    let dy = Math.round(e.target.y() - d.start.y);
    dx += snapDelta(d.edges.xs.map((x) => x + dx), d.lines.xs, snapThreshold, gridCm);
    dy += snapDelta(d.edges.ys.map((y) => y + dy), d.lines.ys, snapThreshold, gridCm);
    e.target.position({ x: d.start.x + dx, y: d.start.y + dy });
    useAppStore.getState().movePlanSelectionFrom(d.base, dx, dy);
  };

  const handleDragEnd = () => { dragRef.current = null; };

  // Resize: anchors snap to the other elements' lines; the rect is written back live
  // (scale reset to 1) so walls and openings follow while dragging.
  const handleTransformStart = () => {
    const st = useAppStore.getState();
    st.pushPlanUndo();
    resizeLinesRef.current = snapLines(st.project.plan!, st.planSelection);
  };

  const anchorDragBoundFunc = (_old: Konva.Vector2d, pos: Konva.Vector2d) => {
    const group = groupRef.current;
    const lines = resizeLinesRef.current;
    if (!group || !lines) return pos;
    const toCm = group.getAbsoluteTransform().copy().invert();
    const p = toCm.point(pos);
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    const snapped = {
      x: x + snapDelta([x], lines.xs, snapThreshold, gridCm),
      y: y + snapDelta([y], lines.ys, snapThreshold, gridCm),
    };
    return group.getAbsoluteTransform().point(snapped);
  };

  const handleRoomTransform = (id: string) => (e: KonvaEventObject<Event>) => {
    const node = e.target;
    const rect = {
      x: roundCm(node.x()),
      y: roundCm(node.y()),
      w: Math.max(MIN_ROOM_CM, roundCm(node.width() * node.scaleX())),
      h: Math.max(MIN_ROOM_CM, roundCm(node.height() * node.scaleY())),
    };
    node.scale({ x: 1, y: 1 });
    node.setAttrs({ width: rect.w, height: rect.h });
    updateRoom(id, rect, { undoKey: false });
  };

  const labelScale = { scaleX: k, scaleY: k };

  return (
    <Layer listening={interactive}>
      <Group ref={groupRef} scaleX={ppc} scaleY={ppc}>
        {/* Walls: one filled rect per room, extending outside the interior */}
        {plan.rooms.map((r) => {
          const t = roomWallCm(plan, r);
          return (
            <Rect key={r.id} x={r.x - t} y={r.y - t} width={r.w + 2 * t} height={r.h + 2 * t}
              fill={WALL_COLOR} listening={false} perfectDrawEnabled={false} />
          );
        })}
        {/* Floors */}
        {plan.rooms.map((r) => {
          const ref: PlanRef = { kind: 'room', id: r.id };
          return (
            <Rect
              key={r.id} ref={setNode(r.id)}
              x={r.x} y={r.y} width={r.w} height={r.h} fill={FLOOR_COLOR}
              perfectDrawEnabled={false}
              draggable={interactive}
              onClick={handleClick(ref)}
              onDragStart={handleDragStart(ref)} onDragMove={handleDragMove} onDragEnd={handleDragEnd}
              onTransformStart={handleTransformStart} onTransform={handleRoomTransform(r.id)}
            />
          );
        })}
        {/* Room labels (constant on-screen size) */}
        {plan.rooms.map((r) => (
          <Group key={r.id} x={r.x + r.w / 2} y={r.y + r.h / 2} {...labelScale} listening={false}>
            {r.name && (
              <Text text={r.name} x={-100} y={-15} width={200} align="center" fontSize={13} fontStyle="bold" fill="#333" />
            )}
            <Text text={`${r.w}×${r.h}`} x={-100} y={r.name ? 2 : -6} width={200} align="center" fontSize={11} fill="#777" />
          </Group>
        ))}
      </Group>

      {underlay && (
        <KonvaImage
          image={underlay.image} width={underlay.floorplan.widthPx} height={underlay.floorplan.heightPx}
          opacity={underlayOpacity}
          // Multiply: the image's white background disappears, its lines darken the plan
          globalCompositeOperation="multiply"
          listening={false}
        />
      )}

      {editing && (
        <Group scaleX={ppc} scaleY={ppc} listening={false}>
          {plan.rooms.filter((r) => isSelected('room', r.id)).map((r) => (
            <Rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} stroke={SELECT_COLOR} strokeWidth={2 * k} />
          ))}
          {draft?.kind === 'rect' && (
            <Rect x={draft.x} y={draft.y} width={draft.w} height={draft.h}
              stroke={SELECT_COLOR} strokeWidth={1.5 * k} dash={[6 * k, 4 * k]} />
          )}
          {draft?.kind === 'line' && (
            <Line points={[draft.a.x, draft.a.y, draft.b.x, draft.b.y]} stroke={SELECT_COLOR} strokeWidth={plan.wallCm} opacity={0.5} />
          )}
        </Group>
      )}

      {interactive && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          flipEnabled={false}
          keepRatio={false}
          ignoreStroke
          anchorSize={9}
          anchorDragBoundFunc={anchorDragBoundFunc}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5 ? oldBox : newBox)}
        />
      )}
    </Layer>
  );
}
