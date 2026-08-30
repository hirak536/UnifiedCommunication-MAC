import React, { useState } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Trash2, Search } from 'lucide-react';
import { CallRecord } from '../types/pjsip';

interface CallHistoryProps {
  history: CallRecord[];
  onCall: (destination: string) => void;
  onClearHistory: () => void;
}

export const CallHistory: React.FC<CallHistoryProps> = ({
  history,
  onCall,
  onClearHistory,
}) => {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDuration = (secs: number) => {
    if (!secs || secs <= 0) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const filteredHistory = history.filter((item) => {
    if (filter === 'missed' && item.status !== 'missed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const num = item.remote_uri.toLowerCase();
      const name = (item.display_name || '').toLowerCase();
      return num.includes(q) || name.includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full w-full max-w-lg mx-auto select-none animate-fadeIn">
      {/* Header & Filter Controls */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Recents</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Past calls and missed activity</p>
        </div>

        <div className="flex items-center gap-2">
          {/* All / Missed Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('missed')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'missed'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Missed
            </button>
          </div>

          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              title="Clear call history"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Filter Input */}
      {history.length > 3 && (
        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recents..."
            className="glass-input w-full pl-8 pr-3 py-1.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
        </div>
      )}

      {/* List Feed */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 dark:text-slate-500">
            <Clock className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm font-medium">No recent calls</p>
            <p className="text-xs">Your call activity will appear here</p>
          </div>
        ) : (
          filteredHistory.map((call) => {
            const cleanNumber = call.remote_uri.replace(/^sip:/i, '').split('@')[0];
            const isMissed = call.status === 'missed';
            const isOutbound = call.direction === 'outbound';

            return (
              <div
                key={call.id}
                onClick={() => onCall(cleanNumber)}
                className="group flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-brand-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3">
                  {/* Direction Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isMissed
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : isOutbound
                        ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}
                  >
                    {isMissed ? (
                      <PhoneMissed className="w-4 h-4" />
                    ) : isOutbound ? (
                      <PhoneOutgoing className="w-4 h-4" />
                    ) : (
                      <PhoneIncoming className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <h4
                      className={`text-sm font-semibold tracking-tight ${
                        isMissed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {call.display_name || cleanNumber}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{isOutbound ? 'Outgoing' : isMissed ? 'Missed' : 'Incoming'}</span>
                      {call.duration > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(call.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                    {formatTimestamp(call.timestamp)}
                  </span>

                  {/* Redial Action Button */}
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:bg-emerald-500 hover:text-white">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
