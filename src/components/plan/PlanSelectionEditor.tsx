import { useAppStore } from '../../store/useAppStore';
import { RoomEditor } from './RoomEditor';
import { OpeningEditor } from './OpeningEditor';
import { WallEditor } from './WallEditor';
import { FixtureEditor } from './FixtureEditor';

const KIND_LABEL = { room: '部屋', wall: '壁', opening: '扉・窓', fixture: '設備' } as const;

// Right panel in plan mode: the editor for a single selected element,
// or bulk actions for a multiple selection
export function PlanSelectionEditor() {
  const selection = useAppStore((s) => s.planSelection);
  const plan = useAppStore((s) => s.project.plan);
  const deletePlanSelection = useAppStore((s) => s.deletePlanSelection);
  const duplicatePlanSelection = useAppStore((s) => s.duplicatePlanSelection);

  const single = selection.length === 1 ? selection[0] : null;
  const room = single?.kind === 'room' ? plan?.rooms.find((r) => r.id === single.id) : undefined;
  const opening = single?.kind === 'opening' ? plan?.openings.find((o) => o.id === single.id) : undefined;
  const wall = single?.kind === 'wall' ? plan?.walls.find((w) => w.id === single.id) : undefined;
  const fixture = single?.kind === 'fixture' ? plan?.fixtures.find((f) => f.id === single.id) : undefined;

  const title = selection.length === 0 ? '図面'
    : opening ? (opening.type === 'door' ? '扉' : '窓')
      : fixture ? `設備（${fixture.label || '名前なし'}）`
        : single ? KIND_LABEL[single.kind] : `${selection.length}個を選択中`;

  return (
    <div>
      <div className="panel-section">
        <h3>{title}</h3>
      </div>
      {selection.length === 0 ? (
        <div style={{ padding: 12, color: '#999', fontSize: 12 }}>
          部屋・壁・扉などをクリックすると編集できます。Shift+クリックで複数選択。
        </div>
      ) : (
        <div className="plan-editor">
          {/* key: remount per element so local input state never leaks between elements */}
          {room && <RoomEditor key={room.id} room={room} />}
          {opening && <OpeningEditor key={opening.id} opening={opening} />}
          {wall && <WallEditor key={wall.id} wall={wall} />}
          {fixture && <FixtureEditor key={fixture.id} fixture={fixture} />}
          {!single && <p className="plan-note">ドラッグか矢印キー（Shift で 10cm）でまとめて移動できます。</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={duplicatePlanSelection} style={{ flex: 1 }} title="Ctrl+C">複製</button>
            <button onClick={deletePlanSelection} style={{ flex: 1, color: '#c0392b', borderColor: '#e74c3c' }} title="Delete">
              削除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
