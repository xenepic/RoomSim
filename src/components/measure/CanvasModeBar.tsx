import { useAppStore } from '../../store/useAppStore';

// Floating controls at the top-right of the canvas: mode switch + undo (measure mode)
export function CanvasModeBar() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const canUndo = useAppStore((s) => s.measureUndo.length > 0);
  const undoMeasure = useAppStore((s) => s.undoMeasure);

  return (
    <div className="canvas-mode-bar">
      {mode === 'measure' && (
        <button className="canvas-undo" onClick={undoMeasure} disabled={!canUndo} title="元に戻す (Ctrl+Z)">
          ↶ 戻す
        </button>
      )}
      <div className="mode-toggle" role="group" aria-label="モード">
        <button className={mode === 'furniture' ? 'active' : undefined} onClick={() => setMode('furniture')}>
          配置
        </button>
        <button className={mode === 'measure' ? 'active' : undefined} onClick={() => setMode('measure')}>
          採寸
        </button>
      </div>
    </div>
  );
}
