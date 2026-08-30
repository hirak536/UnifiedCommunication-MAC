import React from 'react';
import { Phone, Clock, Users, Settings, Volume2 } from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAudioModal: () => void;
  isRegistered: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenAudioModal,
  isRegistered,
}) => {
  const navItems = [
    { id: 'keypad' as NavTab, label: 'Keypad', icon: Phone },
    { id: 'recents' as NavTab, label: 'Recents', icon: Clock },
    { id: 'contacts' as NavTab, label: 'Contacts', icon: Users },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="flex md:hidden items-center justify-around h-15 px-2 border-t border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg z-30 select-none transition-colors">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-all duration-150 cursor-pointer ${
              isActive
                ? 'text-brand-600 dark:text-brand-400 scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {/* Active Top Line Indicator */}
            {isActive && (
              <span className="absolute top-0 inset-x-4 h-0.5 bg-brand-600 dark:bg-brand-500 rounded-full shadow-xs shadow-brand-500" />
            )}

            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.id === 'settings' && (
                <span
                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                    isRegistered ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                />
              )}
            </div>
            <span className={`text-[10px] mt-1 font-medium tracking-tight ${isActive ? 'font-bold' : ''}`}>
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Quick Audio Routing Button */}
      <button
        onClick={onOpenAudioModal}
        title="Audio Devices"
        className="flex flex-col items-center justify-center flex-1 h-full py-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
      >
        <Volume2 className="w-5 h-5" />
        <span className="text-[10px] mt-1 font-medium tracking-tight">Audio</span>
      </button>
    </nav>
  );
};
