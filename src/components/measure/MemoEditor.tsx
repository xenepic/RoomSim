import { useAppStore } from '../../store/useAppStore';
import type { MemoPin } from '../../types';

// One-tap tags so common notes need little typing on site
const QUICK_TAGS = ['コンセント', 'TV端子', 'LAN', 'エアコン', '窓', '梁・柱', 'ドア', '搬入注意'];

export function MemoEditor({ memo }: { memo: MemoPin }) {
  const updateMemo = useAppStore((s) => s.updateMemo);
  const deleteMemo = useAppStore((s) => s.deleteMemo);
  const selectMeasure = useAppStore((s) => s.selectMeasure);

  const setText = (text: string) => updateMemo(memo.id, { text }, { undoKey: `memo:${memo.id}` });

  return (
    <div className="measure-editor">
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
      <div>
        <label>メモ</label>
        <textarea
          rows={3} value={memo.text} placeholder="例: 床から 110cm に窓"
          autoFocus={memo.text === ''}
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
