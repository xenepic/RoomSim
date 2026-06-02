import { useState, useEffect } from 'react';
import './App.css';
import { useAppStore } from './store/useAppStore';
import { Toolbar } from './components/toolbar/Toolbar';
import { CanvasArea } from './components/canvas/CanvasArea';
import { PropertiesPanel } from './components/properties/PropertiesPanel';

// CalibrationMode is exported so toolbar and canvas components can share the type.
export type CalibrationMode = 'ruler' | 'tatami' | null;

function App() {
  const loadProject = useAppStore((s) => s.loadProject);

  // Restore saved project on first load
  useEffect(() => { loadProject(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calibration state is lifted here because ScaleCalibrator (left panel)
  // and RulerOverlay (canvas) both need to read and update it.
  const [calibrationMode, setCalibrationMode] = useState<CalibrationMode>(null);
  const [rulerPoints, setRulerPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [tatamiRect, setTatamiRect] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);

  const startCalibration = (mode: 'ruler' | 'tatami') => {
    setCalibrationMode(mode);
    setRulerPoints([]);
    setTatamiRect(null);
  };

  const cancelCalibration = () => {
    setCalibrationMode(null);
    setRulerPoints([]);
    setTatamiRect(null);
  };

  const handleRulerPoint = (point: { x: number; y: number }) => {
    setRulerPoints((prev) => [...prev, point].slice(0, 2));
  };

  const handleTatamiRect = (rect: { x: number; y: number; width: number; height: number }) => {
    setTatamiRect(rect);
  };

  const handleScaleSet = () => {
    setCalibrationMode(null);
    setRulerPoints([]);
    setTatamiRect(null);
  };

  return (
    <div className="app-layout">
      <div className="left-panel">
        <Toolbar
          calibrationMode={calibrationMode}
          rulerPoints={rulerPoints}
          tatamiRect={tatamiRect}
          onStartCalibration={startCalibration}
          onCancelCalibration={cancelCalibration}
          onScaleSet={handleScaleSet}
        />
      </div>
      <div className="canvas-container">
        <CanvasArea
          calibrationMode={calibrationMode}
          onRulerPoint={handleRulerPoint}
          onTatamiRect={handleTatamiRect}
        />
      </div>
      <div className="right-panel">
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default App;
