import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { estimateScaleFromTatami } from '../../utils/scaleUtils';
import type { TatamiType } from '../../types';
import type { CalibrationMode } from '../../App';

export interface ScaleCalibratorProps {
  calibrationMode: CalibrationMode;
  rulerPoints: Array<{ x: number; y: number }>;
  tatamiRect: { x: number; y: number; width: number; height: number } | null;
  onStartCalibration: (mode: 'ruler' | 'tatami') => void;
  onCancelCalibration: () => void;
  onScaleSet: () => void;
}

export function ScaleCalibrator({
  calibrationMode, rulerPoints, tatamiRect,
  onStartCalibration, onCancelCalibration, onScaleSet,
}: ScaleCalibratorProps) {
  const setScale = useAppStore((s) => s.setScale);
  const scale = useAppStore((s) => s.project.scale);

  const [rulerCm, setRulerCm] = useState('');
  const [tatamiCount, setTatamiCount] = useState('6');
  const [tatamiType, setTatamiType] = useState<TatamiType>('edo');

  // Distance in px between the two ruler points
  const rulerDistancePx = rulerPoints.length === 2
    ? Math.sqrt(
        Math.pow(rulerPoints[1].x - rulerPoints[0].x, 2) +
        Math.pow(rulerPoints[1].y - rulerPoints[0].y, 2)
      )
    : null;

  const handleConfirmRuler = () => {
    const cm = parseFloat(rulerCm);
    if (!rulerDistancePx || isNaN(cm) || cm <= 0) return;
    setScale({ pixelsPerCm: rulerDistancePx / cm, method: 'ruler', accuracy: 'exact' });
    setRulerCm('');
    onScaleSet();
  };

  const handleConfirmTatami = () => {
    if (!tatamiRect) return;
    const count = parseFloat(tatamiCount);
    if (isNaN(count) || count <= 0) return;
    const ppc = estimateScaleFromTatami(tatamiRect.width, tatamiRect.height, count, tatamiType);
    setScale({ pixelsPerCm: ppc, method: 'tatami', accuracy: 'estimated' });
    onScaleSet();
  };

  return (
    <div className="panel-section">
      <h3>縮尺設定</h3>

      {/* Show current scale when not actively calibrating */}
      {scale && calibrationMode === null && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 8, padding: '4px 6px', background: '#f0f0f0', borderRadius: 4 }}>
          {scale.pixelsPerCm.toFixed(2)} px/cm
          <span style={{ marginLeft: 6, color: scale.accuracy === 'estimated' ? '#E67E22' : '#27AE60' }}>
            ({scale.accuracy === 'estimated' ? '推定値' : '実測値'})
          </span>
        </div>
      )}

      {calibrationMode === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={() => onStartCalibration('ruler')}>ルーラーで設定</button>
          <button onClick={() => onStartCalibration('tatami')}>畳数で推定</button>
        </div>
      ) : calibrationMode === 'ruler' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, color: '#888' }}>
            {rulerPoints.length < 2
              ? `キャンバスで点を選択 (${rulerPoints.length}/2)`
              : `測定距離: ${rulerDistancePx!.toFixed(1)} px`}
          </div>
          {rulerDistancePx !== null && (
            <>
              <label>実寸 (cm)</label>
              <input
                type="number" value={rulerCm} min="1" placeholder="例: 350"
                onChange={(e) => setRulerCm(e.target.value)}
              />
              <button onClick={handleConfirmRuler} disabled={!rulerCm || parseFloat(rulerCm) <= 0}>
                縮尺を確定
              </button>
            </>
          )}
          <button onClick={onCancelCalibration} style={{ color: '#888' }}>キャンセル</button>
        </div>
      ) : (
        // tatami mode
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <label>畳タイプ</label>
            <select value={tatamiType} onChange={(e) => setTatamiType(e.target.value as TatamiType)}>
              <option value="edo">江戸間 (176×88cm)</option>
              <option value="kyo">京間 (191×95.5cm)</option>
              <option value="chukyo">中京間 (182×91cm)</option>
              <option value="danchi">団地間 (170×85cm)</option>
            </select>
          </div>
          <div>
            <label>畳数</label>
            <input type="number" value={tatamiCount} min="1" step="0.5"
              onChange={(e) => setTatamiCount(e.target.value)} />
          </div>
          <div style={{ fontSize: 11, color: '#888' }}>
            {tatamiRect
              ? `選択済み: ${Math.round(tatamiRect.width)}×${Math.round(tatamiRect.height)} px`
              : 'キャンバスで部屋を矩形選択してください'}
          </div>
          <button
            onClick={handleConfirmTatami}
            disabled={!tatamiRect || !tatamiCount || parseFloat(tatamiCount) <= 0}
          >
            縮尺を確定（推定値）
          </button>
          <button onClick={onCancelCalibration} style={{ color: '#888' }}>キャンセル</button>
        </div>
      )}
    </div>
  );
}
