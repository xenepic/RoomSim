import type { CalibrationMode } from '../../App';

interface ToolbarProps {
  calibrationMode: CalibrationMode;
  rulerPoints: Array<{ x: number; y: number }>;
  tatamiRect: { x: number; y: number; width: number; height: number } | null;
  onStartCalibration: (mode: 'ruler' | 'tatami') => void;
  onCancelCalibration: () => void;
  onScaleSet: () => void;
}

export function Toolbar(_props: ToolbarProps) {
  return <div style={{ padding: 12 }}>Toolbar (placeholder)</div>;
}
