import React, { useState, useEffect } from 'react';
import MobilisLogo from './MobilisLogo';

interface SplashScreenProps {
    onComplete?: () => void;
    minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
    onComplete,
    minDurationMs = 2500, // Increased slightly to let the animation breathe
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        // Trigger entrance animations shortly after component mounts
        const mountTimer = setTimeout(() => setIsMounted(true), 50);

        const fadeOutTimer = setTimeout(() => {
            setIsFadingOut(true);
        }, minDurationMs - 500); // Start fading out 500ms before completion

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
            className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
                }`}
        >
            <div className="flex flex-col items-center gap-6">
                {/* Logo - Slides up and fades in */}
                <div
                    className={`transform transition-all duration-1000 ease-out ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                        }`}
                >
                    <MobilisLogo size={88} variant="navy" />
                </div>

                {/* Text - Delayed slide up for a staggered effect */}
                <div
                    className={`text-center space-y-1 transform transition-all duration-1000 delay-200 ease-out ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                        }`}
                >
                    <h1 className="text-3xl font-black tracking-[0.3em] text-[#0b3b60] uppercase">
                        Mobilis
                    </h1>
                    <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                        Stellar Micro-Credit & Mobility Infrastructure
                    </p>
                </div>
            </div>

            {/* Smooth Progress Bar */}
            <div
                className={`absolute bottom-16 w-48 h-[3px] bg-slate-100 rounded-full overflow-hidden transition-opacity duration-500 delay-500 ${isMounted && !isFadingOut ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                <div
                    className="h-full bg-[#0b3b60] rounded-full transition-all ease-out"
                    style={{
                        width: isMounted ? '100%' : '0%',
                        // Dynamically match the progress bar duration to the screen's lifespan
                        transitionDuration: `${minDurationMs - 400}ms`
                    }}
                />
            </div>
        </div>
    );
};

export default SplashScreen;