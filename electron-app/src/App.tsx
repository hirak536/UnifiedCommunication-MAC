import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Volume2, PhoneIncoming, PhoneOff, Check, Cpu } from 'lucide-react';
import { Dialpad } from './components/Dialpad';
import { ActiveCall } from './components/ActiveCall';
import { SipAccountModal } from './components/SipAccountModal';
import { AudioDeviceModal } from './components/AudioDeviceModal';
import {
  SipAccountConfig,
  AudioDevice,
  CallStateEvent,
  RegStateEvent,
  AudioDevicesEvent,
  DaemonStatusEvent,
} from './types/pjsip';
import { startRinger, stopRinger } from './utils/audio-tones';

export const App: React.FC = () => {
  // Application State
  const [isDaemonRunning, setIsDaemonRunning] = useState<boolean>(false);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [registrationStatus, setRegistrationStatus] = useState<string>('Unregistered');
  const [currentAccount, setCurrentAccount] = useState<SipAccountConfig | null>(null);

  // Call State
  const [activeCall, setActiveCall] = useState<CallStateEvent | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallStateEvent | null>(null);

  // Audio Device State
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [currentCaptureDev, setCurrentCaptureDev] = useState<number>(-1);
  const [currentPlaybackDev, setCurrentPlaybackDev] = useState<number>(-2);

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);

  // Load saved credentials on startup
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('pjsip_account_config');
      if (savedConfig) {
        const config: SipAccountConfig = JSON.parse(savedConfig);
        setCurrentAccount(config);
      }
    } catch {}
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
      } else if (state.state === 'DISCONNECTED') {
        stopRinger();
        if (incomingCall && incomingCall.call_id === state.call_id) {
          setIncomingCall(null);
        }
        if (activeCall && activeCall.call_id === state.call_id) {
          setActiveCall(null);
        }
      } else {
        // Outgoing or connected
        stopRinger();
        if (incomingCall && incomingCall.call_id === state.call_id) {
          setIncomingCall(null);
        }
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

    // Generic events
    const cleanupEvent = window.pjsip.onEvent((evt) => {
      if (evt.event === 'ready') {
        setIsDaemonRunning(true);
        // If we have saved credentials, auto-register
        const savedConfig = localStorage.getItem('pjsip_account_config');
        if (savedConfig) {
          try {
            const config = JSON.parse(savedConfig);
            window.pjsip?.register(config);
          } catch {}
        }
      }
    });

    return () => {
      cleanupCallState();
      cleanupRegState();
      cleanupAudioDevices();
      cleanupDaemonStatus();
      cleanupEvent();
      stopRinger();
    };
  }, [activeCall, incomingCall]);

  // Softphone Actions
  const handleMakeCall = useCallback((destination: string) => {
    if (!window.pjsip) return;
    window.pjsip.makeCall(destination);
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
    setIncomingCall(null);
  };

  const handleHangup = (callId: number) => {
    stopRinger();
    if (!window.pjsip) return;
    window.pjsip.hangupCall(callId);
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

  return (
    <div className="relative flex flex-col h-screen w-screen bg-background overflow-hidden select-none">
      {/* Sleek macOS Titlebar / Header */}
      <header className="titlebar-drag flex items-center justify-between px-4 h-12 border-b border-slate-800/80 bg-surface-300/60 backdrop-blur-md z-30">
        {/* Left spacer for macOS traffic lights */}
        <div className="flex items-center gap-2.5 pl-16">
          {/* SIP Registration Status Pill */}
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="no-drag flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100/90 border border-slate-700/60 hover:bg-surface-50 transition-colors shadow-sm cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRegistered
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                  : registrationStatus.toLowerCase().includes('reg')
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-[11px] font-semibold text-slate-300 max-w-[130px] truncate">
              {isRegistered
                ? currentAccount?.username || 'Registered'
                : registrationStatus}
            </span>
          </button>

          {/* PJSIP 2.17 Engine Badge */}
          <div
            title={isDaemonRunning ? 'PJSIP 2.17 Daemon Active' : 'Connecting to PJSIP Daemon...'}
            className="no-drag hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-200/80 border border-slate-700/40 text-[10px] font-mono text-slate-400"
          >
            <Cpu className={`w-3 h-3 ${isDaemonRunning ? 'text-indigo-400' : 'text-slate-500'}`} />
            <span>PJSIP 2.17</span>
          </div>
        </div>

        {/* Action Header Icons */}
        <div className="no-drag flex items-center gap-1.5">
          {/* Audio Devices Modal Trigger */}
          <button
            onClick={() => {
              window.pjsip?.getAudioDevices();
              setIsAudioModalOpen(true);
            }}
            title="Audio Devices"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-surface-100/80 transition-colors cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* SIP Settings Trigger */}
          <button
            onClick={() => setIsAccountModalOpen(true)}
            title="SIP Account Settings"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-surface-100/80 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
        {activeCall ? (
          <ActiveCall
            callId={activeCall.call_id}
            remoteUri={activeCall.remote_uri}
            state={activeCall.state}
            onHangup={handleHangup}
            onMute={handleMute}
            onHold={handleHold}
            onSendDtmf={handleSendDtmf}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full my-auto">
            <Dialpad onCall={handleMakeCall} />
          </div>
        )}
      </main>

      {/* Incoming Call Alert Modal */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-emerald-500/40 text-center animate-bounce-subtle">
            {/* Animated ringing pulse avatar */}
            <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping"></div>
              <div className="relative z-10 flex items-center justify-center w-18 h-18 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-500/40">
                <PhoneIncoming className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-100 mb-1">Incoming Call</h3>
            <p className="text-sm font-mono text-emerald-400 mb-6 truncate">
              {incomingCall.remote_uri.replace(/^sip:/i, '')}
            </p>

            {/* Answer / Decline Buttons */}
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
