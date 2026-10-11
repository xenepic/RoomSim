import { useAppStore } from '../../store/useAppStore';
import { PIN_KINDS, getPinKind } from '../../data/pinKinds';
import { PinIcon } from './PinIcon';

// Short instruction for the active tool + draft cancel + axis-snap toggle,
// and the mark kind picker (pick a kind first, then tap to place)
export function MeasureHint() {
  const tool = useAppStore((s) => s.measureTool);
  const draft = useAppStore((s) => s.dimensionDraft);
  const axisSnap = useAppStore((s) => s.axisSnap);
  const setAxisSnap = useAppStore((s) => s.setAxisSnap);
  const cancelDimensionDraft = useAppStore((s) => s.cancelDimensionDraft);
  const hasFloorplan = useAppStore((s) => !!s.project.floorplan);
  const pinKind = useAppStore((s) => s.pinKind);
  const setPinKind = useAppStore((s) => s.setPinKind);

  const text =
    tool === 'dimension' ? (draft ? '終点をタップ' : '始点をタップ（ドラッグで図面を移動）')
    : tool === 'memo'
      ? (pinKind === 'memo' ? 'メモを置く位置をタップ' : `${getPinKind(pinKind).label}の位置をタップ（続けて置けます）`)
      : '寸法線・マークをタップして編集';

  return (
    <div className="panel-section">
      {!hasFloorplan && (
        <p style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>先に「配置」モードで間取り画像をアップロードしてください</p>
      )}
      {tool === 'memo' && (
        <div className="pin-kind-picker" role="radiogroup" aria-label="マークの種類">
          {PIN_KINDS.map((k) => (
            <button
              key={k.id} role="radio" aria-checked={k.id === pinKind}
              className={k.id === pinKind ? 'pin-kind active' : 'pin-kind'}
              style={k.id === pinKind ? { borderColor: k.color, background: `${k.color}1A` } : undefined}
              onClick={() => setPinKind(k.id)}
            >
              <PinIcon kind={k.id} />
              <span>{k.label}</span>
            </button>
          ))}
        </div>
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
