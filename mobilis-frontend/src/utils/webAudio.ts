/**
 * Web Audio API Sound Synthesizer & Mobile Haptics
 * Generates clean, distinct notification sounds for Commuters vs Drivers vs Startup.
 */
let audioCtx: AudioContext | null = null;

const SOUND_PREF_KEY = 'mobilis_sound_enabled';

/**
 * Returns true if audio and haptic feedback is enabled (default: true).
 */
export function isSoundEnabled(): boolean {
    try {
        const pref = localStorage.getItem(SOUND_PREF_KEY);
        return pref !== 'false';
    } catch {
        return true;
    }
}

/**
 * Sets user preference for sound and haptic effects.
 */
export function setSoundEnabled(enabled: boolean): void {
    try {
        localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
    } catch {
        // Fallback
    }
}

/**
 * Triggers subtle native mobile vibration haptics on supported devices.
 */
export function triggerHaptic(pattern: number | number[] = [40, 60, 40]): void {
    if (!isSoundEnabled()) return;
    try {
        if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    } catch {
        // Silent fallback on non-vibrating devices
    }
}

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/**
 * Commuter Notification Chime: Soft ambient 2-tone chime (C5 -> G5)
 */
export function playCommuterChime(): void {
    if (!isSoundEnabled()) return;
    try {
        triggerHaptic([30, 40, 30]);
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Note 1: C5 (523.25 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Note 2: G5 (783.99 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(783.99, now + 0.15);
        gain2.gain.setValueAtTime(0.35, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.5);
    } catch (e) {
        console.warn("Audio Context playback error:", e);
    }
}

/**
 * Driver Notification Chime: Upbeat triple-pulse dispatch chime (A5 -> C6 -> E6)
 */
export function playDriverAlertChime(): void {
    if (!isSoundEnabled()) return;
    try {
        triggerHaptic([50, 60, 50]);
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Note 1: A5 (880 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.2);

        // Note 2: C6 (1046.5 Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1046.5, now + 0.1);
        gain2.gain.setValueAtTime(0.35, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.3);

        // Note 3: E6 (1318.51 Hz)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(1318.51, now + 0.2);
        gain3.gain.setValueAtTime(0.4, now + 0.2);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(now + 0.2);
        osc3.stop(now + 0.55);
    } catch (e) {
        console.warn("Audio Context playback error:", e);
    }
}

/**
 * Startup Chime: Ascending futuristic 4-note chord (C5 -> E5 -> G5 -> C6)
 */
export function playStartupChime(): void {
    if (!isSoundEnabled()) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            gain.gain.setValueAtTime(0.3, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.4);
        });
    } catch (e) {
        console.warn("Startup chime error:", e);
    }
}

/**
 * Standard Double Chime (backward compatibility)
 */
export function playDoubleChime(): void {
    playCommuterChime();
}
