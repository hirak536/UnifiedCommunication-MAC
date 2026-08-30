import React from 'react';
import { Phone, Clock, Users, Settings, Volume2, Terminal, Sun, Moon } from 'lucide-react';

export type NavTab = 'keypad' | 'recents' | 'contacts' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  username?: string;
  isRegistered?: boolean;
  registrationStatus?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAudioModal: () => void;
  onOpenLogs: () => void;
  isLogsOpen: boolean;
  onOpenProfileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  theme,
  onToggleTheme,
  onOpenAudioModal,
  onOpenLogs,
  isLogsOpen,
}) => {
  const navItems = [
    { id: 'keypad' as NavTab, label: 'Keypad', icon: Phone },
    { id: 'recents' as NavTab, label: 'Recents', icon: Clock },
    { id: 'contacts' as NavTab, label: 'Contacts', icon: Users },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex w-16 md:w-18 flex-col items-center justify-between py-4 border-r border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-30 select-none transition-colors">
      {/* Top Section: Navigation Items */}
      <div className="flex flex-col items-center gap-6 w-full pt-1">
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={item.label}
                className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium mt-0.5 tracking-tight">
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute -left-2 top-3 bottom-3 w-1 bg-brand-600 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Utility Actions */}
      <div className="flex flex-col items-center gap-2 w-full px-2 pb-1">
        {/* Audio Modal Trigger */}
        <button
          onClick={onOpenAudioModal}
          title="Audio Devices (AEC)"
          className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Live SIP Log Console Trigger */}
        <button
          onClick={onOpenLogs}
          title="Live SIP Log Console"
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            isLogsOpen
              ? 'bg-brand-600/20 text-brand-600 dark:text-brand-300'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* Theme Switcher (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>
    </aside>
  );
};
