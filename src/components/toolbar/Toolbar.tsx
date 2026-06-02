import type { CalibrationMode } from '../../App';
import { ImageUploader } from './ImageUploader';

interface ToolbarProps {
  calibrationMode: CalibrationMode;
  rulerPoints: Array<{ x: number; y: number }>;
  tatamiRect: { x: number; y: number; width: number; height: number } | null;
  onStartCalibration: (mode: 'ruler' | 'tatami') => void;
  onCancelCalibration: () => void;
  onScaleSet: () => void;
}

export function Toolbar(_props: ToolbarProps) {
  return (
    <>
      <ImageUploader />
      {/* Further sections added in subsequent tasks */}
    </>
  );
}
