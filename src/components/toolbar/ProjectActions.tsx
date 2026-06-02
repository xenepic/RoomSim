import { useAppStore } from '../../store/useAppStore';

export function ProjectActions() {
  const saveProject = useAppStore((s) => s.saveProject);
  const loadProject = useAppStore((s) => s.loadProject);
  const resetProject = useAppStore((s) => s.resetProject);

  const handleReset = () => {
    if (window.confirm('プロジェクトをリセットしますか？（保存データは維持されます）')) {
      resetProject();
    }
  };

  return (
    <div className="panel-section">
      <h3>プロジェクト</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={saveProject}>保存</button>
        <button onClick={loadProject}>読み込み</button>
        <button onClick={handleReset} style={{ color: '#c0392b' }}>リセット</button>
      </div>
    </div>
  );
}
