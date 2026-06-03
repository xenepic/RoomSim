import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function ProjectActions() {
  const saveProject = useAppStore((s) => s.saveProject);
  const loadProject = useAppStore((s) => s.loadProject);
  const resetProject = useAppStore((s) => s.resetProject);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
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
        <div style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(30,30,30,0.82)',
          color: '#fff',
          padding: '8px 22px',
          borderRadius: 20,
          fontSize: 13,
          zIndex: 9999,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
