import { useAppStore } from '../../store/useAppStore';
import type { PlanOpening } from '../../types';
import { DOOR_TYPES, WINDOW_TYPES, getWindowType } from '../../data/planKinds';
import { hostFrame, MIN_OPENING_CM } from '../../utils/planUtils';
import { NumField } from './NumField';

export function OpeningEditor({ opening: o }: { opening: PlanOpening }) {
  const updateOpening = useAppStore((s) => s.updateOpening);
  const plan = useAppStore((s) => s.project.plan);
  const frame = plan ? hostFrame(plan, o.host) : null;
  const update = (key: string, changes: Parameters<typeof updateOpening>[1]) =>
    updateOpening(o.id, changes, { undoKey: `${key}:${o.id}` });

  // Position is edited as the distance from the wall's start to the opening's edge
  const fromStart = Math.round((o.offsetCm - o.widthCm / 2) * 10) / 10;
  const toEnd = frame ? Math.round((frame.len - o.offsetCm - o.widthCm / 2) * 10) / 10 : undefined;

  return (
    <>
      {o.type === 'door' ? (
        <div>
          <label>種類</label>
          <select value={o.door} onChange={(e) => update('type', { door: e.target.value as typeof o.door })}>
            {DOOR_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label>種類</label>
          <select
            value={o.window}
            // A new window type also takes that type's typical height
            onChange={(e) => {
              const def = getWindowType(e.target.value as typeof o.window);
              update('type', { window: def.id, sillCm: def.sillCm, heightCm: def.heightCm });
            }}
          >
            {WINDOW_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      )}

      <div className="plan-field-row">
        <NumField label="幅 (cm)" value={o.widthCm} min={MIN_OPENING_CM} onChange={(v) => v && update('w', { widthCm: v })} />
        <NumField
          label="壁の端から (cm)" value={fromStart} min={0}
          onChange={(v) => v !== undefined && update('pos', { offsetCm: v + o.widthCm / 2 })}
        />
      </div>
      {toEnd !== undefined && <p className="plan-note" style={{ marginTop: -4 }}>反対側の端まで {toEnd}cm</p>}

      {o.type === 'door' && o.door !== 'opening' && (
        <div className="plan-toggle-row">
          {o.door === 'sliding' ? (
            <button onClick={() => update('flip', { hinge: o.hinge === 'start' ? 'end' : 'start' })}>⇄ 引く方向を反転</button>
          ) : (
            <>
              {o.door === 'hinged' && (
                <button onClick={() => update('flip', { hinge: o.hinge === 'start' ? 'end' : 'start' })}>⇄ 吊元を反転</button>
              )}
              <button onClick={() => update('flip', { swing: o.swing === 'in' ? 'out' : 'in' })}>
                ⇅ {o.swing === 'in' ? '内開き' : '外開き'} → {o.swing === 'in' ? '外開き' : '内開き'}
              </button>
            </>
          )}
        </div>
      )}

      {o.type === 'window' && (
        <div className="plan-field-row">
          <NumField label="床から窓下 (cm)" value={o.sillCm} min={0} onChange={(v) => v !== undefined && update('sill', { sillCm: v })} />
          <NumField label="窓の高さ (cm)" value={o.heightCm} min={1} onChange={(v) => v && update('h', { heightCm: v })} />
        </div>
      )}
      <p className="plan-note">
        {o.type === 'door'
          ? 'ドラッグで壁に沿って移動。壁から離すと近くの別の壁に移せます。'
          : '窓下の高さより低い家具なら窓の前に置けます。掃き出し窓の前（水色）は空けておくのが無難です。'}
      </p>
    </>
  );
}
