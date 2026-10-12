import { useAppStore } from '../../store/useAppStore';
import type { PlanWall } from '../../types';
import { NumField } from './NumField';
import { MIN_WALL_CM, roundCm } from '../../utils/planUtils';

export function WallEditor({ wall }: { wall: PlanWall }) {
  const updateWall = useAppStore((s) => s.updateWall);
  const defaultCm = useAppStore((s) => s.project.plan?.wallCm);
  const update = (key: string, changes: Partial<PlanWall>) => updateWall(wall.id, changes, { undoKey: `${key}:${wall.id}` });

  const dx = wall.b.x - wall.a.x;
  const dy = wall.b.y - wall.a.y;
  const len = Math.hypot(dx, dy);
  // A new length keeps the start point and the direction
  const setLength = (v: number) => update('len', {
    b: { x: roundCm(wall.a.x + dx / len * v), y: roundCm(wall.a.y + dy / len * v) },
  });

  return (
    <>
      <div className="plan-field-row">
        <NumField label="長さ (cm)" value={roundCm(len)} min={MIN_WALL_CM} onChange={(v) => v && setLength(v)} />
        <NumField
          label="壁厚 (cm)" value={wall.thicknessCm} allowEmpty min={1}
          placeholder={`既定 ${defaultCm}`}
          onChange={(v) => update('t', { thicknessCm: v })}
        />
      </div>
      <p className="plan-note">端の○をドラッグで長さ・向きを変更（水平・垂直に吸着）。部屋で表せない間仕切りなどに使います。</p>
    </>
  );
}
