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

    const headerAtmosphereClass = isDriver
        ? 'bg-gray-900/90 text-white border-amber-500/30 backdrop-blur-xl shadow-lg'
        : isAdmin
        ? 'bg-slate-100/90 dark:bg-[#07090E]/90 text-slate-800 dark:text-white border-indigo-500/20 backdrop-blur-xl shadow-sm'
        : 'bg-white/85 dark:bg-[#07090E]/85 text-slate-900 dark:text-white border-emerald-500/20 backdrop-blur-xl shadow-md';

    return (
        <header className={`fixed top-3 left-4 right-4 max-w-5xl mx-auto z-50 rounded-full transition-all duration-300 h-14 px-5 flex items-center justify-between border font-sans ${headerAtmosphereClass}`}>
            {/* Left: Brand & Dynamic Role Indicator */}
            <div className="flex items-center gap-3">
                <MobilisLogo size={28} showText />
                
                {/* Role-Based Pill Badge */}
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wide border transition-all duration-200 ${
                    isDriver
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : isAdmin
                        ? 'bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
                        isDriver ? 'bg-amber-400' : isAdmin ? 'bg-indigo-500' : 'bg-emerald-500'
                    }`} />
                    {isDriver ? <Navigation className="w-3 h-3 text-cyan-400" /> : isAdmin ? <Building2 className="w-3 h-3 text-indigo-400" /> : <Radio className="w-3 h-3 text-emerald-500" />}
                    <span>{isDriver ? 'DRIVER HUD COCKPIT' : isAdmin ? 'COOP COMMAND CENTER' : 'COMMUTER TRANSIT'}</span>
                </div>
            </div>

            {/* Right: Actions & Controls */}
            <div className="flex items-center gap-2">
                <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${
                    isDriver
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                        : isAdmin
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                    <ShieldCheck className={`w-3 h-3 ${isDriver ? 'text-cyan-400' : 'text-emerald-500'}`} />
                    <span>STELLAR TESTNET</span>
                </div>

                {/* Notification Bell */}
                <button 
                    onClick={onOpenNotifications}
                    className="relative p-2 rounded-full bg-gray-100/80 dark:bg-white/10 text-gray-700 dark:text-gray-200 transition-all duration-200 ease-out hover:brightness-110 active:scale-[0.96]"
                    title="Notification Center"
                >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                        <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#07090E] animate-pulse ${
                            isDriver ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                    )}
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-gray-100/80 dark:bg-white/10 text-gray-700 dark:text-gray-200 transition-all duration-200 ease-out hover:brightness-110 active:scale-[0.96]"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                </button>
            </div>
        </header>
    );
};

export default Header;