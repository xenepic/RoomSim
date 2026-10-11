import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getPixelsPerCm } from '../../utils/scaleUtils';
import { parseCm } from '../../utils/measureUtils';
import type { Dimension } from '../../types';

export function DimensionEditor({ dim }: { dim: Dimension }) {
  const updateDimension = useAppStore((s) => s.updateDimension);
  const deleteDimension = useAppStore((s) => s.deleteDimension);
  const selectMeasure = useAppStore((s) => s.selectMeasure);
  const scale = useAppStore((s) => s.project.scale);
  const [valueText, setValueText] = useState(dim.valueCm?.toString() ?? '');

  // Follow external changes (undo) without clobbering what is being typed
  useEffect(() => {
    if (parseCm(valueText) !== dim.valueCm) setValueText(dim.valueCm?.toString() ?? '');
  }, [dim.valueCm]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = () => selectMeasure(null);
  const lengthPx = Math.hypot(dim.b.x - dim.a.x, dim.b.y - dim.a.y);

  return (
    <div className="measure-editor">
      <div>
        <label>実測値 (cm)</label>
        <input
          className="measure-value-input"
          type="text" inputMode="decimal" enterKeyHint="done" placeholder="例: 350"
          value={valueText}
          // Unmeasured lines open straight into number entry
          autoFocus={dim.valueCm === null}
          onChange={(e) => {
            setValueText(e.target.value);
            updateDimension(dim.id, { valueCm: parseCm(e.target.value) }, { undoKey: `value:${dim.id}` });
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') done(); }}
        />
      </div>
      <div>
        <label>メモ（任意）</label>
        <input
          value={dim.note ?? ''} placeholder="例: 窓下、巾木含む" enterKeyHint="done"
          onChange={(e) => updateDimension(dim.id, { note: e.target.value || undefined }, { undoKey: `note:${dim.id}` })}
          onKeyDown={(e) => { if (e.key === 'Enter') done(); }}
        />
      </div>
      {/* Reference only — the measured value is never derived from the drawing */}
      <div style={{ fontSize: 11, color: '#aaa' }}>
        図面上の長さ: {scale ? `約 ${Math.round(lengthPx / getPixelsPerCm(scale))}cm（縮尺換算）` : `${Math.round(lengthPx)}px（縮尺未設定）`}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={done} style={{ flex: 1 }}>完了</button>
        <button onClick={() => deleteDimension(dim.id)} style={{ flex: 1, color: '#c0392b', borderColor: '#e74c3c' }}>
          削除
        </button>
      </div>
    </div>
  );
}
