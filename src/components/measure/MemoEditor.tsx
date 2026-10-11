import { useAppStore } from '../../store/useAppStore';
import { PIN_KINDS, getPinKind } from '../../data/pinKinds';
import { PinIcon } from './PinIcon';
import type { MemoPin } from '../../types';

// One-tap tags so common notes need little typing on site
// (outlets, TV, LAN and air conditioners have their own mark kinds)
const QUICK_TAGS = ['窓', '梁・柱', 'ドア', '搬入注意', '収納', '段差'];

export function MemoEditor({ memo }: { memo: MemoPin }) {
  const updateMemo = useAppStore((s) => s.updateMemo);
  const deleteMemo = useAppStore((s) => s.deleteMemo);
  const selectMeasure = useAppStore((s) => s.selectMeasure);
  const kind = getPinKind(memo.kind);
  const isMemo = kind.id === 'memo';

  const setText = (text: string) => updateMemo(memo.id, { text }, { undoKey: `memo:${memo.id}` });

  return (
    <div className="measure-editor">
      <div className="pin-kind-picker" role="radiogroup" aria-label="種類">
        {PIN_KINDS.map((k) => (
          <button
            key={k.id} role="radio" aria-checked={k.id === kind.id}
            className={k.id === kind.id ? 'pin-kind active' : 'pin-kind'}
            style={k.id === kind.id ? { borderColor: k.color, background: `${k.color}1A` } : undefined}
            onClick={() => updateMemo(memo.id, { kind: k.id })}
          >
            <PinIcon kind={k.id} />
            <span>{k.label}</span>
          </button>
        ))}
      </div>
      {isMemo && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag} className="chip"
              onClick={() => updateMemo(memo.id, { text: memo.text ? `${memo.text} ${tag}` : tag })}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <div>
        {/* Marks keep the note off the canvas; it is shown in the list and here */}
        <label>{isMemo ? 'メモ' : 'メモ（任意・図面には表示されません）'}</label>
        <textarea
          rows={isMemo ? 3 : 2} value={memo.text}
          placeholder={isMemo ? '例: 床から 110cm に窓' : '例: 2口、床から 25cm'}
          autoFocus={isMemo && memo.text === ''}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => selectMeasure(null)} style={{ flex: 1 }}>完了</button>
        <button onClick={() => deleteMemo(memo.id)} style={{ flex: 1, color: '#c0392b', borderColor: '#e74c3c' }}>
          削除
        </button>
      </div>
    </div>
  );
}
