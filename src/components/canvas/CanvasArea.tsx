import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { CalibrationMode } from '../../App';
import { FloorplanLayer } from './FloorplanLayer';
import { FurnitureLayer } from './FurnitureLayer';
import { RulerOverlay } from './RulerOverlay';
import { useAppStore } from '../../store/useAppStore';
import { getPixelsPerCm } from '../../utils/scaleUtils';

interface CanvasAreaProps {
  calibrationMode: CalibrationMode;
  onRulerPoint: (point: { x: number; y: number }) => void;
  onTatamiRect: (rect: { x: number; y: number; width: number; height: number }) => void;
}

const SCALE_STEP = 1.12;
const MIN_SCALE = 0.1;
const MAX_SCALE = 20;

export function CanvasArea({ calibrationMode, onRulerPoint, onTatamiRect }: CanvasAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const selectFurniture = useAppStore((s) => s.selectFurniture);
  const scale = useAppStore((s) => s.project.scale);
  const snapGrid = useAppStore((s) => s.project.snapGrid);

  const ppc = getPixelsPerCm(scale);
  const gridSpacingPx = snapGrid.sizeCm * ppc * stageScale;
  const showGrid = snapGrid.enabled && gridSpacingPx >= 15;
  const bgOffsetX = ((stagePos.x % gridSpacingPx) + gridSpacingPx) % gridSpacingPx;
  const bgOffsetY = ((stagePos.y % gridSpacingPx) + gridSpacingPx) % gridSpacingPx;
  // SVG data URL: L-shaped dashed path tiled to form a full grid
  const gridSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='${gridSpacingPx}' height='${gridSpacingPx}'><path d='M ${gridSpacingPx} 0 L 0 0 0 ${gridSpacingPx}' fill='none' stroke='rgba(80,120,200,0.3)' stroke-width='1' stroke-dasharray='3,5'/></svg>`;
  const gridBg = `url("data:image/svg+xml,${encodeURIComponent(gridSvg)}")`;

  // Keep Stage size in sync with its container element
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: container.clientWidth, height: container.clientHeight });
    });
    observer.observe(container);
    setSize({ width: container.clientWidth, height: container.clientHeight });
    return () => observer.disconnect();
  }, []);

  // Zoom toward the cursor on mouse wheel
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage() as Konva.Stage;
    const pointer = stage.getPointerPosition()!;
    const oldScale = stageScale;
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, oldScale * (direction > 0 ? SCALE_STEP : 1 / SCALE_STEP))
    );
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, [stageScale, stagePos]);

  // Deselect furniture when clicking empty canvas area
  const handleStageClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) selectFurniture(null);
  };

  // Update stage position after dragging the canvas to pan
  const handleStageDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage()) setStagePos(e.target.position());
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Stage
        width={size.width}
        height={size.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={calibrationMode === null}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDragEnd={handleStageDragEnd}
      >
        <FloorplanLayer />
        <FurnitureLayer stageScale={stageScale} stagePos={stagePos} canvasSize={size} />
        {calibrationMode && (
          <RulerOverlay
            mode={calibrationMode}
            onRulerPoint={onRulerPoint}
            onTatamiRect={onTatamiRect}
          />
        )}
      </Stage>

      {showGrid && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: gridBg,
            backgroundSize: `${gridSpacingPx}px ${gridSpacingPx}px`,
            backgroundPosition: `${bgOffsetX}px ${bgOffsetY}px`,
          }}
        />
      )}

      <div className="canvas-status">
        {scale
          ? `縮尺: ${scale.pixelsPerCm.toFixed(2)} px/cm (${scale.accuracy === 'estimated' ? '推定' : '実測'})`
          : '縮尺未設定（参考表示）'}
        {'　'}ズーム: {(stageScale * 100).toFixed(0)}%
      </div>
    </div>
  );
}
