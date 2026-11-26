/**
 * StopBucks Dojo Zero-Asset Web Audio Sound Engine
 *
 * Synthesizes lightweight tactile audio cues using the browser's Web Audio API.
 * - Zero external audio files.
 * - SSR-safe: never touches window or AudioContext during module load or rendering.
 * - Fails gracefully in unsupported or autoplay-restricted environments.
 */

let sharedAudioContext: AudioContext | null = null;
let lastSliderTickTimestamp = 0;

const SLIDER_TICK_MIN_INTERVAL_MS = 45;

type WebAudioWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const win = window as WebAudioWindow;
  const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }

  try {
    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      sharedAudioContext = new AudioCtx();
    }

    if (sharedAudioContext.state === "suspended") {
      void sharedAudioContext.resume().catch(() => undefined);
    }

    return sharedAudioContext;
  } catch {
    return null;
  }
}

interface ToneOptions {
  frequency: number;
  endFrequency?: number;
  startOffsetSec?: number;
  durationSec: number;
  type?: OscillatorType;
  peakGain: number;
}

function scheduleTone(ctx: AudioContext, options: ToneOptions): void {
  const {
    frequency,
    endFrequency,
    startOffsetSec = 0,
    durationSec,
    type = "sine",
    peakGain,
  } = options;

  try {
    const startTime = ctx.currentTime + startOffsetSec;
    const stopTime = startTime + durationSec;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    if (endFrequency !== undefined && endFrequency > 0) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, stopTime);
    }

    const safePeak = Math.min(0.18, Math.max(0.005, peakGain));
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(safePeak, startTime + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        gainNode.disconnect();
      } catch {
        // Ignore teardown errors
      }
    };

    oscillator.start(startTime);
    oscillator.stop(stopTime + 0.01);
  } catch {
    // Sound generation must never block lesson progression
  }
}

/**
 * Subtle, crisp UI tap click.
 */
export function playTap(muted: boolean): void {
  if (muted) return;
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  scheduleTone(ctx, {
    frequency: 660,
    endFrequency: 420,
    durationSec: 0.04,
    type: "triangle",
    peakGain: 0.05,
  });
}

/**
 * Pleasant two-note marimba/bell chime that rises gently with combo streak.
 */
export function playCorrect(muted: boolean, comboCount: number = 1): void {
  if (muted) return;
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  const safeCombo = Number.isFinite(comboCount) ? Math.max(1, Math.floor(comboCount)) : 1;
  const semitoneSteps = Math.min(7, safeCombo - 1);
  const multiplier = Math.pow(2, semitoneSteps / 12);

  // C5 -> E5 base interval shifted upward cleanly with combo
  scheduleTone(ctx, {
    frequency: 523.25 * multiplier,
    startOffsetSec: 0,
    durationSec: 0.14,
    type: "sine",
    peakGain: 0.075,
  });

  scheduleTone(ctx, {
    frequency: 659.25 * multiplier,
    startOffsetSec: 0.075,
    durationSec: 0.2,
    type: "triangle",
    peakGain: 0.065,
  });
}

/**
 * Gentle, informative low double-thud (never harsh or punitive).
 */
export function playWrong(muted: boolean): void {
  if (muted) return;
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  scheduleTone(ctx, {
    frequency: 196,
    endFrequency: 170,
    startOffsetSec: 0,
    durationSec: 0.085,
    type: "sine",
    peakGain: 0.065,
  });

  scheduleTone(ctx, {
    frequency: 164.81,
    endFrequency: 140,
    startOffsetSec: 0.095,
    durationSec: 0.11,
    type: "sine",
    peakGain: 0.06,
  });
}

/**
 * Ultra-short micro-tick for meaningful slider steps, throttled against rapid drag spam.
 */
export function playSliderTick(muted: boolean): void {
  if (muted) return;
  const now = Date.now();
  if (now - lastSliderTickTimestamp < SLIDER_TICK_MIN_INTERVAL_MS) {
    return;
  }
  lastSliderTickTimestamp = now;

  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  scheduleTone(ctx, {
    frequency: 880,
    endFrequency: 720,
    durationSec: 0.022,
    type: "sine",
    peakGain: 0.03,
  });
}

/**
 * Warm, subtle shimmer triad when the Live Personal Mirror reveals.
 */
export function playMirrorReveal(muted: boolean): void {
  if (muted) return;
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99]; // C5 - E5 - G5
  notes.forEach((frequency, index) => {
    scheduleTone(ctx, {
      frequency,
      startOffsetSec: index * 0.065,
      durationSec: 0.24,
      type: "sine",
      peakGain: 0.045,
    });
  });
}

/**
 * Joyful rising four-note major arpeggio on level completion.
 */
export function playVictory(muted: boolean): void {
  if (muted) return;
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
  notes.forEach((frequency, index) => {
    scheduleTone(ctx, {
      frequency,
      startOffsetSec: index * 0.085,
      durationSec: index === notes.length - 1 ? 0.34 : 0.18,
      type: index === notes.length - 1 ? "triangle" : "sine",
      peakGain: 0.075,
    });
  });
}

/**
 * Resets cached AudioContext state for deterministic unit testing.
 */
export function __resetSoundEngineForTests(): void {
  if (sharedAudioContext && typeof sharedAudioContext.close === "function") {
    try {
      void sharedAudioContext.close();
    } catch {
      // Ignore cleanup failures in mocks
    }
  }
  sharedAudioContext = null;
  lastSliderTickTimestamp = 0;
}
