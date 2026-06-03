import { useRef, useLayoutEffect } from 'react';

const SNAP_THRESHOLD_PX = 20;
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { FurnitureItem, ScaleSetting } from '../../types';
import { getPixelsPerCm, snapToCm } from '../../utils/scaleUtils';

interface FurnitureShapeProps {
  item: FurnitureItem;
  scale: ScaleSetting | undefined;
  snapGrid: { enabled: boolean; sizeCm: number };
  stageScale: number;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<FurnitureItem>) => void;
  // Register Konva node so FurnitureLayer can attach the shared Transformer
  onRef: (id: string, node: Konva.Group | null) => void;
}

export function FurnitureShape({
  item, scale, snapGrid, stageScale, isSelected, onSelect, onChange, onRef,
}: FurnitureShapeProps) {
  const ppc = getPixelsPerCm(scale);
  const widthPx = item.widthCm * ppc;
  const heightPx = item.depthCm * ppc;
  const groupRef = useRef<Konva.Group>(null);

  // xCm/yCm are the CENTER of the furniture; Group is positioned at center
  // and offsetX/offsetY pull the visual back so it renders centered.
  const xPx = item.xCm * ppc;
  const yPx = item.yCm * ppc;

  useLayoutEffect(() => {
    onRef(item.id, groupRef.current);
    return () => onRef(item.id, null);
  }, [item.id, onRef]);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const rawXCm = e.target.x() / ppc;
    const rawYCm = e.target.y() / ppc;

    if (snapGrid.enabled) {
      const halfW = item.widthCm / 2;
      const halfD = item.depthCm / 2;
      const sz    = snapGrid.sizeCm;
      const thresholdCm = SNAP_THRESHOLD_PX / (ppc * stageScale);

      // Snap the nearest edge (left vs right, top vs bottom) only when within threshold
      const snapNearest = (center: number, half: number) => {
        const s1 = snapToCm(center - half, sz);
        const s2 = snapToCm(center + half, sz);
        const d1 = Math.abs(center - half - s1);
        const d2 = Math.abs(center + half - s2);
        if (d1 <= d2 && d1 <= thresholdCm) return s1 + half;
        if (d2 <  d1 && d2 <= thresholdCm) return s2 - half;
        return center;
      };

      const newXCm = snapNearest(rawXCm, halfW);
      const newYCm = snapNearest(rawYCm, halfD);
      e.target.x(newXCm * ppc);
      e.target.y(newYCm * ppc);
      onChange({ xCm: newXCm, yCm: newYCm });
    } else {
      onChange({ xCm: rawXCm, yCm: rawYCm });
    }
  };

  const handleTransformEnd = () => {
    const node = groupRef.current!;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset Konva's applied scale — correct dimensions come from Zustand re-render
    node.scaleX(1);
    node.scaleY(1);

    // Round to 2 decimal places to absorb floating-point drift from Konva's matrix math
    onChange({
      xCm: Math.round(node.x() / ppc * 100) / 100,
      yCm: Math.round(node.y() / ppc * 100) / 100,
      widthCm: Math.max(10, Math.round(item.widthCm * Math.abs(scaleX) * 100) / 100),
      depthCm: Math.max(10, Math.round(item.depthCm * Math.abs(scaleY) * 100) / 100),
      rotation: Math.round(node.rotation() * 100) / 100,
    });
  };

  const fontSize = Math.max(10, Math.min(14, widthPx / 8));

  return (
    <Group
      ref={groupRef}
      x={xPx}
      y={yPx}
      offsetX={widthPx / 2}   // rotate/scale around the center of the furniture
      offsetY={heightPx / 2}
      rotation={item.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      <Rect
        width={widthPx}
        height={heightPx}
        fill={item.color}
        stroke={isSelected ? '#2563EB' : '#666'}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={3}
        opacity={0.85}
        shadowColor="rgba(0,0,0,0.15)"
        shadowBlur={isSelected ? 6 : 0}
        shadowEnabled={isSelected}
      />
      <Text
        width={widthPx}
        height={heightPx}
        text={`${item.name}\n${item.widthCm}×${item.depthCm}cm`}
        align="center"
        verticalAlign="middle"
        fontSize={fontSize}
        fill="#222"
        listening={false}
      />
    </Group>
  );
}
