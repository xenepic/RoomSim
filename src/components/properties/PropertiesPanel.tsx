import { useAppStore } from '../../store/useAppStore';
import { FurnitureEditor } from './FurnitureEditor';

export function PropertiesPanel() {
  const selectedItem = useAppStore((s) => s.project.furniture.find((f) => f.id === s.selectedId));
  const count = useAppStore((s) => s.furnitureSelection.length);
  const deleteSelectedFurniture = useAppStore((s) => s.deleteSelectedFurniture);
  const duplicateSelectedFurniture = useAppStore((s) => s.duplicateSelectedFurniture);

  return (
    <div>
      <div className="panel-section">
        <h3>プロパティ</h3>
      </div>
      {selectedItem ? (
        <FurnitureEditor item={selectedItem} />
      ) : count > 1 ? (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{count}個の家具を選択中</div>
          <p className="plan-note" style={{ margin: 0 }}>ドラッグでまとめて移動できます。Shift+クリックで選択の追加・解除。</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={duplicateSelectedFurniture} style={{ flex: 1 }} title="Ctrl+C">複製</button>
            <button onClick={deleteSelectedFurniture} style={{ flex: 1, color: '#c0392b', borderColor: '#e74c3c' }} title="Delete">
              削除
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: 12, color: '#999', fontSize: 12 }}>
          家具を選択すると編集できます。Shift+クリック、または Shift+ドラッグで囲んで複数選択できます。
        </div>
      )}
    </div>
  );
}
