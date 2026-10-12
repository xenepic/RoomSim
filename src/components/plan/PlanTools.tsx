import { useAppStore } from '../../store/useAppStore';
import type { PlanTool } from '../../types';
import { SnapGridToggle } from '../toolbar/SnapGridToggle';
import { NumField } from './NumField';
import { MeasureComparison } from './MeasureComparison';
import { DOOR_TYPES, FIXTURE_KINDS, WINDOW_TYPES } from '../../data/planKinds';

const TOOLS: Array<{ id: PlanTool; label: string }> = [
  { id: 'select', label: '選択' },
  { id: 'room', label: '＋部屋' },
  { id: 'door', label: '＋扉' },
  { id: 'window', label: '＋窓' },
  { id: 'wall', label: '＋壁' },
  { id: 'fixture', label: '＋設備' },
];

const HINTS: Record<PlanTool, string> = {
  select: 'ドラッグで移動、ハンドルでサイズ変更。何もない所のドラッグで画面移動。',
  room: 'ドラッグで部屋を描きます（クリックで 300×300）。',
  wall: 'ドラッグで壁を引きます（水平・垂直に吸着）。部屋で表せない間仕切りなどに。',
  door: '壁の近くをクリックして扉を置きます。続けて置けて、置いた扉・窓はそのままドラッグで動かせます（Esc で選択に戻る）。',
  window: '壁の近くをクリックして窓を置きます。続けて置けて、置いた扉・窓はそのままドラッグで動かせます（Esc で選択に戻る）。',
  fixture: 'ドラッグで設備を描きます（クリックで既定サイズ）。斜線は家具を置けない範囲、梁は点線です。',
};

// Left panel in plan mode
export function PlanTools() {
  const tool = useAppStore((s) => s.planTool);
  const setPlanTool = useAppStore((s) => s.setPlanTool);
  const doorType = useAppStore((s) => s.planDoorType);
  const windowType = useAppStore((s) => s.planWindowType);
  const fixtureKind = useAppStore((s) => s.planFixtureKind);
  const setPlanPlaceType = useAppStore((s) => s.setPlanPlaceType);
  const plan = useAppStore((s) => s.project.plan);
  const hasImage = useAppStore((s) => !!s.project.floorplan);
  const updatePlanSettings = useAppStore((s) => s.updatePlanSettings);
  const moveFurniture = useAppStore((s) => s.planMoveFurniture);
  const setPlanMoveFurniture = useAppStore((s) => s.setPlanMoveFurniture);

  if (!plan) return null;
  const underlay = plan.underlay;

  return (
    <>
      <div className="panel-section">
        <h3>作図</h3>
        <div className="plan-tool-grid">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => setPlanTool(t.id)} className={t.id === tool ? 'tool-active' : undefined}>
              {t.label}
            </button>
          ))}
        </div>
        {tool === 'door' && (
          <div className="plan-kind-picker">
            {DOOR_TYPES.map((t) => (
              <button key={t.id} className={t.id === doorType ? 'active' : undefined} onClick={() => setPlanPlaceType({ planDoorType: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        {tool === 'window' && (
          <div className="plan-kind-picker">
            {WINDOW_TYPES.map((t) => (
              <button key={t.id} className={t.id === windowType ? 'active' : undefined} onClick={() => setPlanPlaceType({ planWindowType: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        {tool === 'fixture' && (
          <div className="plan-kind-picker">
            {FIXTURE_KINDS.map((t) => (
              <button key={t.id} className={t.id === fixtureKind ? 'active' : undefined} onClick={() => setPlanPlaceType({ planFixtureKind: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        )}
        <p className="plan-note">{HINTS[tool]}</p>
      </div>

      <MeasureComparison />

      <div className="panel-section">
        <h3>下敷き画像</h3>
        {hasImage ? (
          <>
            <label className="plan-check">
              <input
                type="checkbox" checked={underlay.visible}
                onChange={(e) => updatePlanSettings({ underlay: { ...underlay, visible: e.target.checked } }, { undoKey: false })}
              />
              表示する
            </label>
            {underlay.visible && (
              <>
                <label>透明度 {Math.round((1 - underlay.opacity) * 100)}%</label>
                <input
                  type="range" min={0.1} max={1} step={0.05} value={underlay.opacity} style={{ width: '100%' }}
                  onChange={(e) => updatePlanSettings({ underlay: { ...underlay, opacity: Number(e.target.value) } }, { undoKey: false })}
                />
              </>
            )}
            <p className="plan-note">大きさは縮尺設定で決まります。位置は図面側を全選択（Ctrl+A）して動かして合わせます。</p>
          </>
        ) : (
          <p className="plan-note">配置モードで間取り画像を読み込むと下敷きにできます。</p>
        )}
      </div>

      <div className="panel-section">
        <h3>設定</h3>
        <NumField
          label="壁厚の既定値 (cm)" value={plan.wallCm} min={1}
          onChange={(v) => v && updatePlanSettings({ wallCm: v }, { undoKey: 'wallCm' })}
        />
        <label className="plan-check" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={moveFurniture} onChange={(e) => setPlanMoveFurniture(e.target.checked)} />
          部屋を動かすと家具も一緒に動かす
        </label>
      </div>
      <SnapGridToggle />
    </>
  );
}
