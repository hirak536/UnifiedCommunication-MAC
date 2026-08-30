import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Pause, Play, PhoneOff, Grid, Volume2 } from 'lucide-react';
import { playDtmfTone } from '../utils/audio-tones';

interface ActiveCallProps {
  callId: number;
  remoteUri: string;
  state: string;
  onHangup: (callId: number) => void;
  onMute: (callId: number, mute: boolean) => void;
  onHold: (callId: number, hold: boolean) => void;
  onSendDtmf: (callId: number, digit: string) => void;
}

export const ActiveCall: React.FC<ActiveCallProps> = ({
  callId,
  remoteUri,
  state,
  onHangup,
  onMute,
  onHold,
  onSendDtmf,
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

  return (
    <div className="flex flex-col items-center justify-between h-full w-full max-w-sm mx-auto px-4 py-4 select-none animate-fadeIn">
      {/* Remote Party Header */}
      <div className="flex flex-col items-center mt-2 text-center">
        {/* Caller Avatar / Wave Container */}
        <div className="relative flex items-center justify-center w-28 h-28 mb-4">
          {state === 'CONFIRMED' && !isOnHold ? (
            <>
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping opacity-60"></div>
              <div className="absolute inset-2 rounded-full bg-brand-600/30 animate-pulse"></div>
            </>
          ) : (
            <div className="absolute inset-0 rounded-full bg-slate-800/80 border border-slate-700/60"></div>
          )}

          <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-xl">
            <Volume2 className="w-9 h-9" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          {parseCaller(remoteUri)}
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-[280px]">
          {remoteUri}
        </p>

        {/* State / Duration Pill */}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-100/90 border border-slate-700/60 shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnHold
                ? 'bg-amber-400 animate-pulse'
                : state === 'CONFIRMED'
                ? 'bg-emerald-400'
                : 'bg-indigo-400 animate-pulse'
            }`}
          />
          <span className="text-xs font-semibold text-slate-300">
            {isOnHold
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
      </div>

      {/* Dynamic Audio Visualizer bars */}
      {state === 'CONFIRMED' && !isOnHold && (
        <div className="flex items-center justify-center gap-1.5 h-10 my-2">
          {[40, 75, 100, 60, 85, 45, 90, 65, 30].map((height, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-brand-600 to-emerald-400 rounded-full transition-all duration-300"
              style={{
                height: `${Math.max(8, (height * (1 + Math.sin(Date.now() / 200 + i))) / 2)}px`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      )}

      {/* DTMF Overlay Keypad */}
      {showKeypad && (
        <div className="glass-panel rounded-2xl p-3 my-2 w-full max-w-[280px] shadow-2xl border border-slate-700/80 animate-fadeIn">
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
              <button
                key={d}
                onClick={() => handleDtmfPress(d)}
                className="h-10 rounded-xl bg-surface-200 hover:bg-brand-600 text-slate-100 font-semibold active:scale-95 transition-all text-base border border-slate-700/50"
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Control Action Buttons */}
      <div className="w-full mb-3">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {/* Mute */}
          <button
            onClick={handleMuteToggle}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-150 ${
              isMuted
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                : 'bg-surface-100/70 border-slate-700/50 hover:bg-surface-50 text-slate-300'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5 mb-1" /> : <Mic className="w-5 h-5 mb-1" />}
            <span className="text-xs font-medium">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Hold */}
          <button
            onClick={handleHoldToggle}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-150 ${
              isOnHold
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-400'
                : 'bg-surface-100/70 border-slate-700/50 hover:bg-surface-50 text-slate-300'
            }`}
          >
            {isOnHold ? <Play className="w-5 h-5 mb-1" /> : <Pause className="w-5 h-5 mb-1" />}
            <span className="text-xs font-medium">{isOnHold ? 'Resume' : 'Hold'}</span>
          </button>

          {/* Keypad */}
          <button
            onClick={() => setShowKeypad((prev) => !prev)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-150 ${
              showKeypad
                ? 'bg-brand-500/20 border-brand-500/60 text-brand-400'
                : 'bg-surface-100/70 border-slate-700/50 hover:bg-surface-50 text-slate-300'
            }`}
          >
            <Grid className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Keypad</span>
          </button>
        </div>

        {/* End Call Button */}
        <div className="flex justify-center">
          <button
            onClick={() => onHangup(callId)}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};
