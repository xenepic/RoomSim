import type { CalibrationMode } from '../../App';

interface CanvasAreaProps {
  calibrationMode: CalibrationMode;
  onRulerPoint: (point: { x: number; y: number }) => void;
  onTatamiRect: (rect: { x: number; y: number; width: number; height: number }) => void;
}

export function CanvasArea(_props: CanvasAreaProps) {
  return <div style={{ width: '100%', height: '100%', background: '#ddd' }}>Canvas</div>;
}
