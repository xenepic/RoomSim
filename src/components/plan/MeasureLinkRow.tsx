import { useAppStore } from '../../store/useAppStore';
import type { MeasuredField, PlanRef } from '../../types';
import { FIELD_LABEL, linkStatus, measureCandidates, planValue, type MeasureLinkStatus } from '../../utils/planMeasure';

export const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`);

export function statusText(s: MeasureLinkStatus): string {
  switch (s.state) {
    case 'missing': return '採寸データが削除されています';
    case 'unmeasured': return '実測 未測定';
    case 'match': return `実測 ${s.measuredCm}cm と一致`;
    case 'diff': return `実測 ${s.measuredCm}cm（図面が ${signed(s.diffCm)}cm）`;
  }
}

/**
 * Under a size field: pick a measured dimension for it (applies the value and keeps
 * the link), then compare the plan value with it. Hidden when there is nothing to pick.
 */
export function MeasureLinkRow({ target, field }: { target: PlanRef; field: MeasuredField }) {
  const plan = useAppStore((s) => s.project.plan);
  const dimensions = useAppStore((s) => s.project.dimensions);
  const linkMeasure = useAppStore((s) => s.linkMeasure);
  if (!plan) return null;

  const el = target.kind === 'room' ? plan.rooms.find((r) => r.id === target.id)
    : target.kind === 'wall' ? plan.walls.find((w) => w.id === target.id)
      : target.kind === 'opening' ? plan.openings.find((o) => o.id === target.id)
        : plan.fixtures.find((f) => f.id === target.id);
  const linkId = el?.measured?.[field];
  const current = planValue(plan, target, field) ?? 0;

  if (!linkId) {
    const candidates = measureCandidates(dimensions, current);
    if (candidates.length === 0) return null;
    return (
      <div className="measure-link">
        <select
          value=""
          onChange={(e) => e.target.value && linkMeasure(target, field, e.target.value, true)}
        >
          <option value="">{FIELD_LABEL[field]}に採寸値を使う…</option>
          {candidates.map((d) => (
            <option key={d.id} value={d.id}>{d.valueCm}cm{d.note ? `　${d.note}` : ''}</option>
          ))}
        </select>
      </div>
    );
  }

  const status = linkStatus(plan, target, field, linkId, dimensions);
  return (
    <div className={`measure-link linked ${status.state}`}>
      <span className="measure-link-text">
        {FIELD_LABEL[field]}：{status.state === 'match' ? '✓ ' : status.state === 'diff' ? '⚠ ' : ''}{statusText(status)}
      </span>
      {status.state === 'diff' && (
        <button onClick={() => linkMeasure(target, field, linkId, true)} title="図面の値を実測値にします">合わせる</button>
      )}
      <button onClick={() => linkMeasure(target, field, null)} title="採寸データとの紐付けを外します">解除</button>
    </div>
  );
}
