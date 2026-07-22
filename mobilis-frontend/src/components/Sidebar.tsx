import React from 'react';
import { LayoutDashboard, Wallet, History, UserCog, Radio, ShieldCheck, Zap, ShieldAlert, Building2 } from 'lucide-react';
import { rolePill, roleAccentText, roleGlowRing } from './tabs/roleStyleTokens';
import MobilisLogo from './common/MobilisLogo';
import { motion } from 'framer-motion';

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

    // Multi-Colored Rich Role Configurations
    const roleConfig = isSuperAdmin
        ? {
              label: 'SUPER ADMIN',
              dot: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
              Icon: ShieldAlert,
          }
        : isCoopAdmin
        ? {
              label: 'COOPERATIVE ADMIN',
              dot: 'bg-violet-500 shadow-[0_0_8px_#8b5cf6]',
              Icon: Building2,
          }
        : isDriver
        ? {
              label: 'ON-DUTY DRIVER',
              dot: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
              Icon: ShieldCheck,
          }
        : {
              label: 'COMMUTER',
              dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
              Icon: Radio,
          };

    const pillClass = rolePill(role ?? 'commuter');
    const accentClass = roleAccentText(role ?? 'commuter');
    const glowClass = roleGlowRing(role ?? 'commuter');

    const RoleIcon = roleConfig.Icon;

    const tabs = [
        { 
            id: 'hub', 
            label: isSuperAdmin || isCoopAdmin ? 'Command Center' : isCommuter ? 'Radar Discovery' : 'Driver Dashboard', 
            icon: isCommuter ? Radio : LayoutDashboard 
        },
        { id: 'vault', label: isSuperAdmin || isCoopAdmin ? 'Treasury Vault' : 'Digital Wallet', icon: Wallet },
        { id: 'history', label: 'Transaction History', icon: History },
        { id: 'profile', label: 'Profile Settings', icon: UserCog },
    ] as const;

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen border-r border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#07090E]/95 backdrop-blur-2xl transition-all duration-300 relative z-30 font-sans shadow-xl">
            
            {/* Sidebar Header with Brand */}
            <div className="h-16 flex items-center px-6 border-b border-slate-200/80 dark:border-white/10">
                <MobilisLogo size={32} showText />
            </div>

            {/* Role-Based System Role Card */}
            <div className="px-4 pt-6 pb-2">
                <motion.div
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all backdrop-blur-md ${pillClass}`}
                    whileHover={{ scale: 1.02 }}
                >
                    <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold block">System Role</span>
                        <span className="text-xs font-black capitalize block mt-0.5">{roleConfig.label}</span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-black/40 border border-white/20 flex items-center justify-center font-bold text-xs shadow-inner">
                        <RoleIcon className="w-4 h-4" />
                    </div>
                </motion.div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-4 space-y-1.5">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all relative ${
                                isActive
                                    ? `${pillClass} border-l-4 font-black shadow-sm ${glowClass}`
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={`w-4 h-4 transition-colors ${isActive ? accentClass : ''}`} />
                                <span>{tab.label}</span>
                            </div>
                            {isActive && (
                                <span className={`w-2 h-2 rounded-full animate-ping ${roleConfig.dot}`} />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Status Summary */}
            <div className="p-4 border-t border-slate-200/80 dark:border-white/10">
                <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 backdrop-blur-md ${pillClass}`}>
                    <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[10px]">
                        <Zap className="w-3.5 h-3.5 animate-pulse" />
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