export type MobileTab =
  | 'image' | 'furniture' | 'scale' | 'edit' | 'project'   // furniture mode
  | 'addDimension' | 'addMemo' | 'list';                   // measure mode

export const FURNITURE_TABS: Array<{ id: MobileTab; label: string }> = [
  { id: 'image', label: '画像' },
  { id: 'furniture', label: '家具' },
  { id: 'scale', label: '縮尺' },
  { id: 'edit', label: '編集' },
  { id: 'project', label: 'その他' },
];

export const MEASURE_TABS: Array<{ id: MobileTab; label: string }> = [
  { id: 'addDimension', label: '＋寸法' },
  { id: 'addMemo', label: '＋マーク' },
  { id: 'list', label: '一覧' },
  { id: 'project', label: 'その他' },
];

interface MobileTabBarProps {
  tabs: Array<{ id: MobileTab; label: string }>;
  activeTab: MobileTab | null;
  onChange: (tab: MobileTab | null) => void;
}

export function MobileTabBar({ tabs, activeTab, onChange }: MobileTabBarProps) {
  return (
    <nav className="mobile-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={tab.id === activeTab ? 'active' : undefined}
          // Tapping the active tab again closes the sheet
          onClick={() => onChange(tab.id === activeTab ? null : tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
