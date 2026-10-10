export type MobileTab = 'image' | 'furniture' | 'scale' | 'edit' | 'project';

const TABS: Array<{ id: MobileTab; label: string }> = [
  { id: 'image', label: '画像' },
  { id: 'furniture', label: '家具' },
  { id: 'scale', label: '縮尺' },
  { id: 'edit', label: '編集' },
  { id: 'project', label: 'その他' },
];

interface MobileTabBarProps {
  activeTab: MobileTab | null;
  onChange: (tab: MobileTab | null) => void;
}

export function MobileTabBar({ activeTab, onChange }: MobileTabBarProps) {
  return (
    <nav className="mobile-tabs">
      {TABS.map((tab) => (
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
