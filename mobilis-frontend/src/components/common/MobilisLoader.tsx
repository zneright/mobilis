import React, { useState, useEffect } from 'react';
import MobilisLogo from './MobilisLogo';

interface MobilisLoaderProps {
    message?: string;
    fullScreen?: boolean;
}

const DEFAULT_MESSAGES = [
    'Connecting...',
    'Initializing Mobilis...',
    'Syncing Wallet...',
    'Verifying Identity...',
    'Connecting to Stellar...',
    'Preparing Dashboard...',
    'Loading Secure Session...',
];

export const MobilisLoader: React.FC<MobilisLoaderProps> = ({
    message,
    fullScreen = true,
}) => {
    const [msgIndex, setMsgIndex] = useState(0);
    const [fade, setFade] = useState(true);

    useEffect(() => {
        if (message) return; // Use custom message if provided

        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setMsgIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
                setFade(true);
            }, 300);
        }, 2200);

        return () => clearInterval(interval);
    }, [message]);

    const displayMessage = message || DEFAULT_MESSAGES[msgIndex];

    const content = (
        <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center select-none">
            {/* Animated Monogram Logo Container */}
            <div className="relative flex items-center justify-center">
                {/* Subtle outer pulsing ring */}
                <div className="absolute inset-0 w-24 h-24 rounded-full border border-emerald-500/20 animate-ping opacity-30 pointer-events-none" />
                
                {/* Logo with gentle pulse */}
                <div className="relative z-10 transition-transform duration-500 hover:scale-105">
                    <MobilisLogo size={64} variant="gradient" />
                </div>
            </div>

            {/* Rotating Status Message */}
            <div className="space-y-1">
                <p
                    className={`text-sm font-bold tracking-wider text-gray-700 dark:text-gray-200 transition-opacity duration-300 font-sans ${
                        fade ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                    {displayMessage}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-500">
                    Stellar Soroban Network
                </p>
            </div>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#060610] flex items-center justify-center transition-colors">
                {content}
            </div>
        );
    }

    return content;
};

export default MobilisLoader;
