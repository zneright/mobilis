import React from 'react';
import { LayoutDashboard, Wallet, History, UserCog, Radio, ShieldCheck, Zap, ShieldAlert, Building2 } from 'lucide-react';
import MobilisLogo from './common/MobilisLogo';

interface SidebarProps {
    activeTab: 'hub' | 'vault' | 'history' | 'profile';
    setActiveTab: (tab: 'hub' | 'vault' | 'history' | 'profile') => void;
    role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role }) => {
    const isDriver = role === 'driver';
    const isSuperAdmin = role === 'superadmin';
    const isCoopAdmin = role === 'admin' || role === 'cooperative';
    const isCommuter = !isDriver && !isSuperAdmin && !isCoopAdmin;

    const roleConfig = isSuperAdmin
        ? { label: 'SUPER ADMIN', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30', activeTab: 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-l-2 border-rose-500 font-extrabold', dot: 'bg-rose-500', Icon: ShieldAlert }
        : isCoopAdmin
        ? { label: 'COOPERATIVE ADMIN', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30', activeTab: 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-500 font-extrabold', dot: 'bg-indigo-500', Icon: Building2 }
        : isDriver
        ? { label: 'ON DUTY DRIVER', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', activeTab: 'bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-l-2 border-amber-500 font-extrabold', dot: 'bg-amber-500', Icon: ShieldCheck }
        : { label: 'COMMUTER', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', activeTab: 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-l-2 border-emerald-500 font-extrabold', dot: 'bg-emerald-500', Icon: Radio };

    const RoleIcon = roleConfig.Icon;

    const tabs = [
        { 
            id: 'hub', 
            label: isSuperAdmin || isCoopAdmin ? 'Command Center' : isCommuter ? 'Radar Discovery' : 'Control Cockpit', 
            icon: isCommuter ? Radio : LayoutDashboard 
        },
        { id: 'vault', label: isSuperAdmin || isCoopAdmin ? 'Treasury Vault' : 'Digital Wallet', icon: Wallet },
        { id: 'history', label: isCommuter ? 'Transit Ledger' : 'Transaction History', icon: History },
        { id: 'profile', label: 'Profile Settings', icon: UserCog },
    ] as const;

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen border-r border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-[#07090E]/90 backdrop-blur-2xl transition-all duration-300 relative z-30 font-sans">
            
            {/* Sidebar Header with Brand */}
            <div className="h-16 flex items-center px-6 border-b border-slate-200/60 dark:border-white/10">
                <MobilisLogo size={32} showText />
            </div>

            {/* Role-Based System Role Card */}
            <div className="px-4 pt-6 pb-2">
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${roleConfig.color}`}>
                    <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold block">System Role</span>
                        <span className="text-xs font-black capitalize block mt-0.5">{roleConfig.label}</span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white/40 dark:bg-black/30 flex items-center justify-center font-bold text-xs">
                        <RoleIcon className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all relative ${
                                isActive
                                    ? roleConfig.activeTab
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </div>
                            {isActive && (
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${roleConfig.dot}`} />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Status Summary */}
            <div className="p-4 border-t border-slate-200/60 dark:border-white/10">
                <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${roleConfig.color}`}>
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                        <Zap className="w-3 h-3" />
                        <span>Mobilis Protocol</span>
                    </div>
                    <p className="text-[11px] font-sans leading-tight opacity-90">
                        Cashless fare settlement & micro-credit loans backed by Soroban.
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;