import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PhoneIncoming, PhoneOff, Check, Terminal, X, Trash2, Sun, Moon } from 'lucide-react';
import { Sidebar, NavTab } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { ProfileMenu, PresenceStatus } from './components/ProfileMenu';
import { Dialpad } from './components/Dialpad';
import { ActiveCall } from './components/ActiveCall';
import { CallHistory } from './components/CallHistory';
import { Contacts } from './components/Contacts';
import { SipAccountModal } from './components/SipAccountModal';
import { AudioDeviceModal } from './components/AudioDeviceModal';
import {
  SipAccountConfig,
  AudioDevice,
  CallStateEvent,
  RegStateEvent,
  AudioDevicesEvent,
  DaemonStatusEvent,
  CallRecord,
  Contact,
} from './types/pjsip';
import { startRinger, stopRinger } from './utils/audio-tones';

export const DEFAULT_SIP_CONFIG: SipAccountConfig = {
  server: 'sip.linphone.org',
  port: 5060,
  username: 'hirakpatel',
  auth_id: 'hirakpatel',
  password: '',
  transport: 'tcp',
};

const INITIAL_CONTACTS: Contact[] = [
  { id: '1', name: 'Linphone Echo Test', number: 'sip:echo@sip.linphone.org', company: 'Belledonne Communications' },
  { id: '2', name: 'FreeSWITCH Echo Test', number: '8004444444', company: 'FreeSWITCH IVR' },
  { id: '3', name: 'Sales & Support', number: '900', company: 'Unified Comm' },
];

export const App: React.FC = () => {
  // Theme State (light / dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('app_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<NavTab>('keypad');

  // Application State
  const [isDaemonRunning, setIsDaemonRunning] = useState<boolean>(false);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [registrationStatus, setRegistrationStatus] = useState<string>('Unregistered');
  const [currentAccount, setCurrentAccount] = useState<SipAccountConfig | null>(DEFAULT_SIP_CONFIG);

  // Call State
  const [activeCall, setActiveCall] = useState<CallStateEvent | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallStateEvent | null>(null);
  const callStartTimeRef = useRef<number>(0);

  // Call History State
  const [callHistory, setCallHistory] = useState<CallRecord[]>(() => {
    try {
      const saved = localStorage.getItem('call_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Contacts State
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem('contacts');
      return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
    } catch {
      return INITIAL_CONTACTS;
    }
  });

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('call_history', JSON.stringify(callHistory));
  }, [callHistory]);

  // Save contacts to localStorage
  useEffect(() => {
    localStorage.setItem('contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Audio Device State
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [currentCaptureDev, setCurrentCaptureDev] = useState<number>(-1);
  const [currentPlaybackDev, setCurrentPlaybackDev] = useState<number>(-2);

  // Modals & Drawers
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [presence, setPresence] = useState<PresenceStatus>('available');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (isLogDrawerOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isLogDrawerOpen]);

  // Load saved credentials or initialize with default credentials on startup
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('pjsip_account_config');
      if (savedConfig) {
        const config: SipAccountConfig = JSON.parse(savedConfig);
        if (config.username === '901-iHDT' || config.server === 'fs1.ihs.host') {
          setCurrentAccount(DEFAULT_SIP_CONFIG);
          localStorage.setItem('pjsip_account_config', JSON.stringify(DEFAULT_SIP_CONFIG));
          setIsAccountModalOpen(true);
        } else {
          setCurrentAccount(config);
          if (!config.password) {
            setIsAccountModalOpen(true);
          }
        }
      } else {
        setCurrentAccount(DEFAULT_SIP_CONFIG);
        localStorage.setItem('pjsip_account_config', JSON.stringify(DEFAULT_SIP_CONFIG));
        setIsAccountModalOpen(true);
      }
    } catch {
      setCurrentAccount(DEFAULT_SIP_CONFIG);
    }
  }, []);

  // Listen to PJSIP events from Electron preload bridge
  useEffect(() => {
    if (!window.pjsip) return;

    // Initial audio devices fetch
    window.pjsip.getAudioDevices();

    // Call state listener
    const cleanupCallState = window.pjsip.onCallState((state) => {
      console.log('[APP] Call state event:', state);
      if (state.state === 'INCOMING') {
        setIncomingCall(state);
        startRinger();
      } else if (state.state === 'CONFIRMED') {
        stopRinger();
        callStartTimeRef.current = Date.now();
        setIncomingCall(null);
        setActiveCall(state);
      } else if (state.state === 'DISCONNECTED') {
        stopRinger();
        setIncomingCall(null);

        // Record into Call History
        const durationSecs = callStartTimeRef.current > 0
          ? Math.max(0, Math.floor((Date.now() - callStartTimeRef.current) / 1000))
          : 0;

        if (activeCall) {
          const newRecord: CallRecord = {
            id: Date.now().toString(),
            remote_uri: activeCall.remote_uri,
            direction: 'outbound',
            status: durationSecs > 0 ? 'connected' : 'declined',
            duration: durationSecs,
            timestamp: Date.now(),
          };
          setCallHistory((prev) => [newRecord, ...prev.slice(0, 49)]);
        }

        callStartTimeRef.current = 0;

        setActiveCall({
          event: 'call_state',
          call_id: state.call_id,
          state: 'DISCONNECTED',
          remote_uri: state.remote_uri || 'Call',
          last_status: state.last_status,
          reason: state.reason || (state.last_status ? `Ended (${state.last_status})` : 'Call Ended'),
        });

        // Auto-dismiss after 2 seconds
        setTimeout(() => {
          setActiveCall((curr) => (curr?.state === 'DISCONNECTED' ? null : curr));
        }, 2000);
      } else {
        stopRinger();
        setIncomingCall(null);
        setActiveCall(state);
      }
    });

    // Registration state listener
    const cleanupRegState = window.pjsip.onRegState((reg: RegStateEvent) => {
      console.log('[APP] Registration event:', reg);
      setIsRegistered(reg.is_registered);
      setRegistrationStatus(reg.reason || (reg.is_registered ? 'Registered' : 'Disconnected'));
    });

    // Audio devices listener
    const cleanupAudioDevices = window.pjsip.onAudioDevices((event: AudioDevicesEvent) => {
      setAudioDevices(event.devices || []);
      setCurrentCaptureDev(event.current_capture_dev);
      setCurrentPlaybackDev(event.current_playback_dev);
    });

    // Daemon status listener
    const cleanupDaemonStatus = window.pjsip.onDaemonStatus((status: DaemonStatusEvent) => {
      setIsDaemonRunning(status.isRunning);
    });

    // Live SIP logs from daemon
    const cleanupLog = window.pjsip.onLog((logText: string) => {
      setLogs((prev) => [...prev.slice(-200), logText.trim()]);
    });

    // Generic events
    const cleanupEvent = window.pjsip.onEvent((evt) => {
      if (evt.event === 'ready') {
        setIsDaemonRunning(true);
        // Auto-register with saved credentials or defaults if password is present
        try {
          const savedConfig = localStorage.getItem('pjsip_account_config');
          const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_SIP_CONFIG;
          if (config.password && config.password.trim().length > 0) {
            setRegistrationStatus('Registering...');
            window.pjsip?.register(config);
          } else {
            setRegistrationStatus('Enter Password');
          }
        } catch {
          if (DEFAULT_SIP_CONFIG.password) {
            window.pjsip?.register(DEFAULT_SIP_CONFIG);
          }
        }
      }
    });

    return () => {
      cleanupCallState();
      cleanupRegState();
      cleanupAudioDevices();
      cleanupDaemonStatus();
      cleanupLog();
      cleanupEvent();
      stopRinger();
    };
  }, [activeCall]);

  // Softphone Actions
  const handleMakeCall = useCallback((destination: string) => {
    if (!window.pjsip) return;
    window.pjsip.makeCall(destination);
    callStartTimeRef.current = 0;
    // Optimistic active call state
    setActiveCall({
      event: 'call_state',
      call_id: 0,
      state: 'CALLING',
      remote_uri: destination,
    });
  }, []);

  const handleAnswerCall = (callId: number) => {
    stopRinger();
    if (!window.pjsip) return;
    window.pjsip.answerCall(callId);
    callStartTimeRef.current = Date.now();
    if (incomingCall) {
      setActiveCall({
        ...incomingCall,
        state: 'CONFIRMED',
      });
      setIncomingCall(null);
    }
  };

  const handleDeclineCall = (callId: number) => {
    stopRinger();
    if (!window.pjsip) return;
    window.pjsip.hangupCall(callId);
    if (incomingCall) {
      const newRecord: CallRecord = {
        id: Date.now().toString(),
        remote_uri: incomingCall.remote_uri,
        direction: 'inbound',
        status: 'missed',
        duration: 0,
        timestamp: Date.now(),
      };
      setCallHistory((prev) => [newRecord, ...prev.slice(0, 49)]);
    }
    setIncomingCall(null);
  };

  const handleHangup = (callId: number) => {
    stopRinger();
    if (window.pjsip) {
      window.pjsip.hangupCall(callId);
    }
    setActiveCall(null);
  };

  const handleMute = (callId: number, mute: boolean) => {
    window.pjsip?.muteCall(callId, mute);
  };

  const handleHold = (callId: number, hold: boolean) => {
    window.pjsip?.holdCall(callId, hold);
  };

  const handleSendDtmf = (callId: number, digits: string) => {
    window.pjsip?.sendDtmf(callId, digits);
  };

  const handleSaveAndRegister = (config: SipAccountConfig) => {
    localStorage.setItem('pjsip_account_config', JSON.stringify(config));
    setCurrentAccount(config);
    setRegistrationStatus('Registering...');
    window.pjsip?.register(config);
    setIsAccountModalOpen(false);
  };

  const handleUnregister = () => {
    window.pjsip?.unregister();
    setIsAccountModalOpen(false);
  };

  const handleSelectAudioDevices = (captureDev: number, playbackDev: number) => {
    window.pjsip?.setAudioDevice(captureDev, playbackDev);
    setCurrentCaptureDev(captureDev);
    setCurrentPlaybackDev(playbackDev);
  };

  const handleRefreshDevices = () => {
    window.pjsip?.getAudioDevices();
  };

  const handleAddContact = (newContact: Omit<Contact, 'id'>) => {
    const contact: Contact = {
      ...newContact,
      id: Date.now().toString(),
    };
    setContacts((prev) => [contact, ...prev]);
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearHistory = () => {
    setCallHistory([]);
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === 'settings') {
      setIsAccountModalOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="relative flex flex-col md:flex-row h-screen w-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 overflow-hidden select-none transition-colors duration-200">
      {/* Desktop Left Sidebar Rail (hidden in mini mode) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAudioModal={() => {
          window.pjsip?.getAudioDevices();
          setIsAudioModalOpen(true);
        }}
        onOpenLogs={() => setIsLogDrawerOpen(!isLogDrawerOpen)}
        isLogsOpen={isLogDrawerOpen}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* macOS Titlebar & Header */}
        <header className="titlebar-drag flex items-center justify-between px-3 md:px-4 h-12 border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5 pl-16 md:pl-0">
            <h1 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {activeCall ? 'In Call' : activeTab === 'keypad' ? 'Dialer' : activeTab === 'recents' ? 'Recents' : 'Contacts'}
            </h1>
          </div>

          <div className="no-drag flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Live SIP Log Console */}
            <button
              onClick={() => setIsLogDrawerOpen(!isLogDrawerOpen)}
              title="Live SIP Log Console"
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isLogDrawerOpen
                  ? 'bg-brand-600/20 text-brand-600 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4" />
            </button>

            {/* User Profile Badge with Live Presence Indicator */}
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              title={isRegistered ? `Hirak Patel (${presence})` : isDaemonRunning ? registrationStatus || 'Unregistered' : 'Connecting to PJSIP...'}
              className="relative group p-0.5 rounded-xl transition-transform hover:scale-105 cursor-pointer ml-1"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {(currentAccount?.username || 'HP').slice(0, 2).toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  isRegistered
                    ? presence === 'available'
                      ? 'bg-emerald-500 ring-1 ring-emerald-500/40'
                      : presence === 'busy' || presence === 'dnd'
                      ? 'bg-rose-500 ring-1 ring-rose-500/40'
                      : 'bg-amber-400 ring-1 ring-amber-400/40'
                    : registrationStatus.toLowerCase().includes('reg')
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto">
          {activeCall ? (
            <ActiveCall
              callId={activeCall.call_id}
              remoteUri={activeCall.remote_uri}
              state={activeCall.state}
              reason={activeCall.reason}
              lastStatus={activeCall.last_status}
              onHangup={handleHangup}
              onMute={handleMute}
              onHold={handleHold}
              onSendDtmf={handleSendDtmf}
              onOpenAudioModal={() => setIsAudioModalOpen(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col justify-center">
              {activeTab === 'keypad' && (
                <Dialpad
                  onCall={handleMakeCall}
                  callingFrom={`${currentAccount?.username || 'hirakpatel'} (${currentAccount?.server || 'sip.linphone.org'})`}
                  onOpenSettings={() => setIsAccountModalOpen(true)}
                  contacts={contacts}
                  lastCalledNumber={
                    callHistory.length > 0
                      ? callHistory[0].remote_uri.replace(/^sip:/i, '').split('@')[0]
                      : undefined
                  }
                />
              )}

              {activeTab === 'recents' && (
                <CallHistory
                  history={callHistory}
                  onCall={handleMakeCall}
                  onClearHistory={handleClearHistory}
                />
              )}

              {activeTab === 'contacts' && (
                <Contacts
                  contacts={contacts}
                  onCall={handleMakeCall}
                  onAddContact={handleAddContact}
                  onDeleteContact={handleDeleteContact}
                />
              )}
            </div>
          )}
        </main>

        {/* RingCentral & Dialpad Mini Mode Bottom Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenAudioModal={() => {
            window.pjsip?.getAudioDevices();
            setIsAudioModalOpen(true);
          }}
          isRegistered={isRegistered}
        />
      </div>

      {/* Incoming Call Alert Modal */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-emerald-500/40 text-center animate-bounce-subtle bg-white dark:bg-slate-900">
            <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping"></div>
              <div className="relative z-10 flex items-center justify-center w-18 h-18 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-500/40">
                <PhoneIncoming className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Incoming Call</h3>
            <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400 mb-6 truncate">
              {incomingCall.remote_uri.replace(/^sip:/i, '')}
            </p>

            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => handleDeclineCall(incomingCall.call_id)}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={() => handleAnswerCall(incomingCall.call_id)}
                className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white shadow-lg shadow-emerald-500/40 transition-all cursor-pointer"
                title="Answer"
              >
                <Check className="w-8 h-8 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live SIP Log Console Drawer */}
      {isLogDrawerOpen && (
        <div className="absolute bottom-0 inset-x-0 h-64 bg-slate-950/95 border-t border-slate-800 backdrop-blur-xl z-40 flex flex-col shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-mono font-semibold text-slate-300">Live PJSIP / SIP Logs</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono">
                {logs.length} lines
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogs([])}
                title="Clear Logs"
                className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsLogDrawerOpen(false)}
                title="Close Drawer"
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 p-2.5 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 space-y-0.5 selection:bg-indigo-500/30">
            {logs.length === 0 ? (
              <p className="text-slate-500 italic">No logs received yet. SIP events will appear here in real time...</p>
            ) : (
              logs.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-all hover:bg-white/[0.03] px-1 rounded">
                  {line}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Dialpad-style Profile Dropdown Menu */}
      <ProfileMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        displayName="Hirak Patel"
        username={currentAccount?.username || 'hirakpatel'}
        server={currentAccount?.server || 'sip.linphone.org'}
        isRegistered={isRegistered}
        registrationStatus={registrationStatus}
        presence={presence}
        onChangePresence={setPresence}
        onViewProfile={() => setIsAccountModalOpen(true)}
        onSignOut={handleUnregister}
      />

      {/* SIP Account Settings Modal */}
      <SipAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSaveAndRegister={handleSaveAndRegister}
        onUnregister={handleUnregister}
        isRegistered={isRegistered}
        registrationStatus={registrationStatus}
        initialConfig={currentAccount || undefined}
      />

      {/* Audio Device Selection Modal */}
      <AudioDeviceModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        devices={audioDevices}
        currentCaptureDev={currentCaptureDev}
        currentPlaybackDev={currentPlaybackDev}
        onSelectDevices={handleSelectAudioDevices}
        onRefreshDevices={handleRefreshDevices}
      />
    </div>
  );
};
