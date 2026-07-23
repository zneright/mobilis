import React, { useState, useEffect } from 'react';
import MobilisLogo from './MobilisLogo';
import { playStartupChime } from '../../utils/webAudio';
import { Zap } from 'lucide-react';

interface SplashScreenProps {
    onComplete?: () => void;
    minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
    onComplete,
    minDurationMs = 2500,
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        // Trigger startup chime sound & entrance animation
        playStartupChime();

        const mountTimer = setTimeout(() => setIsMounted(true), 50);

        const fadeOutTimer = setTimeout(() => {
            setIsFadingOut(true);
        }, minDurationMs - 500);

        const completeTimer = setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
        }, minDurationMs);

        return () => {
            clearTimeout(mountTimer);
            clearTimeout(fadeOutTimer);
            clearTimeout(completeTimer);
        };
    }, [minDurationMs, onComplete]);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-[#07090E] text-white flex flex-col items-center justify-center transition-all duration-700 ease-in-out font-sans ${
                isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
            }`}
        >
            {/* Background Ambient Glow Circles */}
            <div className="absolute w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-2xl animate-pulse delay-700" />

            <div className="relative z-10 flex flex-col items-center gap-6">
                {/* Logo with Animated Pulsing Ring */}
                <div
                    className={`relative transform transition-all duration-1000 ease-out ${
                        isMounted ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-90'
                    }`}
                >
                    <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-20 blur-md animate-ping" />
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                        <MobilisLogo size={88} variant="white" />
                    </div>
                </div>

                {/* Text - Staggered Slide & Fade */}
                <div
                    className={`text-center space-y-2 transform transition-all duration-1000 delay-200 ease-out ${
                        isMounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                    }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Zap className="w-5 h-5 text-emerald-400 animate-pulse" />
                        <h1 className="text-3xl font-black tracking-[0.25em] text-white uppercase font-mono">
                            Mobilis
                        </h1>
                    </div>
                    <p className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                        Fintech Mobility Super-App
                    </p>
                </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="absolute bottom-12 inset-x-0 max-w-xs mx-auto space-y-2 text-center">
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-[2400ms] ease-out"
                        style={{ width: isMounted ? '100%' : '0%' }}
                    />
                </div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                    Initializing Stellar Smart Contracts...
                </p>
            </div>
        </div>
    );
};

export default SplashScreen;