import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ProjectActions } from './ProjectActions';

// Desktop left-panel footer: project management is rarely needed once a project is
// chosen, so it stays collapsed to a one-line bar showing the current project.
export function ProjectBar() {
  const [open, setOpen] = useState(false);
  const name = useAppStore((s) => s.project.name);
  const saveError = useAppStore((s) => s.saveError);

  return (
    <div className="project-bar">
      {open && (
        <div className="project-bar-panel">
          <ProjectActions />
        </div>
      )}
      <button className="project-bar-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="project-bar-label">物件</span>
        <span className="project-bar-name">{name || '（名前なし）'}</span>
        {/* Keep a save failure visible even while collapsed */}
        {saveError && <span className="project-bar-error" title="保存に失敗しました">⚠</span>}
        <span className="project-bar-chevron">{open ? '▾' : '▴'}</span>
      </button>
    </div>
  );
}
