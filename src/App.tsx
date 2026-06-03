import { useState, useEffect } from 'react';
import './App.css';
import { useAppStore } from './store/useAppStore';
import { Toolbar } from './components/toolbar/Toolbar';
import { ProjectActions } from './components/toolbar/ProjectActions';
import { CanvasArea } from './components/canvas/CanvasArea';
import { PropertiesPanel } from './components/properties/PropertiesPanel';

// CalibrationMode is exported so toolbar and canvas components can share the type.
export type CalibrationMode = 'ruler' | 'tatami' | null;

function App() {
  const loadProject = useAppStore((s) => s.loadProject);

  // Restore saved project on first load
  useEffect(() => { loadProject(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: Delete = remove selected, Ctrl+C = duplicate selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire when the user is typing in a form field
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const { selectedId, project, deleteFurniture, addFurniture } = useAppStore.getState();

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) deleteFurniture(selectedId);
      }

      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        const item = project.furniture.find((f) => f.id === selectedId);
        if (!item) return;
        e.preventDefault();
        addFurniture({
          name: item.name,
          xCm: item.xCm + 10,
          yCm: item.yCm + 10,
          widthCm: item.widthCm,
          depthCm: item.depthCm,
          rotation: item.rotation,
          color: item.color,
          presetId: item.presetId,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <div className="left-panel-scroll">
          <Toolbar
            calibrationMode={calibrationMode}
            rulerPoints={rulerPoints}
            tatamiRect={tatamiRect}
            onStartCalibration={startCalibration}
            onCancelCalibration={cancelCalibration}
            onScaleSet={handleScaleSet}
          />
        </div>
        <ProjectActions />
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
