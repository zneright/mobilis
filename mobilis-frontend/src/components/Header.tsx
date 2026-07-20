import React from 'react';
import { Sun, Moon, Bell, ShieldCheck, Zap } from 'lucide-react';
import MobilisLogo from './common/MobilisLogo';

interface HeaderProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    onSignOut?: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
    return (
        <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-[#090A0C]/80 backdrop-blur-2xl border-b border-gray-200/60 dark:border-white/10 transition-all duration-300 h-16 sm:h-20 flex items-center px-4 sm:px-8">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between">

                {/* Left: Mobile Brand & Network Live Indicator */}
                <div className="flex items-center gap-3">
                    <div className="md:hidden flex items-center gap-2">
                        <MobilisLogo size={32} showText />
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>STELLAR TESTNET LIVE</span>
                    </div>
                </div>

                {/* Right: Notification Bell, Network Badge & Theme Toggle */}
                <div className="flex items-center gap-2 sm:gap-3">
                    
                    {/* Instant Settlement Badge */}
                    <div className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono font-bold text-cyan-400">
                        <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        <span>Instant Settlement</span>
                    </div>

                    {/* Notification Bell Indicator */}
                    <button 
                        className="relative p-2.5 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                        title="Notifications"
                    >
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#090A0C]" />
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;