import React, { useState, useRef, useEffect } from 'react';
import { Check, CheckCircle2, ChevronRight } from 'lucide-react';

export type PresenceStatus = 'available' | 'busy' | 'away' | 'dnd';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  username: string;
  server: string;
  isRegistered: boolean;
  registrationStatus?: string;
  presence: PresenceStatus;
  onChangePresence: (presence: PresenceStatus) => void;
  onViewProfile: () => void;
  onSignOut: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isOpen,
  onClose,
  displayName,
  username,
  server,
  isRegistered,
  presence,
  onChangePresence,
  onViewProfile,
  onSignOut,
}) => {
  const [showStatusSubmenu, setShowStatusSubmenu] = useState<boolean>(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) {
      setShowStatusSubmenu(false);
      setUpdateMessage(null);
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getInitials = (name: string) => {
    if (!name) return 'HP';
    const clean = name.trim();
    const parts = clean.split(/[\s\-_@.]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const presenceLabels: Record<PresenceStatus, { label: string; color: string }> = {
    available: { label: 'Available', color: 'bg-emerald-500' },
    busy: { label: 'Busy', color: 'bg-rose-500' },
    away: { label: 'Away', color: 'bg-amber-400' },
    dnd: { label: 'Do not disturb', color: 'bg-rose-600' },
  };

  const handleCheckUpdates = () => {
    setUpdateMessage('You are on the latest version (v1.0.0 - PJSIP 2.17)');
    setTimeout(() => setUpdateMessage(null), 3500);
  };

  return (
    <div
      ref={menuRef}
      className="absolute top-13 right-3 w-72 rounded-2xl bg-white dark:bg-[#1E2330] border border-slate-200 dark:border-slate-750 shadow-2xl z-50 overflow-hidden text-slate-800 dark:text-slate-100 select-none animate-fadeIn transition-colors duration-150"
    >
      {/* Top Section: Avatar & User Identity */}
      <div className="p-4 flex items-start gap-3.5 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-white font-bold text-base flex items-center justify-center shadow-md border border-slate-700">
            {getInitials(displayName || username)}
          </div>
          {/* Presence Ring */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#1E2330] ${
              isRegistered ? presenceLabels[presence].color : 'bg-slate-400'
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
            {displayName || 'Hirak Patel'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1.5 font-mono">
            {username}@{server}
          </p>
          <button
            onClick={() => {
              onViewProfile();
              onClose();
            }}
            className="inline-flex items-center px-2.5 py-0.5 rounded-md border border-blue-500/70 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 text-xs font-semibold transition-colors cursor-pointer"
          >
            View profile
          </button>
        </div>
      </div>

      {/* Share Status Section */}
      <div className="p-1.5 border-b border-slate-200 dark:border-slate-800">
        <div className="px-3 pt-2 pb-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Share status
        </div>

        <div className="relative">
          <button
            onClick={() => setShowStatusSubmenu(!showStatusSubmenu)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
              <span className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                {presenceLabels[presence].label}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Submenu for Presence States */}
          {showStatusSubmenu && (
            <div className="mt-1 mb-1 p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-0.5 animate-fadeIn">
              {(Object.keys(presenceLabels) as PresenceStatus[]).map((key) => {
                const item = presenceLabels[key];
                const isSelected = presence === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onChangePresence(key);
                      setShowStatusSubmenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Check for updates & Sign out (NO Add Account) */}
      <div className="p-1.5">
        <button
          onClick={handleCheckUpdates}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <span>Check for updates</span>
        </button>

        {updateMessage && (
          <div className="px-3 py-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg mx-1 my-1 animate-fadeIn">
            {updateMessage}
          </div>
        )}

        <button
          onClick={() => {
            onSignOut();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};
