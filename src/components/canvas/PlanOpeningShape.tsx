import { Group, Rect, Shape } from 'react-konva';
import type { Context } from 'konva/lib/Context';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { PlanOpening } from '../../types';
import { frameAngleDeg, framePoint, type HostFrame } from '../../utils/planUtils';

export const FLOOR_COLOR = '#FFFFFF';
const DOOR_COLOR = '#C2410C';
const DOOR_SWING_FILL = 'rgba(234, 88, 12, 0.10)';
const WINDOW_COLOR = '#0284C7';
const WINDOW_FRONT_FILL = 'rgba(14, 165, 233, 0.10)';
const SELECT_COLOR = '#2563EB';
const FLOOR_WINDOW_FRONT_CM = 60;   // keep-clear zone drawn in front of 掃き出し windows
const HIT_PAD_PX = 10;

interface OpeningShapeProps {
  opening: PlanOpening;
  frame: HostFrame;
  k: number;   // cm per screen px
  interactive: boolean;
  selected: boolean;
  onClick?: (e: KonvaEventObject<MouseEvent>) => void;
  onDragStart?: (e: KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
}

const line = (ctx: Context, x1: number, y1: number, x2: number, y2: number) => {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
};

/**
 * A door or window in its wall. Local frame: x along the wall (centered on the opening),
 * y along the wall normal (+ = into the room); the wall occupies y in frame.band.
 * The opening is painted over the wall with the floor color, then the symbol is drawn
 * by a single sceneFunc shape (strokes in screen px via k).
 */
export function OpeningShape({ opening: o, frame, k, interactive, selected, onClick, onDragStart, onDragMove }: OpeningShapeProps) {
  const w = o.widthCm;
  const [b0, b1] = frame.band;
  const pos = framePoint(frame, o.offsetCm);

  const sceneFunc = (ctx: Context) => {
    ctx.setAttr('lineCap', 'butt');
    ctx.setLineDash([]);
    if (o.type === 'door') drawDoor(ctx, o, w, b0, b1, k);
    else drawWindow(ctx, o, w, b0, b1, k);
  };

  return (
    <Group
      x={pos.x} y={pos.y} rotation={frameAngleDeg(frame)}
      draggable={interactive}
      onClick={onClick} onDragStart={onDragStart} onDragMove={onDragMove}
    >
      {/* Hit area: the wall band plus some padding, so thin walls are easy to grab */}
      {interactive && (
        <Rect x={-w / 2} y={b0 - HIT_PAD_PX * k} width={w} height={b1 - b0 + 2 * HIT_PAD_PX * k} fill="rgba(0,0,0,0)" />
      )}
      {/* Cut the wall (also covers a neighbouring room's wall drawn at the same place) */}
      <Rect x={-w / 2} y={b0 - 0.5} width={w} height={b1 - b0 + 1} fill={FLOOR_COLOR} listening={false} perfectDrawEnabled={false} />
      <Shape sceneFunc={sceneFunc} listening={false} perfectDrawEnabled={false} />
      {selected && (
        <Rect
          x={-w / 2 - 3 * k} y={b0 - 3 * k} width={w + 6 * k} height={b1 - b0 + 6 * k}
          stroke={SELECT_COLOR} strokeWidth={2 * k} listening={false}
        />
      )}
    </Group>
  );
}

function drawDoor(ctx: Context, o: Extract<PlanOpening, { type: 'door' }>, w: number, b0: number, b1: number, k: number) {
  const s = o.swing === 'in' ? 1 : -1;
  const face = s > 0 ? b1 : b0;   // the wall face the door swings away from

  // Jambs
  ctx.beginPath();
  line(ctx, -w / 2, b0, -w / 2, b1);
  line(ctx, w / 2, b0, w / 2, b1);
  ctx.setAttr('strokeStyle', '#555');
  ctx.setAttr('lineWidth', 1 * k);
  ctx.stroke();

  if (o.door === 'opening') return;

  if (o.door === 'sliding') {
    // Two panels in the wall, and an arrow toward the end the door slides to
    const ym = (b0 + b1) / 2;
    const d = Math.max((b1 - b0) / 4, 1.5 * k);
    ctx.beginPath();
    line(ctx, -w / 2, ym - d, w * 0.05, ym - d);
    line(ctx, -w * 0.05, ym + d, w / 2, ym + d);
    ctx.setAttr('strokeStyle', DOOR_COLOR);
    ctx.setAttr('lineWidth', 2.5 * k);
    ctx.stroke();
    const dir = o.hinge === 'end' ? 1 : -1;
    const ay = face + s * 10 * k;
    const tip = dir * w / 4;
    ctx.beginPath();
    line(ctx, -tip, ay, tip, ay);
    line(ctx, tip, ay, tip - dir * 5 * k, ay - 4 * k);
    line(ctx, tip, ay, tip - dir * 5 * k, ay + 4 * k);
    ctx.setAttr('lineWidth', 1.5 * k);
    ctx.stroke();
    return;
  }

  // Hinged (single, or two half-width leaves): leaf drawn open 90° plus its swing arc
  const leaves: Array<{ hx: number; r: number }> = o.door === 'double'
    ? [{ hx: -w / 2, r: w / 2 }, { hx: w / 2, r: w / 2 }]
    : [{ hx: o.hinge === 'start' ? -w / 2 : w / 2, r: w }];
  for (const { hx, r } of leaves) {
    const openA = s * Math.PI / 2;
    const closedA = hx < 0 ? 0 : Math.PI;
    let delta = closedA - openA;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    // Swing area
    ctx.beginPath();
    ctx.moveTo(hx, face);
    ctx.arc(hx, face, r, openA, openA + delta, delta < 0);
    ctx.closePath();
    ctx.setAttr('fillStyle', DOOR_SWING_FILL);
    ctx.fill();
    // Arc
    ctx.beginPath();
    ctx.arc(hx, face, r, openA, openA + delta, delta < 0);
    ctx.setAttr('strokeStyle', DOOR_COLOR);
    ctx.setAttr('lineWidth', 1 * k);
    ctx.stroke();
    // Leaf
    ctx.beginPath();
    line(ctx, hx, face, hx, face + s * r);
    ctx.setAttr('lineWidth', 2.5 * k);
    ctx.stroke();
  }
}

function drawWindow(ctx: Context, o: Extract<PlanOpening, { type: 'window' }>, w: number, b0: number, b1: number, k: number) {
  if (o.window === 'floor') {
    // Floor-level window: an area to keep clear in front of it
    ctx.beginPath();
    ctx.rect(-w / 2, b1, w, FLOOR_WINDOW_FRONT_CM);
    ctx.setAttr('fillStyle', WINDOW_FRONT_FILL);
    ctx.fill();
  }

  // Frame: the two wall faces and the jambs
  ctx.beginPath();
  line(ctx, -w / 2, b0, w / 2, b0);
  line(ctx, -w / 2, b1, w / 2, b1);
  line(ctx, -w / 2, b0, -w / 2, b1);
  line(ctx, w / 2, b0, w / 2, b1);
  ctx.setAttr('strokeStyle', WINDOW_COLOR);
  ctx.setAttr('lineWidth', 1 * k);
  ctx.stroke();

  // Glass: one pane (FIX) or two overlapping sliding panes
  const ym = (b0 + b1) / 2;
  const d = Math.max((b1 - b0) / 6, 1.5 * k);
  ctx.beginPath();
  if (o.window === 'fix') {
    line(ctx, -w / 2, ym, w / 2, ym);
  } else {
    line(ctx, -w / 2, ym - d, w * 0.05, ym - d);
    line(ctx, -w * 0.05, ym + d, w / 2, ym + d);
  }
  ctx.setAttr('lineWidth', (o.window === 'floor' ? 3 : 2) * k);
  ctx.stroke();
}
