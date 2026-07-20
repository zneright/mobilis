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
        <aside className="hidden md:flex flex-col w-72 h-screen border-r border-gray-200/50 dark:border-white/10 bg-white/90 dark:bg-[#060610]/95 backdrop-blur-2xl transition-all duration-300 relative z-30">
            
            {/* Sidebar Header with Brand */}
            <div className="h-20 flex items-center px-6 border-b border-gray-200/50 dark:border-white/10">
                <MobilisLogo size={36} showText />
            </div>

            {/* Role Badge */}
            <div className="px-6 pt-6 pb-2">
                <div className="p-3 bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 rounded-2xl flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest font-black block">System Role</span>
                        <span className="text-xs font-black capitalize text-gray-900 dark:text-white block">{role || 'User'}</span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-black text-xs">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Navigation Dock Links */}
            <nav className="flex-1 px-4 py-4 space-y-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-extrabold transition-all relative ${
                                isActive
                                    ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(52,211,153,0.35)] scale-[1.02]'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </div>
                            {isActive && (
                                <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Status Card */}
            <div className="p-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-xs text-emerald-400 space-y-2">
                    <div className="flex items-center gap-2 font-black uppercase tracking-wider text-[10px]">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Transport Fintech</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-sans leading-tight">
                        Cashless fare settlement & micro-credit loans backed by Soroban.
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;