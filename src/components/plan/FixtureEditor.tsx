import { useAppStore } from '../../store/useAppStore';
import type { PlanFixture } from '../../types';
import { FIXTURE_KINDS, getFixtureKind } from '../../data/planKinds';
import { MIN_ROOM_CM, roundCm } from '../../utils/planUtils';
import { NumField } from './NumField';

export function FixtureEditor({ fixture: f }: { fixture: PlanFixture }) {
  const updateFixture = useAppStore((s) => s.updateFixture);
  const update = (key: string, changes: Partial<PlanFixture>) => updateFixture(f.id, changes, { undoKey: `${key}:${f.id}` });
  const def = getFixtureKind(f.kind);

  return (
    <>
      <div className="plan-field-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <label>種類</label>
          <select
            value={f.kind}
            // The label follows the kind unless it was renamed
            onChange={(e) => {
              const next = getFixtureKind(e.target.value as PlanFixture['kind']);
              update('kind', { kind: next.id, ...(f.label === def.label ? { label: next.label } : {}) });
            }}
          >
            {FIXTURE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label>表示名</label>
          <input value={f.label} onChange={(e) => update('label', { label: e.target.value })} />
        </div>
      </div>
      <div className="plan-field-row">
        <NumField label="幅 (cm)" value={f.w} min={MIN_ROOM_CM} onChange={(v) => v && update('w', { w: v })} />
        <NumField label="奥行 (cm)" value={f.h} min={MIN_ROOM_CM} onChange={(v) => v && update('h', { h: v })} />
      </div>
      <div className="plan-field-row">
        <NumField label="X (cm)" value={f.x} onChange={(v) => v !== undefined && update('x', { x: v })} />
        <NumField label="Y (cm)" value={f.y} onChange={(v) => v !== undefined && update('y', { y: v })} />
      </div>
      <div className="plan-toggle-row">
        <button
          // Swap width and depth around the center
          onClick={() => updateFixture(f.id, {
            x: roundCm(f.x + (f.w - f.h) / 2), y: roundCm(f.y + (f.h - f.w) / 2), w: f.h, h: f.w,
          })}
        >
          ⟳ 90°回転
        </button>
      </div>
      <p className="plan-note">
        {def.blocks ? '斜線の範囲は家具を置けない場所の目安です。' : '梁は天井付近なので点線で表示します（床には家具を置けます）。'}
      </p>
    </>
  );
}
