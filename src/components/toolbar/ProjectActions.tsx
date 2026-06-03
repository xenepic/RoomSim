import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function ProjectActions() {
  const saveProject = useAppStore((s) => s.saveProject);
  const loadProject = useAppStore((s) => s.loadProject);
  const resetProject = useAppStore((s) => s.resetProject);
  // {msg, rev} — rev increments on each trigger to force re-mount and restart animation
  const [toast, setToast] = useState<{ msg: string; rev: number } | null>(null);

  const showToast = (msg: string) => {
    setToast((t) => ({ msg, rev: (t?.rev ?? 0) + 1 }));
  };

  const handleSave = () => { saveProject(); showToast('保存しました'); };
  const handleLoad = () => { loadProject(); showToast('読み込みました'); };
  const handleReset = () => {
    if (window.confirm('プロジェクトをリセットしますか？（保存データは維持されます）')) {
      resetProject();
      showToast('リセットしました');
    }
  };

  return (
    <>
      <div className="panel-section">
        <h3>プロジェクト</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={handleSave}>保存</button>
          <button onClick={handleLoad}>読み込み</button>
          <button onClick={handleReset} style={{ color: '#c0392b' }}>リセット</button>
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
