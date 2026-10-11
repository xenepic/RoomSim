import { useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  createProject, switchProject, deleteProject, exportCurrentProject, importProjectFile,
} from '../../store/persistence';

export function ProjectActions() {
  const project = useAppStore((s) => s.project);
  const projectList = useAppStore((s) => s.projectList);
  const saveError = useAppStore((s) => s.saveError);
  const renameProject = useAppStore((s) => s.renameProject);
  const resetProject = useAppStore((s) => s.resetProject);
  const fileRef = useRef<HTMLInputElement>(null);
  // {msg, rev} — rev increments on each trigger to force re-mount and restart animation
  const [toast, setToast] = useState<{ msg: string; rev: number } | null>(null);

  const showToast = (msg: string) => {
    setToast((t) => ({ msg, rev: (t?.rev ?? 0) + 1 }));
  };

  const handleCreate = async () => {
    await createProject();
    showToast('新しい物件を作成しました');
  };

  const handleDelete = async () => {
    if (!window.confirm(`「${project.name}」を削除しますか？（元に戻せません）`)) return;
    await deleteProject(project.id);
    showToast('削除しました');
  };

  const handleReset = () => {
    if (window.confirm(`「${project.name}」の図面・家具・採寸データをすべて消去しますか？`)) {
      resetProject();
      showToast('消去しました');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await importProjectFile(file);
      showToast('読み込みました（新しい物件として追加）');
    } catch (err) {
      console.error('[RoomSim] 読み込みに失敗しました:', err);
      showToast('読み込みに失敗しました');
    }
  };

  return (
    <>
      <div className="panel-section">
        <h3>物件</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <select value={project.id} onChange={(e) => void switchProject(e.target.value)}>
            {/* The current project may not be in the list until its first save */}
            {!projectList.some((p) => p.id === project.id) && (
              <option value={project.id}>{project.name}</option>
            )}
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div>
            <label>物件名</label>
            <input value={project.name} onChange={(e) => renameProject(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleCreate} style={{ flex: 1 }}>＋ 新規</button>
            <button onClick={handleDelete} style={{ flex: 1, color: '#c0392b' }}>削除</button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={exportCurrentProject} style={{ flex: 1 }} title="JSON ファイルとしてバックアップ">
              書き出し
            </button>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1 }}>
              読み込み
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImport} />
          <button onClick={handleReset} style={{ fontSize: 11, color: '#888' }}>この物件の内容を消去</button>
          <div style={{ fontSize: 11, color: saveError ? '#c0392b' : '#999' }}>
            {saveError ? '⚠ 保存に失敗しました。書き出しでバックアップしてください' : '変更は自動保存されます'}
          </div>
        </div>
      </div>

      {toast && (
        <div
          key={toast.rev}
          className="toast"
          style={{ background: 'rgba(30,30,30,0.82)' }}
          onAnimationEnd={() => setToast(null)}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}
