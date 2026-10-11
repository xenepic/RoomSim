import { useAppStore } from '../../store/useAppStore';

// Short instruction for the active tool + draft cancel + axis-snap toggle
export function MeasureHint() {
  const tool = useAppStore((s) => s.measureTool);
  const draft = useAppStore((s) => s.dimensionDraft);
  const axisSnap = useAppStore((s) => s.axisSnap);
  const setAxisSnap = useAppStore((s) => s.setAxisSnap);
  const cancelDimensionDraft = useAppStore((s) => s.cancelDimensionDraft);
  const hasFloorplan = useAppStore((s) => !!s.project.floorplan);

  const text =
    tool === 'dimension' ? (draft ? '終点をタップ' : '始点をタップ（ドラッグで図面を移動）')
    : tool === 'memo' ? 'メモを置く位置をタップ'
    : '寸法線・メモをタップして編集';

  return (
    <div className="panel-section">
      {!hasFloorplan && (
        <p style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>先に「配置」モードで間取り画像をアップロードしてください</p>
      )}
      <div className="measure-hint">{text}</div>
      {tool === 'dimension' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <input
            type="checkbox" id="axis-snap" checked={axisSnap}
            onChange={(e) => setAxisSnap(e.target.checked)}
          />
          <label htmlFor="axis-snap" style={{ margin: 0, flex: 1 }}>水平・垂直に揃える</label>
          {draft && <button onClick={cancelDimensionDraft}>やり直す</button>}
        </div>
      )}
    </div>
  );
}
