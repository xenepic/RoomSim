import { useState, useEffect } from 'react';
import './App.css';
import { useAppStore } from './store/useAppStore';
import { Toolbar } from './components/toolbar/Toolbar';
import { ProjectActions } from './components/toolbar/ProjectActions';
import { ProjectBar } from './components/toolbar/ProjectBar';
import { CanvasArea } from './components/canvas/CanvasArea';
import { PropertiesPanel } from './components/properties/PropertiesPanel';
import { ImageUploader } from './components/toolbar/ImageUploader';
import { BackgroundToggle } from './components/toolbar/BackgroundToggle';
import { FurniturePresetList } from './components/toolbar/FurniturePresetList';
import { ScaleCalibrator } from './components/toolbar/ScaleCalibrator';
import { SnapGridToggle } from './components/toolbar/SnapGridToggle';
import { MobileTabBar, FURNITURE_TABS, MEASURE_TABS, type MobileTab } from './components/mobile/MobileTabBar';
import { CanvasModeBar } from './components/measure/CanvasModeBar';
import { MeasureTools } from './components/measure/MeasureTools';
import { MeasureHint } from './components/measure/MeasureHint';
import { MeasureList } from './components/measure/MeasureList';
import { MeasureSelectionEditor } from './components/measure/MeasureSelectionEditor';
import { PlanTools } from './components/plan/PlanTools';
import { PlanSelectionEditor } from './components/plan/PlanSelectionEditor';
import { useMediaQuery } from './hooks/useMediaQuery';
import { initPersistence } from './store/persistence';

// CalibrationMode is exported so toolbar and canvas components can share the type.
export type CalibrationMode = 'ruler' | 'tatami' | null;

const NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

function handlePlanKey(e: KeyboardEvent) {
  const state = useAppStore.getState();
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  const sel = state.planSelection;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    state.deletePlanSelection();
  } else if (mod && key === 'z') {
    e.preventDefault();
    if (e.shiftKey) state.redoPlan(); else state.undoPlan();
  } else if (mod && key === 'y') {
    e.preventDefault();
    state.redoPlan();
  } else if (mod && key === 'c') {
    e.preventDefault();
    state.duplicatePlanSelection();
  } else if (mod && key === 'a') {
    e.preventDefault();
    const plan = state.project.plan;
    if (!plan) return;
    // Openings on rooms/walls move with them, so they don't need selecting
    state.setPlanSelection([
      ...plan.rooms.map((r) => ({ kind: 'room' as const, id: r.id })),
      ...plan.walls.map((w) => ({ kind: 'wall' as const, id: w.id })),
      ...plan.fixtures.map((f) => ({ kind: 'fixture' as const, id: f.id })),
    ]);
  } else if (e.key === 'Escape') {
    if (state.planTool !== 'select') state.setPlanTool('select');
    else state.selectPlan(null);
  } else if (NUDGE[e.key] && sel.length > 0) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const [dx, dy] = NUDGE[e.key];
    // Consecutive nudges of the same selection are one undo step
    state.movePlanSelection(dx * step, dy * step, { undoKey: `nudge:${sel.map((r) => r.id).join()}` });
  }
}

// Phones (portrait or landscape) get the full-screen canvas + bottom sheet layout
const MOBILE_QUERY = '(max-width: 767px), (max-height: 500px)';

function App() {
  const selectedId = useAppStore((s) => s.selectedId);
  const mode = useAppStore((s) => s.mode);
  const hasMeasureSelection = useAppStore((s) => s.measureSelection !== null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [activeTab, setActiveTab] = useState<MobileTab | null>(null);

  // Close the edit sheet once nothing is selected (deselect / delete)
  useEffect(() => {
    if (!selectedId) setActiveTab((tab) => (tab === 'edit' ? null : tab));
  }, [selectedId]);

  // Plan mode is desktop-only for now
  useEffect(() => {
    if (isMobile && mode === 'plan') useAppStore.getState().setMode('furniture');
  }, [isMobile, mode]);

  // Restore the last-opened project and start autosaving
  useEffect(() => { void initPersistence(); }, []);

  // Keyboard shortcuts — furniture mode: Delete = remove, Ctrl+C = duplicate;
  // measure mode: Delete = remove, Ctrl+Z = undo, Escape = cancel/deselect;
  // plan mode: also Ctrl+Shift+Z / Ctrl+Y = redo, Ctrl+A = select all, arrows = nudge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire when the user is typing in a form field
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const state = useAppStore.getState();
      if (state.mode === 'plan') {
        handlePlanKey(e);
        return;
      }
      if (state.mode === 'measure') {
        const sel = state.measureSelection;
        if ((e.key === 'Delete' || e.key === 'Backspace') && sel) {
          if (sel.kind === 'dimension') state.deleteDimension(sel.id);
          else state.deleteMemo(sel.id);
        }
        if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          state.undoMeasure();
        }
        if (e.key === 'Escape') {
          if (state.dimensionDraft) state.cancelDimensionDraft();
          else state.selectMeasure(null);
        }
        return;
      }

      const { selectedId, deleteFurniture, duplicateFurniture } = state;

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

  // Switching modes closes any open sheet and abandons an in-progress calibration
  useEffect(() => {
    setActiveTab(null);
    cancelCalibration();
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // In measure mode the tab picks the tool: ＋寸法 / ＋マーク place items, others select
  const handleTabChange = (tab: MobileTab | null) => {
    setActiveTab(tab);
    if (mode !== 'measure') return;
    const { setMeasureTool, selectMeasure } = useAppStore.getState();
    setMeasureTool(tab === 'addDimension' ? 'dimension' : tab === 'addMemo' ? 'memo' : 'select');
    selectMeasure(null);
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
    image: <><ImageUploader /><BackgroundToggle /></>,
    furniture: <FurniturePresetList />,
    scale: <><ScaleCalibrator {...calibratorProps} /><SnapGridToggle /></>,
    edit: <PropertiesPanel />,
    project: <><ProjectActions />{portalLink}</>,
    addDimension: <MeasureHint />,
    addMemo: <MeasureHint />,
    list: <MeasureList />,
  };

  // Measure mode: a selected dimension/memo always shows its editor (even with no tab open)
  const mobileSheet = mode === 'measure' && hasMeasureSelection
    ? <MeasureSelectionEditor />
    : activeTab ? mobileSheetContent[activeTab] : null;

  // Every child keeps a fixed slot (null when hidden) so the canvas is not
  // remounted — and zoom/pan are kept — when crossing the mobile breakpoint.
  return (
    <div className={isMobile ? 'app-layout is-mobile' : 'app-layout'}>
      {isMobile ? null : (
        <div className="left-panel">
          <div className="left-panel-scroll">
            {mode === 'measure'
              ? <><MeasureTools /><MeasureList /></>
              : mode === 'plan'
                ? <PlanTools />
                : <Toolbar {...calibratorProps} />}
          </div>
          <ProjectBar />
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
        <CanvasModeBar allowPlan={!isMobile} />
      </div>
      {isMobile ? null : (
        <div className="right-panel">
          {mode === 'measure' ? <MeasureSelectionEditor />
            : mode === 'plan' ? <PlanSelectionEditor />
              : <PropertiesPanel />}
        </div>
      )}
      {isMobile && mobileSheet ? (
        <div className="mobile-sheet">{mobileSheet}</div>
      ) : null}
      {isMobile ? (
        <MobileTabBar
          tabs={mode === 'measure' ? MEASURE_TABS : FURNITURE_TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      ) : null}
    </div>
  );
}

export default App;
