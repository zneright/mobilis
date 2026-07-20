import React from 'react';
import { Sun, Moon, LogOut, Bell, ShieldCheck, Zap } from 'lucide-react';
import MobilisLogo from './common/MobilisLogo';

interface HeaderProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onSignOut }) => {
    return (
        <header className="sticky top-0 z-40 w-full bg-white/70 dark:bg-[#060610]/70 backdrop-blur-2xl border-b border-gray-200/50 dark:border-white/10 transition-all duration-300 h-20 flex items-center px-4 sm:px-8">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between">

                {/* Mobile Brand & Network Pill */}
                <div className="flex items-center gap-3">
                    <div className="md:hidden flex items-center gap-2">
                        <MobilisLogo size={32} showText />
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-mono font-bold tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <ShieldCheck className="w-3.5 h-3.5" />
                        STELLAR TESTNET LIVE
                    </div>
                </div>

                {/* Right Quick Controls */}
                <div className="flex items-center gap-2 sm:gap-3">
                    
                    {/* Notification Bell */}
                    <button className="relative p-2.5 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#060610]" />
                    </button>

                    {/* Fast Currency Pill */}
                    <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Instant Settlement</span>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    </button>

                    {/* Sign Out Button */}
                    <button
                        onClick={onSignOut}
                        className="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-2xl transition-all font-bold text-xs shadow-sm"
                        title="Sign Out"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;