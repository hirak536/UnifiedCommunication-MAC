import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Pause, Play, PhoneOff, Grid, Volume2, Sparkles } from 'lucide-react';
import { playDtmfTone } from '../utils/audio-tones';

interface ActiveCallProps {
  callId: number;
  remoteUri: string;
  state: string;
  reason?: string;
  lastStatus?: number;
  onHangup: (callId: number) => void;
  onMute: (callId: number, mute: boolean) => void;
  onHold: (callId: number, hold: boolean) => void;
  onSendDtmf: (callId: number, digit: string) => void;
  onOpenAudioModal?: () => void;
}

export const ActiveCall: React.FC<ActiveCallProps> = ({
  callId,
  remoteUri,
  state,
  reason,
  lastStatus,
  onHangup,
  onMute,
  onHold,
  onSendDtmf,
  onOpenAudioModal,
}) => {
  const [seconds, setSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isOnHold, setIsOnHold] = useState<boolean>(false);
  const [showKeypad, setShowKeypad] = useState<boolean>(false);

  // Timer counter starts when call reaches CONFIRMED state
  useEffect(() => {
    let interval: any = null;
    if (state === 'CONFIRMED' && !isOnHold) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state, isOnHold]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMuteToggle = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    onMute(callId, nextMute);
  };

  const handleHoldToggle = () => {
    const nextHold = !isOnHold;
    setIsOnHold(nextHold);
    onHold(callId, nextHold);
  };

  const handleDtmfPress = (digit: string) => {
    playDtmfTone(digit);
    onSendDtmf(callId, digit);
  };

  // Extract display name or number from SIP URI
  const parseCaller = (uri: string) => {
    const clean = uri.replace(/^sip:/i, '');
    const atIdx = clean.indexOf('@');
    return atIdx > 0 ? clean.substring(0, atIdx) : clean;
  };

  const parseDomain = (uri: string) => {
    const clean = uri.replace(/^sip:/i, '');
    const atIdx = clean.indexOf('@');
    return atIdx > 0 ? clean.substring(atIdx + 1) : '';
  };

  return (
    <div className="flex items-center justify-center h-full w-full p-4 select-none animate-fadeIn">
      {/* Centered Dialpad Stage Card */}
      <div className="w-full max-w-sm rounded-3xl p-6 bg-white dark:bg-[#151B28] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col items-center text-center transition-all relative overflow-hidden">
        
        {/* Muted Warning Banner */}
        {isMuted && (
          <div className="w-full mb-3 py-1 px-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 animate-fadeIn">
            <MicOff className="w-3.5 h-3.5" />
            <span>Microphone is muted</span>
          </div>
        )}

        {/* Top domain pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 mb-5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-[11px] font-mono text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>{parseDomain(remoteUri) || 'sip.linphone.org'}</span>
        </div>

        {/* Caller Avatar with Pulse Wave */}
        <div className="relative flex items-center justify-center w-28 h-28 mb-4">
          {state === 'CONFIRMED' && !isOnHold ? (
            <>
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-60"></div>
              <div className="absolute inset-2 rounded-full bg-brand-600/30 animate-pulse"></div>
            </>
          ) : state === 'CALLING' || state === 'CONNECTING' ? (
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-50"></div>
          ) : (
            <div className="absolute inset-0 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></div>
          )}

          <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-xl shadow-brand-500/30">
            <Volume2 className="w-9 h-9" />
          </div>
        </div>

        {/* Caller Information */}
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {parseCaller(remoteUri)}
        </h2>
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[260px]">
          {remoteUri}
        </p>

        {/* State / Duration Pill */}
        <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'DISCONNECTED'
                ? 'bg-rose-500'
                : isOnHold
                ? 'bg-amber-400 animate-pulse'
                : state === 'CONFIRMED'
                ? 'bg-emerald-500 ring-2 ring-emerald-500/30'
                : 'bg-indigo-500 animate-pulse'
            }`}
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {state === 'DISCONNECTED'
              ? reason || (lastStatus ? `Ended (${lastStatus})` : 'Call Ended')
              : isOnHold
              ? 'On Hold'
              : state === 'CONFIRMED'
              ? formatTimer(seconds)
              : state === 'CALLING'
              ? 'Calling...'
              : state === 'EARLY' || state === 'CONNECTING'
              ? 'Ringing...'
              : state}
          </span>
        </div>

        {/* Dynamic Smooth Equalizer Wave Bars */}
        {state === 'CONFIRMED' && !isOnHold ? (
          <div className="flex items-center justify-center gap-1.5 h-8 my-4">
            {[0.1, 0.4, 0.2, 0.6, 0.3, 0.5, 0.2, 0.4, 0.1].map((delay, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-brand-600 to-emerald-400 rounded-full equalizer-bar"
                style={{
                  animationDelay: `${delay}s`,
                  opacity: 0.9,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="h-6 my-3" />
        )}

        {/* In-Call DTMF Keypad Overlay */}
        {showKeypad && (
          <div className="w-full rounded-2xl p-3 mb-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-popIn shadow-inner">
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDtmfPress(d)}
                  className="h-10 rounded-xl bg-white dark:bg-slate-800 hover:bg-brand-600 hover:text-white text-slate-800 dark:text-slate-100 font-semibold active:scale-92 tactile-btn text-base border border-slate-200 dark:border-slate-700/50 shadow-xs cursor-pointer"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dialpad In-Call Action Toolbar */}
        <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around gap-2">
          {/* Mute Button */}
          <button
            onClick={handleMuteToggle}
            title={isMuted ? 'Unmute' : 'Mute'}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl tactile-btn cursor-pointer ${
              isMuted
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[9px] font-medium mt-1">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Hold Button */}
          <button
            onClick={handleHoldToggle}
            title={isOnHold ? 'Resume' : 'Hold'}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl tactile-btn cursor-pointer ${
              isOnHold
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            {isOnHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            <span className="text-[9px] font-medium mt-1">{isOnHold ? 'Resume' : 'Hold'}</span>
          </button>

          {/* Keypad Button */}
          <button
            onClick={() => setShowKeypad((prev) => !prev)}
            title="Dialpad Keypad"
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl tactile-btn cursor-pointer ${
              showKeypad
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 ring-2 ring-brand-500/30'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span className="text-[9px] font-medium mt-1">Keypad</span>
          </button>

          {/* Audio Devices */}
          {onOpenAudioModal && (
            <button
              onClick={onOpenAudioModal}
              title="Audio Output"
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 tactile-btn cursor-pointer"
            >
              <Volume2 className="w-5 h-5" />
              <span className="text-[9px] font-medium mt-1">Audio</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={() => onHangup(callId)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-92 text-white shadow-lg shadow-rose-600/30 tactile-btn cursor-pointer ml-1 ring-2 ring-rose-500/20"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
