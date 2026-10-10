import { useAppStore } from '../../store/useAppStore';
import type { FurnitureItem } from '../../types';

interface FurnitureEditorProps {
  item: FurnitureItem;
}

export function FurnitureEditor({ item }: FurnitureEditorProps) {
  const updateFurniture = useAppStore((s) => s.updateFurniture);
  const deleteFurniture = useAppStore((s) => s.deleteFurniture);
  const selectFurniture = useAppStore((s) => s.selectFurniture);
  const duplicateFurniture = useAppStore((s) => s.duplicateFurniture);

  const update = (changes: Partial<FurnitureItem>) => updateFurniture(item.id, changes);

  const handleDelete = () => {
    deleteFurniture(item.id);
    selectFurniture(null);
  };

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label>名前</label>
        <input value={item.name} onChange={(e) => update({ name: e.target.value })} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label>幅 (cm)</label>
          <input
            type="number" value={item.widthCm} min="1"
            onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0) update({ widthCm: v }); }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>奥行 (cm)</label>
          <input
            type="number" value={item.depthCm} min="1"
            onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0) update({ depthCm: v }); }}
          />
        </div>
      </div>

      <div>
        <label>回転 (°)</label>
        <input
          type="number" value={Math.round(item.rotation)}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) update({ rotation: v % 360 }); }}
        />
      </div>

      <div>
        <label>色</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="color" value={item.color}
            onChange={(e) => update({ color: e.target.value })}
            style={{ width: 40, height: 28, padding: 1, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: '#888' }}>{item.color}</span>
        </div>
      </div>

      {/* Position info for reference (read-only) */}
      <div style={{ fontSize: 11, color: '#aaa', borderTop: '1px solid #eee', paddingTop: 8 }}>
        中心位置: ({Math.round(item.xCm)}, {Math.round(item.yCm)}) cm
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => duplicateFurniture(item.id)} style={{ flex: 1 }} title="Ctrl+C">
          複製
        </button>
        <button onClick={handleDelete} style={{ flex: 1, color: '#c0392b', borderColor: '#e74c3c' }} title="Delete">
          削除
        </button>
      </div>
    </div>
  );
}
