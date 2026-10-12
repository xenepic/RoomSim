import type { CalibrationMode } from '../../App';
import { ImageUploader } from './ImageUploader';
import { BackgroundToggle } from './BackgroundToggle';
import { FurniturePresetList } from './FurniturePresetList';
import { ScaleCalibrator } from './ScaleCalibrator';
import { SnapGridToggle } from './SnapGridToggle';

interface ToolbarProps {
  calibrationMode: CalibrationMode;
  rulerPoints: Array<{ x: number; y: number }>;
  tatamiRect: { x: number; y: number; width: number; height: number } | null;
  onStartCalibration: (mode: 'ruler' | 'tatami') => void;
  onCancelCalibration: () => void;
  onScaleSet: () => void;
}

export function Toolbar({
  calibrationMode, rulerPoints, tatamiRect,
  onStartCalibration, onCancelCalibration, onScaleSet,
}: ToolbarProps) {
  return (
    <>
      <ImageUploader />
      <BackgroundToggle />
      <FurniturePresetList />
      <ScaleCalibrator
        calibrationMode={calibrationMode}
        rulerPoints={rulerPoints}
        tatamiRect={tatamiRect}
        onStartCalibration={onStartCalibration}
        onCancelCalibration={onCancelCalibration}
        onScaleSet={onScaleSet}
      />
      <SnapGridToggle />
    </>
  );
}
