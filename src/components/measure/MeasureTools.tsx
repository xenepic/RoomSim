import { useAppStore } from '../../store/useAppStore';
import type { MeasureTool } from '../../types';
import { MeasureHint } from './MeasureHint';

const TOOLS: Array<{ id: MeasureTool; label: string }> = [
  { id: 'select', label: '選択' },
  { id: 'dimension', label: '＋寸法線' },
  { id: 'memo', label: '＋マーク' },
];

// Tool picker for the desktop left panel (mobile uses the tab bar instead)
export function MeasureTools() {
  const tool = useAppStore((s) => s.measureTool);
  const setMeasureTool = useAppStore((s) => s.setMeasureTool);

  return (
    <>
      <div className="panel-section">
        <h3>採寸</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setMeasureTool(t.id)}
              className={t.id === tool ? 'tool-active' : undefined}
              style={{ flex: 1, fontSize: 12, padding: '5px 2px' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <MeasureHint />
    </>
  );
}
