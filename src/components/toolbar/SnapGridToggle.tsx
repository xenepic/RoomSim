import { useAppStore } from '../../store/useAppStore';

export function SnapGridToggle() {
  const snapGrid = useAppStore((s) => s.project.snapGrid);
  const setSnapGrid = useAppStore((s) => s.setSnapGrid);

  return (
    <div className="panel-section">
      <h3>スナップ</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <input
          type="checkbox"
          id="snap-toggle"
          checked={snapGrid.enabled}
          onChange={(e) => setSnapGrid(e.target.checked, snapGrid.sizeCm)}
        />
        <label htmlFor="snap-toggle" style={{ margin: 0 }}>
          グリッドスナップ {snapGrid.enabled ? 'ON' : 'OFF'}
        </label>
      </div>
      {snapGrid.enabled && (
        <div>
          <label>グリッドサイズ (cm)</label>
          <input
            type="number"
            value={snapGrid.sizeCm}
            min="1"
            max="100"
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v > 0) setSnapGrid(snapGrid.enabled, v);
            }}
          />
        </div>
      )}
    </div>
  );
}
