import { useRef, useEffect, useCallback } from 'react';
import { Layer, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useAppStore } from '../../store/useAppStore';
import { FurnitureShape } from './FurnitureShape';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface FurnitureLayerProps {
  stageScale: number;
  stagePos: { x: number; y: number };
  canvasSize: { width: number; height: number };
  onFurnitureTap?: () => void;
}

export function FurnitureLayer({ stageScale, onFurnitureTap }: FurnitureLayerProps) {
  const furniture = useAppStore((s) => s.project.furniture);
  const scale = useAppStore((s) => s.project.scale);
  const snapGrid = useAppStore((s) => s.project.snapGrid);
  const selectedId = useAppStore((s) => s.selectedId);
  const selectFurniture = useAppStore((s) => s.selectFurniture);
  const updateFurniture = useAppStore((s) => s.updateFurniture);

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
  }, [selectedId, furniture]);

  const handleRef = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  return (
    <Layer>
      {furniture.map((item) => (
        <FurnitureShape
          key={item.id}
          item={item}
          scale={scale}
          snapGrid={snapGrid}
          stageScale={stageScale}
          isSelected={item.id === selectedId}
          onSelect={() => { selectFurniture(item.id); onFurnitureTap?.(); }}
          onChange={(changes) => updateFurniture(item.id, changes)}
          onRef={handleRef}
        />
      ))}
      <Transformer
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
      />
    </Layer>
  );
}
