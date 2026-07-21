/**
 * Web Audio API Sound Synthesizer
 * Generates clean, distinct notification sounds for Commuters vs Drivers.
 */
let audioCtx: AudioContext | null = null;

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
 * Triggered when a driver approaches or accepts a commuter's ride beacon.
 */
export function playCommuterChime(): void {
    try {
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
 * Triggered when a passenger is discovered nearby or a driver accepts a pickup.
 */
export function playDriverAlertChime(): void {
    try {
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
 * Standard Double Chime (backward compatibility)
 */
export function playDoubleChime(): void {
    playCommuterChime();
}
