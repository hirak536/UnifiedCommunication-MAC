import React, { useState } from 'react';
import { X, Server, Lock, User, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { SipAccountConfig } from '../types/pjsip';

interface SipAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndRegister: (config: SipAccountConfig) => void;
  onUnregister: () => void;
  isRegistered: boolean;
  registrationStatus: string;
  initialConfig?: SipAccountConfig;
}

export const SipAccountModal: React.FC<SipAccountModalProps> = ({
  isOpen,
  onClose,
  onSaveAndRegister,
  onUnregister,
  isRegistered,
  registrationStatus,
  initialConfig,
}) => {
  const [server, setServer] = useState<string>(initialConfig?.server || '');
  const [port, setPort] = useState<number>(initialConfig?.port || 5060);
  const [username, setUsername] = useState<string>(initialConfig?.username || '');
  const [authId, setAuthId] = useState<string>(initialConfig?.auth_id || '');
  const [password, setPassword] = useState<string>(initialConfig?.password || '');
  const [transport, setTransport] = useState<'udp' | 'tcp' | 'tls'>(initialConfig?.transport || 'udp');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!server.trim() || !username.trim()) return;

    const config: SipAccountConfig = {
      server: server.trim(),
      port: Number(port) || 5060,
      username: username.trim(),
      auth_id: authId.trim() || username.trim(),
      password,
      transport,
    };

    onSaveAndRegister(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-700/80">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">SIP Account Settings</h3>
              <p className="text-xs text-slate-400">Configure your PBX / VoIP provider credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-surface-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Banner */}
        <div className="flex items-center justify-between px-3.5 py-2.5 mb-5 rounded-2xl bg-surface-200/80 border border-slate-700/50">
          <span className="text-xs font-medium text-slate-400">Registration Status:</span>
          <div className="flex items-center gap-2">
            {isRegistered ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">Registered</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-300">
                  {registrationStatus || 'Unregistered'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">SIP Server / Domain</label>
              <input
                type="text"
                required
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="pbx.example.com"
                className="glass-input w-full px-3 py-2 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="5060"
                className="glass-input w-full px-3 py-2 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          {/* Username & Auth ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username / Ext</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="1001"
                  className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none"
                />
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Auth ID (Optional)</label>
              <input
                type="text"
                value={authId}
                onChange={(e) => setAuthId(e.target.value)}
                placeholder="Same as username"
                className="glass-input w-full px-3 py-2 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="glass-input w-full pl-9 pr-10 py-2 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none font-mono"
              />
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Transport */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">SIP Transport</label>
            <div className="grid grid-cols-3 gap-2">
              {(['udp', 'tcp', 'tls'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTransport(t)}
                  className={`py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border ${
                    transport === t
                      ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                      : 'bg-surface-200 border-slate-700/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-3">
            {isRegistered && (
              <button
                type="button"
                onClick={onUnregister}
                className="w-1/3 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs transition-colors"
              >
                Disconnect
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-brand-600/30 transition-all cursor-pointer"
            >
              Save & Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
