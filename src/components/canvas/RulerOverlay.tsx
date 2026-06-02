import { Layer } from 'react-konva';
import type { CalibrationMode } from '../../App';

interface RulerOverlayProps {
  mode: Exclude<CalibrationMode, null>;
  onRulerPoint: (point: { x: number; y: number }) => void;
  onTatamiRect: (rect: { x: number; y: number; width: number; height: number }) => void;
}

export function RulerOverlay(_props: RulerOverlayProps) {
  return <Layer />;
}
