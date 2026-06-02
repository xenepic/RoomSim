import { Layer } from 'react-konva';

interface FurnitureLayerProps {
  stageScale: number;
  stagePos: { x: number; y: number };
  canvasSize: { width: number; height: number };
}

export function FurnitureLayer(_props: FurnitureLayerProps) {
  return <Layer />;
}
