import React, { useState, useEffect } from 'react';
import MobilisLogo from './MobilisLogo';

interface MobilisLoaderProps {
    message?: string;
    fullScreen?: boolean;
}

const DEFAULT_MESSAGES = [
    'Initializing Mobilis...',
    'Connecting to Network...',
    'Syncing Wallet...',
    'Preparing Dashboard...',
    'Loading Secure Session...',
    'Finalizing...',
];

export const MobilisLoader: React.FC<MobilisLoaderProps> = ({
    message,
    fullScreen = true,
}) => {
    const [msgIndex, setMsgIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        if (message) return;

        const interval = setInterval(() => {
            setIsFading(true); // Trigger the exit animation

            setTimeout(() => {
                setMsgIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
                setIsFading(false); // Trigger the entrance animation
            }, 500); // Matches the Tailwind duration-500 class
        }, 2500);

        return () => clearInterval(interval);
    }, [message]);

    const displayMessage = message || DEFAULT_MESSAGES[msgIndex];

    const content = (
        <div className="flex flex-col items-center justify-center p-8 space-y-8 text-center select-none">

            {/* Animated Logo & Spinner Container */}
            <div className="relative flex items-center justify-center w-32 h-32">
                {/* Outer slow-spinning dashed ring (Infrastructure) */}
                <div className="absolute inset-0 rounded-full border-[3px] border-dashed border-slate-200 dark:border-slate-800 animate-[spin_8s_linear_infinite]" />

                {/* Inner fast-spinning gradient ring (Active Processing) */}
                <div className="absolute inset-3 rounded-full border-[3px] border-transparent border-t-emerald-500 border-r-emerald-500/40 animate-[spin_1.5s_linear_infinite]" />

                {/* Ambient glowing pulse behind the logo */}
                <div className="absolute inset-6 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 blur-md animate-pulse" />

                {/* Core Logo - Stable to imply security */}
                <div className="relative z-10">
                    <MobilisLogo size={64} variant="navy" />
                </div>
            </div>

            {/* Status Messages Area */}
            <div className="space-y-3 h-14 flex flex-col justify-center">
                {/* Rotating Primary Message */}
                <p
                    className={`text-sm font-bold tracking-wider text-slate-800 dark:text-slate-200 transform transition-all duration-500 ease-out font-sans ${isFading ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'
                        }`}
                >
                    {displayMessage}
                </p>

                {/* Network Sub-label with Live Node Dot */}
                <div className="flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Stellar Soroban Network
                    </p>
                </div>
            </div>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center transition-colors duration-500">
                {content}
            </div>
        );
    }

    return content;
};

export default MobilisLoader;