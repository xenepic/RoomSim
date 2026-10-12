import { useAppStore } from '../../store/useAppStore';
import { measureComparisons } from '../../utils/planMeasure';
import { signed, statusText } from './MeasureLinkRow';

// Left panel in plan mode: every plan value linked to a measured dimension, compared
export function MeasureComparison() {
  const plan = useAppStore((s) => s.project.plan);
  const dimensions = useAppStore((s) => s.project.dimensions);
  const selectPlan = useAppStore((s) => s.selectPlan);
  const setPlanTool = useAppStore((s) => s.setPlanTool);
  if (!plan) return null;

  const hasMeasured = dimensions.some((d) => d.valueCm !== null);
  const rows = measureComparisons(plan, dimensions);
  if (!hasMeasured && rows.length === 0) return null;
  const diffs = rows.filter((r) => r.status.state === 'diff').length;

  return (
    <div className="panel-section">
      <h3>採寸との比較{rows.length > 0 && `（${diffs > 0 ? `${diffs}件ずれ` : 'ずれなし'}）`}</h3>
      {rows.length === 0 ? (
        <p className="plan-note">部屋・扉などを選び、寸法欄の下の「採寸値を使う」で実測値を割り当てると、ここで図面と比較できます。</p>
      ) : (
        rows.map((r) => (
          <button
            key={`${r.ref.id}:${r.field}`}
            className={`plan-compare-row ${r.status.state}`}
            onClick={() => { setPlanTool('select'); selectPlan(r.ref); }}
          >
            <span className="name">{r.label}</span>
            <span className="status">
              {r.status.state === 'diff'
                ? `図面 ${r.planCm} / 実測 ${r.status.measuredCm}（${signed(r.status.diffCm)}）`
                : statusText(r.status)}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
