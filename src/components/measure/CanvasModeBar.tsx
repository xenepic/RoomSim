import { useAppStore } from '../../store/useAppStore';

// Floating controls at the top-right of the canvas: mode switch + undo (measure/plan mode)
// allowPlan: plan mode is desktop-only for now
export function CanvasModeBar({ allowPlan }: { allowPlan: boolean }) {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const canUndo = useAppStore((s) => s.measureUndo.length > 0);
  const undoMeasure = useAppStore((s) => s.undoMeasure);
  const canUndoPlan = useAppStore((s) => s.planUndo.length > 0);
  const canRedoPlan = useAppStore((s) => s.planRedo.length > 0);
  const undoPlan = useAppStore((s) => s.undoPlan);
  const redoPlan = useAppStore((s) => s.redoPlan);

  return (
    <div className="canvas-mode-bar">
      {mode === 'measure' && (
        <button className="canvas-undo" onClick={undoMeasure} disabled={!canUndo} title="元に戻す (Ctrl+Z)">
          ↶ 戻す
        </button>
      )}
      {mode === 'plan' && (
        <>
          <button className="canvas-undo" onClick={undoPlan} disabled={!canUndoPlan} title="元に戻す (Ctrl+Z)">
            ↶ 戻す
          </button>
          <button className="canvas-undo" onClick={redoPlan} disabled={!canRedoPlan} title="やり直す (Ctrl+Shift+Z / Ctrl+Y)">
            ↷ やり直す
          </button>
        </>
      )}
      <div className="mode-toggle" role="group" aria-label="モード">
        <button className={mode === 'furniture' ? 'active' : undefined} onClick={() => setMode('furniture')}>
          配置
        </button>
        <button className={mode === 'measure' ? 'active' : undefined} onClick={() => setMode('measure')}>
          採寸
        </button>
        {allowPlan && (
          <button className={mode === 'plan' ? 'active' : undefined} onClick={() => setMode('plan')}>
            作図
          </button>
        )}
      </div>
    </div>
  );
}
