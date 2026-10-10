import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FURNITURE_PRESETS, PRESET_CATEGORIES } from '../../data/furniturePresets';
import type { FurniturePreset } from '../../types';

// Default center position in cm when no viewport information is available
const DEFAULT_PLACE_CM = 50;

export function FurniturePresetList() {
  const addFurniture = useAppStore((s) => s.addFurniture);
  const hasFloorplan = useAppStore((s) => !!s.project.floorplan);
  const hasScale = useAppStore((s) => !!s.project.scale);
  const projectId = useAppStore((s) => s.project.id);
  const viewCenterCm = useAppStore((s) => s.viewCenterCm);
  const [customName, setCustomName] = useState('');
  const [customW, setCustomW] = useState('100');
  const [customD, setCustomD] = useState('80');
  // Counter used as key — increment each trigger to force re-mount and restart animation
  const [toastRev, setToastRev] = useState(0);

  useEffect(() => {
    setCustomName('');
    setCustomW('100');
    setCustomD('80');
  }, [projectId]);

  // New furniture appears at the center of the visible canvas
  const placeX = viewCenterCm ? Math.round(viewCenterCm.x) : DEFAULT_PLACE_CM;
  const placeY = viewCenterCm ? Math.round(viewCenterCm.y) : DEFAULT_PLACE_CM;

  const warnIfNoScale = () => {
    if (!hasScale) setToastRev((r) => r + 1);
  };

  const handleAddPreset = (preset: FurniturePreset) => {
    addFurniture({
      name: preset.name,
      xCm: placeX,
      yCm: placeY,
      widthCm: preset.widthCm,
      depthCm: preset.depthCm,
      rotation: 0,
      color: preset.color,
      presetId: preset.id,
    });
    warnIfNoScale();
  };

  const handleAddCustom = () => {
    const w = parseFloat(customW);
    const d = parseFloat(customD);
    if (!customName.trim() || isNaN(w) || w <= 0 || isNaN(d) || d <= 0) return;
    addFurniture({
      name: customName.trim(),
      xCm: placeX,
      yCm: placeY,
      widthCm: w,
      depthCm: d,
      rotation: 0,
      color: '#E8DAEF',
    });
    setCustomName('');
    warnIfNoScale();
  };

  return (
    <>
    {toastRev > 0 && (
      <div
        key={toastRev}
        className="toast"
        style={{ background: 'rgba(180,100,0,0.88)' }}
        onAnimationEnd={() => setToastRev(0)}
      >
        縮尺未設定のため、見取り図と家具のサイズ比が合わない場合があります
      </div>
    )}
    <div className="panel-section">
      <h3>家具を追加</h3>

      {!hasFloorplan && (
        <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 8px' }}>
          先に間取り画像をアップロードしてください
        </p>
      )}

      {PRESET_CATEGORIES.map((category) => (
        <div key={category} style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 3 }}>{category}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {FURNITURE_PRESETS.filter((p) => p.category === category).map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleAddPreset(preset)}
                disabled={!hasFloorplan}
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
          <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="例: 本棚" disabled={!hasFloorplan} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <label>幅 (cm)</label>
            <input type="number" value={customW} min="1" onChange={(e) => setCustomW(e.target.value)} disabled={!hasFloorplan} />
          </div>
          <div style={{ flex: 1 }}>
            <label>奥行 (cm)</label>
            <input type="number" value={customD} min="1" onChange={(e) => setCustomD(e.target.value)} disabled={!hasFloorplan} />
          </div>
        </div>
        <button onClick={handleAddCustom} disabled={!hasFloorplan || !customName.trim()} style={{ width: '100%' }}>
          ＋ 追加
        </button>
      </div>
    </div>
    </>
  );
}
