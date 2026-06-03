import { Layer, Line } from 'react-konva';
import { useAppStore } from '../../store/useAppStore';
import { getPixelsPerCm } from '../../utils/scaleUtils';

interface GridLayerProps {
  stageScale: number;
  stagePos: { x: number; y: number };
  canvasSize: { width: number; height: number };
}

// Beyond this density, grid lines are too crowded to be useful
const MAX_LINES_PER_AXIS = 150;

export function GridLayer({ stageScale, stagePos, canvasSize }: GridLayerProps) {
  const snapGrid = useAppStore((s) => s.project.snapGrid);
  const scale = useAppStore((s) => s.project.scale);

  const ppc = getPixelsPerCm(scale);
  const gridSpacing = snapGrid.sizeCm * ppc;

  // Visible area in layer (world) coordinates, accounting for stage zoom and pan
  const x0 = -stagePos.x / stageScale;
  const y0 = -stagePos.y / stageScale;
  const x1 = x0 + canvasSize.width / stageScale;
  const y1 = y0 + canvasSize.height / stageScale;

  const xStart = Math.floor(x0 / gridSpacing) * gridSpacing;
  const yStart = Math.floor(y0 / gridSpacing) * gridSpacing;

  const vCount = Math.ceil((x1 - xStart) / gridSpacing);
  const hCount = Math.ceil((y1 - yStart) / gridSpacing);

  // When zoomed far out with a small grid the line count explodes; skip rendering
  if (vCount > MAX_LINES_PER_AXIS || hCount > MAX_LINES_PER_AXIS) {
    return <Layer listening={false} />;
  }

  // Also skip if lines would be too close together on screen to be visible
  if (gridSpacing * stageScale < 15) {
    return <Layer listening={false} />;
  }

  // Keep stroke at 1 CSS-pixel regardless of zoom level
  const lineWidth = 1 / stageScale;

  // Dashed lines in a muted blue-gray; dash lengths scale with zoom so they stay visually consistent
  const dashLen = 3 / stageScale;
  const gapLen = 5 / stageScale;

  const lines: React.ReactNode[] = [];
  for (let i = 0, x = xStart; i < vCount + 1; i++, x += gridSpacing) {
    lines.push(<Line key={`v${i}`} points={[x, y0, x, y1]} stroke="rgba(80,120,200,0.3)" strokeWidth={lineWidth} dash={[dashLen, gapLen]} />);
  }
  for (let i = 0, y = yStart; i < hCount + 1; i++, y += gridSpacing) {
    lines.push(<Line key={`h${i}`} points={[x0, y, x1, y]} stroke="rgba(80,120,200,0.3)" strokeWidth={lineWidth} dash={[dashLen, gapLen]} />);
  }

  return <Layer listening={false}>{lines}</Layer>;
}
