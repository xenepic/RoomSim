import { Layer, Group, Line, Circle, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useAppStore } from '../../store/useAppStore';
import { formatCm, snapToAxis } from '../../utils/measureUtils';
import type { Dimension, ImagePoint, MemoPin } from '../../types';

const COLOR_MEASURED = '#1D4ED8';
const COLOR_UNMEASURED = '#E67E22';
const COLOR_SELECTED = '#DC2626';
const COLOR_MEMO = '#8E44AD';
const LABEL_FONT_SIZE = 13;
const LABEL_OFFSET_PX = 14;   // label distance from the line, in screen px
const TICK_PX = 7;
const MEMO_PREVIEW_CHARS = 14;

// Labels and pins are drawn at a constant on-screen size: every on-screen length
// below is divided by stageScale (world units = floorplan image px).

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string, fontSize: number, bold = false): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * fontSize * 0.6;
  measureCtx.font = `${bold ? 'bold ' : ''}${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  return measureCtx.measureText(text).width;
}

// Unit normal of a→b, oriented up (or left for vertical lines) so labels sit consistently
function labelNormal(a: ImagePoint, b: ImagePoint) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let nx = -(b.y - a.y) / len;
  let ny = (b.x - a.x) / len;
  if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
  return { nx, ny };
}

function TextBadge({ text, color, bold }: { text: string; color: string; bold?: boolean }) {
  const w = textWidth(text, LABEL_FONT_SIZE, bold);
  return (
    <>
      <Rect
        x={-w / 2 - 5} y={-10} width={w + 10} height={20}
        fill="#fff" opacity={0.92} stroke={color} strokeWidth={1} cornerRadius={4}
      />
      <Text
        x={-w / 2} y={-7} text={text}
        fontSize={LABEL_FONT_SIZE} fontStyle={bold ? 'bold' : 'normal'} fill={color}
      />
    </>
  );
}

interface MeasureLayerProps {
  stageScale: number;
  interactive: boolean;   // false in furniture mode: shown for reference only
}

export function MeasureLayer({ stageScale, interactive }: MeasureLayerProps) {
  const dimensions = useAppStore((s) => s.project.dimensions);
  const memos = useAppStore((s) => s.project.memos);
  const tool = useAppStore((s) => s.measureTool);
  const selection = useAppStore((s) => s.measureSelection);
  const draft = useAppStore((s) => s.dimensionDraft);
  const axisSnap = useAppStore((s) => s.axisSnap);
  const selectMeasure = useAppStore((s) => s.selectMeasure);
  const updateDimension = useAppStore((s) => s.updateDimension);
  const updateMemo = useAppStore((s) => s.updateMemo);
  const pushMeasureUndo = useAppStore((s) => s.pushMeasureUndo);

  const k = 1 / stageScale;
  // Line taps only select in the select tool, so placing points is never blocked
  const linesListening = interactive && tool === 'select';
  const pinsListening = interactive && tool !== 'dimension';

  const renderDimension = (d: Dimension) => {
    const selected = selection?.kind === 'dimension' && selection.id === d.id;
    const color = selected ? COLOR_SELECTED : d.valueCm === null ? COLOR_UNMEASURED : COLOR_MEASURED;
    const { nx, ny } = labelNormal(d.a, d.b);
    const tick = (p: ImagePoint) => [p.x - nx * TICK_PX * k, p.y - ny * TICK_PX * k, p.x + nx * TICK_PX * k, p.y + ny * TICK_PX * k];
    const label = d.note ? `${formatCm(d.valueCm)} ${d.note}` : formatCm(d.valueCm);
    const select = () => selectMeasure({ kind: 'dimension', id: d.id });
    return (
      <Group key={d.id} listening={linesListening} onClick={select} onTap={select}>
        {selected && (
          <Line points={[d.a.x, d.a.y, d.b.x, d.b.y]} stroke={COLOR_SELECTED} opacity={0.2} strokeWidth={12 * k} lineCap="round" />
        )}
        <Line
          points={[d.a.x, d.a.y, d.b.x, d.b.y]}
          stroke={color} strokeWidth={2 * k} hitStrokeWidth={22 * k}
          dash={d.valueCm === null ? [6 * k, 4 * k] : undefined}
        />
        <Line points={tick(d.a)} stroke={color} strokeWidth={2 * k} />
        <Line points={tick(d.b)} stroke={color} strokeWidth={2 * k} />
        <Group
          x={(d.a.x + d.b.x) / 2 + nx * LABEL_OFFSET_PX * k}
          y={(d.a.y + d.b.y) / 2 + ny * LABEL_OFFSET_PX * k}
          scaleX={k} scaleY={k}
        >
          <TextBadge text={label} color={color} bold />
        </Group>
      </Group>
    );
  };

  // Draggable endpoint handles for the selected dimension
  const renderHandles = (d: Dimension) => (['a', 'b'] as const).map((end) => {
    const other = end === 'a' ? d.b : d.a;
    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
      const raw = e.target.position();
      const p = axisSnap ? snapToAxis(other, raw) : raw;
      e.target.position(p);
      updateDimension(d.id, { [end]: p }, { undoKey: false });
    };
    return (
      <Circle
        key={end}
        x={d[end].x} y={d[end].y}
        radius={9 * k} fill="#fff" stroke={COLOR_SELECTED} strokeWidth={2.5 * k}
        hitStrokeWidth={30 * k}
        draggable
        onDragStart={() => pushMeasureUndo()}
        onDragMove={handleDragMove}
      />
    );
  });

  const renderMemo = (m: MemoPin, index: number) => {
    const selected = selection?.kind === 'memo' && selection.id === m.id;
    const firstLine = m.text.split('\n')[0];
    const preview = firstLine.length > MEMO_PREVIEW_CHARS ? `${firstLine.slice(0, MEMO_PREVIEW_CHARS)}…` : firstLine;
    const select = () => selectMeasure({ kind: 'memo', id: m.id });
    return (
      <Group
        key={m.id}
        x={m.pos.x} y={m.pos.y} scaleX={k} scaleY={k}
        listening={pinsListening}
        draggable={selected}
        onClick={select} onTap={select}
        onDragStart={() => pushMeasureUndo()}
        onDragEnd={(e) => updateMemo(m.id, { pos: e.target.position() }, { undoKey: false })}
      >
        <Circle
          radius={12} fill={COLOR_MEMO}
          stroke={selected ? COLOR_SELECTED : '#fff'} strokeWidth={selected ? 3 : 2}
          hitStrokeWidth={16}
          shadowColor="rgba(0,0,0,0.3)" shadowBlur={3}
        />
        <Text
          x={-12} y={-6} width={24} align="center" text={String(index + 1)}
          fontSize={12} fontStyle="bold" fill="#fff" listening={false}
        />
        {preview && (
          <Group x={18 + textWidth(preview, LABEL_FONT_SIZE) / 2 + 5} listening={false}>
            <TextBadge text={preview} color={COLOR_MEMO} />
          </Group>
        )}
      </Group>
    );
  };

  const selectedDim = selection?.kind === 'dimension'
    ? dimensions.find((d) => d.id === selection.id)
    : undefined;

  return (
    <Layer listening={interactive} opacity={interactive ? 1 : 0.75}>
      {dimensions.map(renderDimension)}
      {interactive && selectedDim && renderHandles(selectedDim)}
      {memos.map(renderMemo)}
      {interactive && draft && (
        <Circle x={draft.x} y={draft.y} radius={6 * k} fill={COLOR_SELECTED} stroke="#fff" strokeWidth={2 * k} listening={false} />
      )}
    </Layer>
  );
}
