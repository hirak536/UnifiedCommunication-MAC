import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Phone, Delete, Hash, ChevronDown, User, RotateCcw } from 'lucide-react';
import { playDtmfTone } from '../utils/audio-tones';
import { Contact } from '../types/pjsip';

interface DialpadProps {
  onCall: (destination: string) => void;
  disabled?: boolean;
  callingFrom?: string;
  onOpenSettings?: () => void;
  contacts?: Contact[];
  lastCalledNumber?: string;
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

export const Dialpad: React.FC<DialpadProps> = ({
  onCall,
  disabled = false,
  callingFrom = 'hirakpatel',
  onOpenSettings,
  contacts = [],
  lastCalledNumber,
}) => {
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

  // Autocomplete suggestions matching input
  const matchingContacts = useMemo(() => {
    if (!inputNumber.trim() || contacts.length === 0) return [];
    const query = inputNumber.trim().toLowerCase();
    return contacts
      .filter(
        (c) =>
          c.number.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query)
      )
      .slice(0, 3);
  }, [inputNumber, contacts]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    <div className="flex flex-col items-center w-full max-w-sm mx-auto select-none animate-fadeIn">
      {/* Dialpad "Calling from" Picker Badge */}
      <div className="flex items-center justify-center mb-3">
        <button
          onClick={onOpenSettings}
          title="Change Caller ID / Account"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors cursor-pointer shadow-xs"
        >
          <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal">Call as:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{callingFrom}</span>
          <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
        </button>
      </div>

      {/* Destination Display Input */}
      <div className="w-full mb-3">
        <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
          <input
            type="text"
            value={inputNumber}
            onChange={(e) => setInputNumber(e.target.value)}
            placeholder="Dial a name or number..."
            className="w-full bg-transparent text-2xl font-mono text-center text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none pr-8 tracking-wider"
          />
          {inputNumber && (
            <button
              onClick={handleBackspace}
              onDoubleClick={handleClear}
              title="Click: Backspace | Double-click: Clear"
              className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Delete className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Contact Matching Popup */}
      {matchingContacts.length > 0 && (
        <div className="w-full mb-3 p-1.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 shadow-md animate-popIn">
          {matchingContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setInputNumber(contact.number)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{contact.name}</div>
                  <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{contact.number}</div>
                </div>
              </div>
              <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/40">
                Select
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Quick Redial Pill when empty */}
      {!inputNumber && lastCalledNumber && (
        <div className="w-full flex justify-center mb-3 animate-fadeIn">
          <button
            onClick={() => setInputNumber(lastCalledNumber)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 bg-slate-100 dark:bg-slate-800/70 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span>
              Redial: <strong className="font-mono text-slate-700 dark:text-slate-300">{lastCalledNumber}</strong>
            </span>
          </button>
        </div>
      )}

      {/* Dialpad 3x4 Grid */}
      <div className="grid grid-cols-3 gap-3 w-full mb-6">
        {KEYPAD_BUTTONS.map(({ digit, subtext }) => (
          <button
            key={digit}
            onClick={() => handleDigitPress(digit)}
            disabled={disabled}
            className="group flex flex-col items-center justify-center h-16 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-700 active:scale-92 active:bg-brand-50 dark:active:bg-brand-950/30 tactile-btn shadow-xs cursor-pointer"
          >
            <span className="text-2xl font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 leading-none transition-colors">
              {digit === '#' ? <Hash className="w-5 h-5 mx-auto" /> : digit}
            </span>
            {subtext ? (
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 mt-1 tracking-widest uppercase">
                {subtext}
              </span>
            ) : (
              <span className="text-[10px] h-[14px] mt-1"></span>
            )}
          </button>
        ))}
      </div>

      {/* Dialpad Signature Round Call Action */}
      <div className="flex justify-center w-full">
        <button
          onClick={() => handleCallSubmit()}
          disabled={disabled || !inputNumber.trim()}
          className={`relative flex items-center justify-center w-16 h-16 rounded-full shadow-lg tactile-btn ${
            inputNumber.trim() && !disabled
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 animate-pulseGlow cursor-pointer ring-4 ring-emerald-500/20'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-750 cursor-not-allowed'
          }`}
          title="Place Call"
        >
          <Phone className="w-7 h-7 fill-current" />
        </button>
      </div>
    </div>
  );
};
