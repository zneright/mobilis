import React from 'react';
import { Sun, Moon, Bell, ShieldCheck, Zap } from 'lucide-react';
import MobilisLogo from './common/MobilisLogo';

interface HeaderProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    onSignOut?: () => void;
    onOpenNotifications?: () => void;
    unreadCount?: number;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onOpenNotifications, unreadCount = 2 }) => {
    return (
        <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#090A0C]/85 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/10 transition-all duration-300 h-16 sm:h-20 flex items-center px-4 sm:px-8">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between">

                {/* Left: Mobile Brand & Network Live Indicator */}
                <div className="flex items-center gap-3">
                    <div className="md:hidden flex items-center gap-2">
                        <MobilisLogo size={32} showText />
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-bold tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>STELLAR TESTNET LIVE</span>
                    </div>
                </div>

                {/* Right: Notification Bell, Network Badge & Theme Toggle */}
                <div className="flex items-center gap-2 sm:gap-3">
                    
                    {/* Instant Settlement Badge */}
                    <div className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        <Zap className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 animate-pulse" />
                        <span>Instant Settlement</span>
                    </div>

                    {/* Notification Bell Indicator */}
                    <button 
                        onClick={onOpenNotifications}
                        className="relative p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
                        title="Notification Center"
                    >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-cyan-500 dark:bg-cyan-400 ring-2 ring-white dark:ring-[#090A0C] animate-pulse" />
                        )}
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;