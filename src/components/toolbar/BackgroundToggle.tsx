import { useAppStore } from '../../store/useAppStore';
import { effectiveBackground } from '../../utils/projectUtils';

// Furniture mode background: the floorplan image or the plan drawn in plan mode.
// Hidden until a plan has been drawn.
export function BackgroundToggle() {
  const plan = useAppStore((s) => s.project.plan);
  const hasImage = useAppStore((s) => !!s.project.floorplan);
  const background = useAppStore((s) => effectiveBackground(s.project));
  const setBackground = useAppStore((s) => s.setBackground);
  const updatePlanSettings = useAppStore((s) => s.updatePlanSettings);

  if (!plan || plan.rooms.length === 0) return null;

  return (
    <div className="panel-section">
      <h3>背景</h3>
      <div className="mode-toggle bg-toggle" role="group" aria-label="背景">
        <button className={background === 'image' ? 'active' : undefined} onClick={() => setBackground('image')}>
          間取り画像
        </button>
        <button className={background === 'plan' ? 'active' : undefined} onClick={() => setBackground('plan')}>
          作成した図面
        </button>
      </div>
      {background === 'plan' && hasImage && (
        <label className="plan-check" style={{ marginTop: 8 }}>
          <input
            type="checkbox" checked={plan.underlay.inFurniture}
            onChange={(e) => updatePlanSettings({ underlay: { ...plan.underlay, inFurniture: e.target.checked } }, { undoKey: false })}
          />
          画像を重ねて表示
        </label>
      )}
    </div>
  );
}
