import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FURNITURE_PRESETS, PRESET_CATEGORIES } from '../../data/furniturePresets';
import type { FurniturePreset } from '../../types';

// Default center position in cm when no viewport information is available
const DEFAULT_PLACE_CM = 50;

export function FurniturePresetList() {
  const addFurniture = useAppStore((s) => s.addFurniture);
  const [customName, setCustomName] = useState('');
  const [customW, setCustomW] = useState('100');
  const [customD, setCustomD] = useState('80');

  const handleAddPreset = (preset: FurniturePreset) => {
    addFurniture({
      name: preset.name,
      xCm: DEFAULT_PLACE_CM,
      yCm: DEFAULT_PLACE_CM,
      widthCm: preset.widthCm,
      depthCm: preset.depthCm,
      rotation: 0,
      color: preset.color,
      presetId: preset.id,
    });
  };

  const handleAddCustom = () => {
    const w = parseFloat(customW);
    const d = parseFloat(customD);
    if (!customName.trim() || isNaN(w) || w <= 0 || isNaN(d) || d <= 0) return;
    addFurniture({
      name: customName.trim(),
      xCm: DEFAULT_PLACE_CM,
      yCm: DEFAULT_PLACE_CM,
      widthCm: w,
      depthCm: d,
      rotation: 0,
      color: '#E8DAEF',
    });
    setCustomName('');
  };

  return (
    <div className="panel-section">
      <h3>家具を追加</h3>

      {PRESET_CATEGORIES.map((category) => (
        <div key={category} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{category}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {FURNITURE_PRESETS.filter((p) => p.category === category).map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleAddPreset(preset)}
                style={{ fontSize: 11, padding: '3px 6px', background: preset.color, borderColor: '#bbb' }}
                title={`${preset.widthCm}×${preset.depthCm}cm`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8 }}>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>カスタム</div>
        <div style={{ marginBottom: 4 }}>
          <label>名前</label>
          <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="例: 本棚" />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <label>幅 (cm)</label>
            <input type="number" value={customW} min="1" onChange={(e) => setCustomW(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>奥行 (cm)</label>
            <input type="number" value={customD} min="1" onChange={(e) => setCustomD(e.target.value)} />
          </div>
        </div>
        <button onClick={handleAddCustom} disabled={!customName.trim()} style={{ width: '100%' }}>
          ＋ 追加
        </button>
      </div>
    </div>
  );
}
