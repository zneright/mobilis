import React from 'react';
import { Sun, Moon, Bell, ShieldCheck, Navigation, Radio, Building2 } from 'lucide-react';
import MobilisLogo from './common/MobilisLogo';

interface HeaderProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    onSignOut?: () => void;
    onOpenNotifications?: () => void;
    unreadCount?: number;
    role?: string;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onOpenNotifications, unreadCount = 2, role }) => {
    const isDriver = role === 'driver';
    const isAdmin = role === 'superadmin' || role === 'admin' || role === 'cooperative';

    return (
        <header className="fixed top-3 left-4 right-4 max-w-5xl mx-auto z-50 bg-white/85 dark:bg-[#07090E]/85 backdrop-blur-md rounded-full shadow-md border border-gray-100 dark:border-white/10 transition-all h-14 px-5 flex items-center justify-between font-sans">
            {/* Left: Brand & Dynamic Role Indicator */}
            <div className="flex items-center gap-3">
                <MobilisLogo size={28} showText />
                
                {/* Role-Based Pill Badge */}
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wide border transition-colors ${
                    isDriver
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                        : isAdmin
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
                        isDriver ? 'bg-cyan-500' : isAdmin ? 'bg-indigo-500' : 'bg-emerald-500'
                    }`} />
                    {isDriver ? <Navigation className="w-3 h-3" /> : isAdmin ? <Building2 className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
                    <span>{isDriver ? 'DRIVER COCKPIT' : isAdmin ? 'COOP TREASURY' : 'COMMUTER TRANSIT'}</span>
                </div>
            </div>

            {/* Right: Actions & Controls */}
            <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>STELLAR TESTNET</span>
                </div>

                {/* Notification Bell */}
                <button 
                    onClick={onOpenNotifications}
                    className="relative p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95"
                    title="Notification Center"
                >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#07090E] animate-pulse" />
                    )}
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                </button>
            </div>
        </header>
    );
};

export default Header;