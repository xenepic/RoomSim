import { useRef, useEffect, useCallback } from 'react';
import { Layer, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useAppStore } from '../../store/useAppStore';
import { FurnitureShape } from './FurnitureShape';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { getPixelsPerCm } from '../../utils/scaleUtils';
import type { FurnitureItem } from '../../types';

interface FurnitureLayerProps {
  stageScale: number;
  stagePos: { x: number; y: number };
  canvasSize: { width: number; height: number };
  interactive: boolean;   // false in measure mode: dimmed and ignores input
  onFurnitureTap?: () => void;
  // Shift held: a drag anywhere draws a selection marquee, so furniture doesn't drag
  marquee: boolean;
  // True if the click ends a marquee and must not change the selection
  consumeClick: () => boolean;
}

export function FurnitureLayer({ stageScale, interactive, onFurnitureTap, marquee, consumeClick }: FurnitureLayerProps) {
  const furniture = useAppStore((s) => s.project.furniture);
  const scale = useAppStore((s) => s.project.scale);
  const snapGrid = useAppStore((s) => s.project.snapGrid);
  const selectedId = useAppStore((s) => s.selectedId);
  const selection = useAppStore((s) => s.furnitureSelection);
  const selectFurniture = useAppStore((s) => s.selectFurniture);
  const toggleFurnitureSelection = useAppStore((s) => s.toggleFurnitureSelection);
  const updateFurniture = useAppStore((s) => s.updateFurniture);
  const moveFurnitureBy = useAppStore((s) => s.moveFurnitureBy);

  // Larger handles for fingers
  const isCoarsePointer = useMediaQuery('(pointer: coarse)');

  const trRef = useRef<Konva.Transformer>(null);
  // Map from furniture id to its Konva.Group node, for Transformer attachment
  const nodesRef = useRef<Map<string, Konva.Group>>(new Map());

  // Attach or detach the Transformer whenever selection changes
  useEffect(() => {
    if (!trRef.current) return;
    const node = selectedId ? nodesRef.current.get(selectedId) : undefined;
    trRef.current.nodes(node ? [node] : []);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId, furniture, interactive]);

  // Dragging an item of a multi-selection moves the others along (their nodes during
  // the drag, then all items in the store with the dragged item's snapped offset)
  const groupDragRef = useRef<{ id: string; ids: string[]; start: Map<string, Konva.Vector2d> } | null>(null);

  const handleDragStart = (id: string) => {
    const sel = useAppStore.getState().furnitureSelection;
    if (sel.length < 2 || !sel.includes(id)) { groupDragRef.current = null; return; }
    const start = new Map<string, Konva.Vector2d>();
    for (const sid of sel) {
      const node = nodesRef.current.get(sid);
      if (node) start.set(sid, node.position());
    }
    groupDragRef.current = { id, ids: sel, start };
  };

  type GroupDrag = NonNullable<typeof groupDragRef.current>;
  const moveOthers = (g: GroupDrag, id: string, dx: number, dy: number) => {
    for (const [sid, p] of g.start) {
      if (sid !== id) nodesRef.current.get(sid)?.position({ x: p.x + dx, y: p.y + dy });
    }
  };

  const handleDragMove = (id: string, node: Konva.Node) => {
    const g = groupDragRef.current;
    const p0 = g?.id === id ? g.start.get(id) : undefined;
    if (g && p0) moveOthers(g, id, node.x() - p0.x, node.y() - p0.y);
  };

  const handleMove = (item: FurnitureItem, xCm: number, yCm: number) => {
    const g = groupDragRef.current;
    groupDragRef.current = null;
    if (g?.id !== item.id) { updateFurniture(item.id, { xCm, yCm }); return; }
    // Put the other nodes at the final (snapped) offset: the store update may not
    // change their props (e.g. snapped back to the start), so React wouldn't reset them
    const ppc = getPixelsPerCm(scale);
    moveOthers(g, item.id, (xCm - item.xCm) * ppc, (yCm - item.yCm) * ppc);
    moveFurnitureBy(g.ids, xCm - item.xCm, yCm - item.yCm);
  };

  const handleRef = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  return (
    <Layer listening={interactive} opacity={interactive ? 1 : 0.35} name="furniture-layer">
      {furniture.map((item) => (
        <FurnitureShape
          key={item.id}
          item={item}
          scale={scale}
          snapGrid={snapGrid}
          stageScale={stageScale}
          isSelected={selection.includes(item.id)}
          draggable={!marquee}
          onSelect={(additive) => {
            if (consumeClick()) return;
            if (additive) { toggleFurnitureSelection(item.id); return; }
            selectFurniture(item.id);
            onFurnitureTap?.();
          }}
          onChange={(changes) => updateFurniture(item.id, changes)}
          onMove={(xCm, yCm) => handleMove(item, xCm, yCm)}
          onDragStart={() => handleDragStart(item.id)}
          onDragMove={(node) => handleDragMove(item.id, node)}
          onRef={handleRef}
        />
      ))}
      {/* Not rendered in measure mode: its anchors (fill + stroke) on the translucent
          layer would each be drawn through Konva's full-stage buffer canvas every frame */}
      {interactive && <Transformer
        ref={trRef}
        rotateEnabled={true}
        anchorSize={isCoarsePointer ? 20 : 10}
        rotateAnchorOffset={isCoarsePointer ? 40 : 50}
        keepRatio={false}
        rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
        rotationSnapTolerance={10}
        boundBoxFunc={(oldBox, newBox) => {
          // Prevent shrinking furniture below 10px
          if (newBox.width < 10 || newBox.height < 10) return oldBox;
          return newBox;
        }}
      />}
    </Layer>
  );
}
