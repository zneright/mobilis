import React, { useState, useEffect } from 'react';
import MobilisLogo from './MobilisLogo';

interface SplashScreenProps {
    onComplete?: () => void;
    minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
    onComplete,
    minDurationMs = 1800,
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        const timer1 = setTimeout(() => {
            setIsFadingOut(true);
        }, minDurationMs - 400);

        const timer2 = setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
        }, minDurationMs);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, [minDurationMs, onComplete]);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${
                isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
        >
            <div className="flex flex-col items-center gap-6 transform transition-transform duration-700 ease-out scale-100 animate-pulse">
                {/* Centered Mobilis Logo */}
                <MobilisLogo size={88} variant="navy" />
                
                <div className="text-center space-y-1">
                    <h1 className="text-2xl font-black tracking-[0.25em] text-[#0b3b60] uppercase">
                        MOBILIS <span className="text-emerald-500">PAY</span>
                    </h1>
                    <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">
                        Stellar Micro-Credit & Payment Infrastructure
                    </p>
                </div>
            </div>

            {/* Bottom minimal progress line */}
            <div className="absolute bottom-12 w-32 h-0.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="w-full h-full bg-[#0b3b60] animate-pulse" />
            </div>
        </div>
    );
};

export default SplashScreen;
