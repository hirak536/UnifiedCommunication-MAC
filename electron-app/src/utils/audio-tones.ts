/**
 * Web Audio API synthesized DTMF tones and Ringers
 */

// ITU-T Q.23 standard frequencies
const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

let audioCtx: AudioContext | null = null;
let ringerInterval: any = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play standard DTMF keypad tone for 120ms
 */
export function playDtmfTone(digit: string, durationMs: number = 140): void {
  const freqs = DTMF_FREQS[digit];
  if (!freqs) return;

  try {
    const ctx = getAudioContext();
    const [f1, f2] = freqs;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(f1, ctx.currentTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(f2, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();

    osc1.stop(ctx.currentTime + durationMs / 1000);
    osc2.stop(ctx.currentTime + durationMs / 1000);
  } catch (err) {
    console.warn('Audio tone error:', err);
  }
}

/**
 * Start repeating incoming ringtone
 */
export function startRinger(): void {
  if (ringerInterval) return;

  const playSingleRing = () => {
    try {
      const ctx = getAudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(ctx.currentTime + 1.3);
      osc2.stop(ctx.currentTime + 1.3);
    } catch {}
  };

  playSingleRing();
  ringerInterval = setInterval(playSingleRing, 3500);
}

/**
 * Stop incoming ringtone
 */
export function stopRinger(): void {
  if (ringerInterval) {
    clearInterval(ringerInterval);
    ringerInterval = null;
  }
}

/**
 * Play short notification chime for speaker test
 */
export function playTestChime(): void {
  try {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.1;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch (err) {
    console.warn('Audio chime error:', err);
  }
}
