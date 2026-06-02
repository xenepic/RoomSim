import { useState } from 'react';
import { Layer, Line, Circle, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
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
