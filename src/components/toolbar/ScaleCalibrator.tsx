import type { CalibrationMode } from '../../App';

export interface ScaleCalibratorProps {
  calibrationMode: CalibrationMode;
  rulerPoints: Array<{ x: number; y: number }>;
  tatamiRect: { x: number; y: number; width: number; height: number } | null;
  onStartCalibration: (mode: 'ruler' | 'tatami') => void;
  onCancelCalibration: () => void;
  onScaleSet: () => void;
}

export function ScaleCalibrator(_props: ScaleCalibratorProps) {
  return (
    <div className="panel-section">
      <h3>縮尺設定</h3>
      <p style={{ fontSize: 11, color: '#999' }}>（Task 10 で実装）</p>
    </div>
  );
}
