import { useRef, useLayoutEffect } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { FurnitureItem, ScaleSetting } from '../../types';
import { getPixelsPerCm, snapToCm } from '../../utils/scaleUtils';

interface FurnitureShapeProps {
  item: FurnitureItem;
  scale: ScaleSetting | undefined;
  snapGrid: { enabled: boolean; sizeCm: number };
  isSelected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<FurnitureItem>) => void;
  // Register Konva node so FurnitureLayer can attach the shared Transformer
  onRef: (id: string, node: Konva.Group | null) => void;
}

export function FurnitureShape({
  item, scale, snapGrid, isSelected, onSelect, onChange, onRef,
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
    let newXCm = e.target.x() / ppc;
    let newYCm = e.target.y() / ppc;

    if (snapGrid.enabled) {
      newXCm = snapToCm(newXCm, snapGrid.sizeCm);
      newYCm = snapToCm(newYCm, snapGrid.sizeCm);
      // Update node position immediately to avoid visual jump on re-render
      e.target.x(newXCm * ppc);
      e.target.y(newYCm * ppc);
    }

    onChange({ xCm: newXCm, yCm: newYCm });
  };

  const handleTransformEnd = () => {
    const node = groupRef.current!;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset Konva's applied scale — correct dimensions come from Zustand re-render
    node.scaleX(1);
    node.scaleY(1);

    onChange({
      xCm: node.x() / ppc,
      yCm: node.y() / ppc,
      widthCm: Math.max(10, item.widthCm * Math.abs(scaleX)),
      depthCm: Math.max(10, item.depthCm * Math.abs(scaleY)),
      rotation: node.rotation(),
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
