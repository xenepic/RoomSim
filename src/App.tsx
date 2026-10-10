import { useState, useEffect } from 'react';
import './App.css';
import { useAppStore } from './store/useAppStore';
import { Toolbar } from './components/toolbar/Toolbar';
import { ProjectActions } from './components/toolbar/ProjectActions';
import { CanvasArea } from './components/canvas/CanvasArea';
import { PropertiesPanel } from './components/properties/PropertiesPanel';
import { ImageUploader } from './components/toolbar/ImageUploader';
import { FurniturePresetList } from './components/toolbar/FurniturePresetList';
import { ScaleCalibrator } from './components/toolbar/ScaleCalibrator';
import { SnapGridToggle } from './components/toolbar/SnapGridToggle';
import { MobileTabBar, type MobileTab } from './components/mobile/MobileTabBar';
import { useMediaQuery } from './hooks/useMediaQuery';

// CalibrationMode is exported so toolbar and canvas components can share the type.
export type CalibrationMode = 'ruler' | 'tatami' | null;

// Phones (portrait or landscape) get the full-screen canvas + bottom sheet layout
const MOBILE_QUERY = '(max-width: 767px), (max-height: 500px)';

function App() {
  const loadProject = useAppStore((s) => s.loadProject);
  const selectedId = useAppStore((s) => s.selectedId);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [activeTab, setActiveTab] = useState<MobileTab | null>(null);

  // Close the edit sheet once nothing is selected (deselect / delete)
  useEffect(() => {
    if (!selectedId) setActiveTab((tab) => (tab === 'edit' ? null : tab));
  }, [selectedId]);

  // Restore saved project on first load
  useEffect(() => { loadProject(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: Delete = remove selected, Ctrl+C = duplicate selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire when the user is typing in a form field
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const { selectedId, deleteFurniture, duplicateFurniture } = useAppStore.getState();

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) deleteFurniture(selectedId);
      }

      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        if (!selectedId) return;
        e.preventDefault();
        duplicateFurniture(selectedId);
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

  const calibratorProps = {
    calibrationMode,
    rulerPoints,
    tatamiRect,
    onStartCalibration: startCalibration,
    onCancelCalibration: cancelCalibration,
    onScaleSet: handleScaleSet,
  };

  const portalLink = (
    <a
      className="portal-link"
      href="https://shiodamari.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
    >
      ひとでの潮だまり
    </a>
  );

  const mobileSheetContent: Record<MobileTab, React.ReactNode> = {
    image: <ImageUploader />,
    furniture: <FurniturePresetList />,
    scale: <><ScaleCalibrator {...calibratorProps} /><SnapGridToggle /></>,
    edit: <PropertiesPanel />,
    project: <><ProjectActions />{portalLink}</>,
  };

  // Every child keeps a fixed slot (null when hidden) so the canvas is not
  // remounted — and zoom/pan are kept — when crossing the mobile breakpoint.
  return (
    <div className={isMobile ? 'app-layout is-mobile' : 'app-layout'}>
      {isMobile ? null : (
        <div className="left-panel">
          <div className="left-panel-scroll">
            <Toolbar {...calibratorProps} />
          </div>
          <ProjectActions />
          {portalLink}
        </div>
      )}
      <div className="canvas-container">
        <CanvasArea
          calibrationMode={calibrationMode}
          onRulerPoint={handleRulerPoint}
          onTatamiRect={handleTatamiRect}
          onFurnitureTap={isMobile ? () => setActiveTab('edit') : undefined}
        />
      </div>
      {isMobile ? null : (
        <div className="right-panel">
          <PropertiesPanel />
        </div>
      )}
      {isMobile && activeTab ? (
        <div className="mobile-sheet">{mobileSheetContent[activeTab]}</div>
      ) : null}
      {isMobile ? <MobileTabBar activeTab={activeTab} onChange={setActiveTab} /> : null}
    </div>
  );
}

export default App;
