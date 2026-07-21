import React from 'react';
import { LayoutDashboard, Wallet, History, UserCog, Radio, ShieldCheck, Zap } from 'lucide-react';
import MobilisLogo from './common/MobilisLogo';

interface SidebarProps {
    activeTab: 'hub' | 'vault' | 'history' | 'profile';
    setActiveTab: (tab: 'hub' | 'vault' | 'history' | 'profile') => void;
    role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role }) => {
    const isAdmin = role === 'superadmin' || role === 'admin';
    const isCommuter = role === 'commuter';

    const tabs = [
        { 
            id: 'hub', 
            label: isAdmin ? 'Command Center' : isCommuter ? 'Radar Discovery' : 'Control Hub', 
            icon: isCommuter ? Radio : LayoutDashboard 
        },
        { id: 'vault', label: isAdmin ? 'Treasury Keys' : 'Digital Wallet', icon: Wallet },
        { id: 'history', label: isCommuter ? 'Transit Ledger' : 'On-Chain Logs', icon: History },
        { id: 'profile', label: 'Profile Settings', icon: UserCog },
    ] as const;

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen border-r border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-[#07090E]/90 backdrop-blur-2xl transition-all duration-300 relative z-30 font-sans">
            
            {/* Sidebar Header with Brand */}
            <div className="h-16 flex items-center px-6 border-b border-slate-200/60 dark:border-white/10">
                <MobilisLogo size={32} showText />
            </div>

            {/* System Role Card */}
            <div className="px-4 pt-6 pb-2">
                <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold block">System Role</span>
                        <span className="text-xs font-bold capitalize text-slate-900 dark:text-white block">{role || 'User'}</span>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                        <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>

            {/* Navigation Dock Links */}
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
                                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-l-2 border-emerald-500 font-extrabold'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </div>
                            {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Status Summary */}
            <div className="p-4 border-t border-slate-200/60 dark:border-white/10">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                        <Zap className="w-3 h-3 text-emerald-500" />
                        <span>Mobilis Protocol</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-tight">
                        Cashless fare settlement & micro-credit loans backed by Soroban.
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;