import { useAppStore } from '../../store/useAppStore';
import { FurnitureEditor } from './FurnitureEditor';

export function PropertiesPanel() {
  const selectedItem = useAppStore((s) => s.project.furniture.find((f) => f.id === s.selectedId));

  return (
    <div>
      <div className="panel-section">
        <h3>プロパティ</h3>
      </div>
      {selectedItem ? (
        <FurnitureEditor item={selectedItem} />
      ) : (
        <div style={{ padding: 12, color: '#999', fontSize: 12 }}>
          家具を選択すると編集できます
        </div>
      )}
    </div>
  );
}
