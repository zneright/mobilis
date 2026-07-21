import React, { useEffect } from 'react';
import { Sun, Moon, Bell, ShieldCheck, Navigation, Radio, Building2, ShieldAlert } from 'lucide-react';
import MobilisLogo from './common/MobilisLogo';
import { motion } from 'framer-motion';
import { playCommuterChime, playDriverAlertChime, playStartupChime } from '../utils/webAudio';

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
    const isSuperAdmin = role === 'superadmin';
    const isCoopAdmin = role === 'admin' || role === 'cooperative';

    const roleConfig = isSuperAdmin
        ? { label: 'SUPER ADMIN', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', dot: 'bg-rose-500', Icon: ShieldAlert }
        : isCoopAdmin
        ? { label: 'COOP TREASURY', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30', dot: 'bg-indigo-500', Icon: Building2 }
        : isDriver
        ? { label: 'DRIVER COCKPIT', color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30', dot: 'bg-cyan-500', Icon: Navigation }
        : { label: 'COMMUTER TRANSIT', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500', Icon: Radio };

    // Play role‑specific chime when role changes
    useEffect(() => {
        if (!role) return;
        switch (role) {
            case 'driver':
                playDriverAlertChime();
                break;
            case 'superadmin':
            case 'admin':
            case 'cooperative':
                playStartupChime();
                break;
            default:
                playCommuterChime();
        }
    }, [role]);

    const RoleIcon = roleConfig.Icon;

    return (
        <motion.header className="fixed top-3 left-4 right-4 max-w-5xl mx-auto z-50 rounded-full transition-all duration-300 h-14 px-5 flex items-center justify-between border font-sans bg-white/85 dark:bg-[#07090E]/85 text-slate-900 dark:text-white border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-md" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* Left: Brand & Dynamic Role Indicator */}
            <div className="flex items-center gap-3">
                <MobilisLogo size={28} showText />
                
                {/* Role-Based Pill Badge */}
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wide border transition-all duration-200 ${roleConfig.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-ping ${roleConfig.dot}`} />
                    <RoleIcon className="w-3 h-3" />
                    <span>{roleConfig.label}</span>
                </div>
            </div>

            {/* Right: Actions & Controls */}
            <div className="flex items-center gap-2">
                <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${roleConfig.color}`}>
                    <ShieldCheck className="w-3 h-3" />
                    <span>STELLAR TESTNET</span>
                </div>

                {/* Notification Bell */}
                <button 
                    onClick={onOpenNotifications}
                    className="relative p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-all duration-200 active:scale-95"
                    title="Notification Center"
                >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                        <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#07090E] animate-pulse ${roleConfig.dot}`} />
                    )}
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-all duration-200 active:scale-95"
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                </button>
            </div>
        </motion.header>
    );
};

export default Header;