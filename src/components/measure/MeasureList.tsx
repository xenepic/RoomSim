import { useAppStore } from '../../store/useAppStore';
import { formatCm } from '../../utils/measureUtils';
import { getPinKind } from '../../data/pinKinds';
import { PinIcon } from './PinIcon';
import type { ImagePoint } from '../../types';

export function MeasureList() {
  const dimensions = useAppStore((s) => s.project.dimensions);
  const memos = useAppStore((s) => s.project.memos);
  const selection = useAppStore((s) => s.measureSelection);
  const selectMeasure = useAppStore((s) => s.selectMeasure);
  const requestViewFocus = useAppStore((s) => s.requestViewFocus);

  const focus = (kind: 'dimension' | 'memo', id: string, point: ImagePoint) => {
    selectMeasure({ kind, id });
    requestViewFocus(point);
  };

  // Memo numbers match the canvas (memos only; icon marks are not numbered)
  let memoCount = 0;
  const pins = memos.map((m) => {
    const def = getPinKind(m.kind);
    return { m, def, number: def.id === 'memo' ? ++memoCount : undefined };
  });

  // Unmeasured lines first: on site, these are the ones still to do
  const sorted = [...dimensions].sort((x, y) => Number(x.valueCm !== null) - Number(y.valueCm !== null));

  return (
    <>
      <div className="panel-section">
        <h3>寸法線（{dimensions.length}）</h3>
        {dimensions.length === 0 && <p className="measure-empty">まだありません</p>}
        {sorted.map((d) => (
          <button
            key={d.id}
            className={`measure-row${selection?.id === d.id ? ' selected' : ''}`}
            onClick={() => focus('dimension', d.id, { x: (d.a.x + d.b.x) / 2, y: (d.a.y + d.b.y) / 2 })}
          >
            <span className={d.valueCm === null ? 'measure-row-value unmeasured' : 'measure-row-value'}>
              {formatCm(d.valueCm)}
            </span>
            <span className="measure-row-note">{d.note ?? ''}</span>
          </button>
        ))}
      </div>
      <div className="panel-section">
        <h3>マーク・メモ（{memos.length}）</h3>
        {memos.length === 0 && <p className="measure-empty">まだありません</p>}
        {pins.map(({ m, def, number }) => (
          <button
            key={m.id}
            className={`measure-row${selection?.id === m.id ? ' selected' : ''}`}
            onClick={() => focus('memo', m.id, m.pos)}
          >
            <PinIcon kind={m.kind} number={number} />
            <span className="measure-row-note">
              {def.id === 'memo' ? (m.text || '（未入力）') : m.text ? `${def.label}：${m.text}` : def.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
