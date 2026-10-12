import { useAppStore } from '../../store/useAppStore';
import type { PlanRoom } from '../../types';
import { NumField } from './NumField';
import { MIN_ROOM_CM } from '../../utils/planUtils';

export function RoomEditor({ room }: { room: PlanRoom }) {
  const updateRoom = useAppStore((s) => s.updateRoom);
  const wallCm = useAppStore((s) => s.project.plan?.wallCm);
  const update = (key: string, changes: Partial<PlanRoom>) => updateRoom(room.id, changes, { undoKey: `${key}:${room.id}` });

  return (
    <>
      <div>
        <label>部屋名</label>
        <input value={room.name} placeholder="例: LDK、洋室" onChange={(e) => update('name', { name: e.target.value })} />
      </div>
      <div className="plan-field-row">
        <NumField label="幅 (cm)" value={room.w} min={MIN_ROOM_CM} onChange={(v) => v && update('w', { w: v })} />
        <NumField label="奥行 (cm)" value={room.h} min={MIN_ROOM_CM} onChange={(v) => v && update('h', { h: v })} />
      </div>
      <div className="plan-field-row">
        <NumField label="X (cm)" value={room.x} onChange={(v) => v !== undefined && update('x', { x: v })} />
        <NumField label="Y (cm)" value={room.y} onChange={(v) => v !== undefined && update('y', { y: v })} />
      </div>
      <NumField
        label="壁厚 (cm)" value={room.wallCm} allowEmpty min={0}
        placeholder={`既定 ${wallCm}`}
        onChange={(v) => update('wallCm', { wallCm: v })}
      />
      <p className="plan-note">幅・奥行は室内の有効寸法です。壁は外側に描かれます。</p>
    </>
  );
}
