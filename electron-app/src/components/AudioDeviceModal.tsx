import React, { useState } from 'react';
import { X, Mic, Volume2, Sparkles, RefreshCw, Play } from 'lucide-react';
import { AudioDevice } from '../types/pjsip';
import { playTestChime } from '../utils/audio-tones';

interface AudioDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: AudioDevice[];
  currentCaptureDev: number;
  currentPlaybackDev: number;
  onSelectDevices: (captureDev: number, playbackDev: number) => void;
  onRefreshDevices: () => void;
}

export const AudioDeviceModal: React.FC<AudioDeviceModalProps> = ({
  isOpen,
  onClose,
  devices,
  currentCaptureDev,
  currentPlaybackDev,
  onSelectDevices,
  onRefreshDevices,
}) => {
  const [selectedCapture, setSelectedCapture] = useState<number>(currentCaptureDev);
  const [selectedPlayback, setSelectedPlayback] = useState<number>(currentPlaybackDev);

  if (!isOpen) return null;

  const captureDevices = devices.filter((d) => d.input_count > 0);
  const playbackDevices = devices.filter((d) => d.output_count > 0);

  const handleApply = () => {
    onSelectDevices(selectedCapture, selectedPlayback);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Audio Devices</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Microphone & speaker routing with WebRTC AEC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WebRTC AEC Pill */}
        <div className="flex items-center justify-between px-3.5 py-2.5 mb-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">WebRTC Echo Cancellation</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
            Active
          </span>
        </div>

        <div className="space-y-4">
          {/* Input Device (Microphone) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Mic className="w-3.5 h-3.5 text-slate-400" />
                Microphone (Input)
              </label>
              <button
                type="button"
                onClick={onRefreshDevices}
                title="Refresh device list"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <select
              value={selectedCapture}
              onChange={(e) => setSelectedCapture(Number(e.target.value))}
              className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value={-1} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                Default Microphone (System)
              </option>
              {captureDevices.map((d) => (
                <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {d.name} ({d.driver})
                </option>
              ))}
            </select>
          </div>

          {/* Output Device (Speaker) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                Speakers / Headphones (Output)
              </label>
              <button
                type="button"
                onClick={() => playTestChime()}
                className="flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                <Play className="w-3 h-3 fill-current" />
                Test Chime
              </button>
            </div>

            <select
              value={selectedPlayback}
              onChange={(e) => setSelectedPlayback(Number(e.target.value))}
              className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value={-2} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                Default Speakers (System)
              </option>
              {playbackDevices.map((d) => (
                <option key={d.id} value={d.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {d.name} ({d.driver})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 transition-all cursor-pointer"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
