import React, { useState, useEffect, useCallback } from 'react';
import { Phone, Delete, Hash } from 'lucide-react';
import { playDtmfTone } from '../utils/audio-tones';

interface DialpadProps {
  onCall: (destination: string) => void;
  disabled?: boolean;
}

interface KeypadButton {
  digit: string;
  subtext: string;
}

const KEYPAD_BUTTONS: KeypadButton[] = [
  { digit: '1', subtext: '' },
  { digit: '2', subtext: 'ABC' },
  { digit: '3', subtext: 'DEF' },
  { digit: '4', subtext: 'GHI' },
  { digit: '5', subtext: 'JKL' },
  { digit: '6', subtext: 'MNO' },
  { digit: '7', subtext: 'PQRS' },
  { digit: '8', subtext: 'TUV' },
  { digit: '9', subtext: 'WXYZ' },
  { digit: '*', subtext: '' },
  { digit: '0', subtext: '+' },
  { digit: '#', subtext: '' },
];

export const Dialpad: React.FC<DialpadProps> = ({ onCall, disabled = false }) => {
  const [inputNumber, setInputNumber] = useState<string>('');

  const handleDigitPress = useCallback((digit: string) => {
    playDtmfTone(digit);
    setInputNumber((prev) => prev + digit);
  }, []);

  const handleBackspace = () => {
    setInputNumber((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setInputNumber('');
  };

  const handleCallSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNumber = inputNumber.trim();
    if (cleanNumber && !disabled) {
      onCall(cleanNumber);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid capturing when in modal inputs
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (/^[0-9*#]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleCallSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigitPress, inputNumber, disabled]);

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto px-4 py-2 select-none">
      {/* Destination Display Input */}
      <div className="w-full mb-5">
        <div className="relative flex items-center bg-surface-200/80 border border-slate-700/60 rounded-2xl p-2.5 shadow-inner focus-within:border-brand-500/80 transition-all">
          <input
            type="text"
            value={inputNumber}
            onChange={(e) => setInputNumber(e.target.value)}
            placeholder="Enter extension or number..."
            className="w-full bg-transparent text-xl font-mono text-center text-slate-100 placeholder-slate-500 outline-none pr-8 tracking-wider"
          />
          {inputNumber && (
            <button
              onClick={handleBackspace}
              onDoubleClick={handleClear}
              title="Click: Backspace | Double-click: Clear"
              className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-surface-50/50 rounded-lg transition-colors"
            >
              <Delete className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3x4 Keypad Grid */}
      <div className="grid grid-cols-3 gap-3.5 w-full mb-6">
        {KEYPAD_BUTTONS.map(({ digit, subtext }) => (
          <button
            key={digit}
            onClick={() => handleDigitPress(digit)}
            disabled={disabled}
            className="group flex flex-col items-center justify-center h-16 rounded-2xl bg-surface-100/70 border border-slate-700/40 hover:bg-surface-50/80 active:scale-95 active:bg-brand-500/20 active:border-brand-500/60 transition-all duration-150 shadow-sm backdrop-blur-sm"
          >
            <span className="text-2xl font-semibold text-slate-100 group-hover:text-white leading-none">
              {digit === '#' ? <Hash className="w-5 h-5 mx-auto" /> : digit}
            </span>
            {subtext ? (
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-300 mt-1 tracking-widest uppercase">
                {subtext}
              </span>
            ) : (
              <span className="text-[10px] h-[14px] mt-1"></span>
            )}
          </button>
        ))}
      </div>

      {/* Call Trigger Button */}
      <button
        onClick={() => handleCallSubmit()}
        disabled={disabled || !inputNumber.trim()}
        className={`flex items-center justify-center gap-3 w-48 h-14 rounded-full font-semibold text-white shadow-lg transition-all duration-200 ${
          inputNumber.trim() && !disabled
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 shadow-emerald-500/25 cursor-pointer'
            : 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed'
        }`}
      >
        <div className="p-2 bg-white/20 rounded-full">
          <Phone className="w-5 h-5 fill-white text-white" />
        </div>
        <span className="text-base tracking-wide">Call</span>
      </button>
    </div>
  );
};
