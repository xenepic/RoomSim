import { useAppStore } from '../../store/useAppStore';
import { DimensionEditor } from './DimensionEditor';
import { MemoEditor } from './MemoEditor';

export function MeasureSelectionEditor() {
  const selection = useAppStore((s) => s.measureSelection);
  const dim = useAppStore((s) =>
    s.measureSelection?.kind === 'dimension' ? s.project.dimensions.find((d) => d.id === s.measureSelection!.id) : undefined);
  const memo = useAppStore((s) =>
    s.measureSelection?.kind === 'memo' ? s.project.memos.find((m) => m.id === s.measureSelection!.id) : undefined);

  return (
    <div>
      <div className="panel-section">
        <h3>{selection?.kind === 'memo' ? 'メモ' : '寸法線'}</h3>
      </div>
      {/* key: remount per item so local input state never leaks between items */}
      {dim ? <DimensionEditor key={dim.id} dim={dim} />
        : memo ? <MemoEditor key={memo.id} memo={memo} />
        : <div style={{ padding: 12, color: '#999', fontSize: 12 }}>寸法線またはメモを選択すると編集できます</div>}
    </div>
  );
}
