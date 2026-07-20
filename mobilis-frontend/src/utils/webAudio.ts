/**
 * Web Audio API Sound Synthesizer
 * Generates a clean, modern double chime notification sound without external MP3 files.
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
 * Plays a pleasant double chime (D5 -> A5) for incoming payment alerts.
 */
export function playDoubleChime(): void {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Tone 1: D5 (587.33 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.25);

        // Tone 2: A5 (880.00 Hz) - plays 0.12s later
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, now + 0.12);

        gain2.gain.setValueAtTime(0.4, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(now + 0.12);
        osc2.stop(now + 0.45);
    } catch (err) {
        console.warn('Web Audio chime playback error:', err);
    }
}
