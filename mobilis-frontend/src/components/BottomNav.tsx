import React from 'react';
import { LayoutDashboard, Wallet, History, UserCog, Radio } from 'lucide-react';
import { roleAccentText, rolePill } from './tabs/roleStyleTokens';

interface BottomNavProps {
    activeTab: 'hub' | 'vault' | 'history' | 'profile';
    setActiveTab: (tab: 'hub' | 'vault' | 'history' | 'profile') => void;
    role?: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, role }) => {
    const isDriver = role === 'driver';
    const isSuperAdmin = role === 'superadmin';
    const isCoopAdmin = role === 'admin' || role === 'cooperative';
    const isCommuter = !isDriver && !isSuperAdmin && !isCoopAdmin;

    const tabs: {
        readonly id: 'hub' | 'vault' | 'history' | 'profile';
        readonly label: string;
        readonly icon: React.ComponentType<{ className?: string }>;
    }[] = [
        { id: 'hub', label: isSuperAdmin || isCoopAdmin ? 'Command' : isCommuter ? 'Radar' : 'Dashboard', icon: isCommuter ? Radio : LayoutDashboard },
        { id: 'vault', label: isSuperAdmin || isCoopAdmin ? 'Treasury' : 'Wallet', icon: Wallet },
        { id: 'history', label: 'Transactions', icon: History },
        { id: 'profile', label: 'Profile', icon: UserCog },
    ] as const;

    const userRole = isSuperAdmin ? 'superadmin' : isCoopAdmin ? 'admin' : isDriver ? 'driver' : 'commuter';
    const activeColorClass = `${roleAccentText(userRole)} font-bold`;

    const activeDotClass = isSuperAdmin
        ? 'bg-rose-500'
        : isCoopAdmin
        ? 'bg-indigo-500'
        : isDriver
        ? 'bg-cyan-500'
        : 'bg-emerald-500';

    return (
        <div className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 max-w-md mx-auto transition-all duration-300 font-sans">
            <nav className="h-16 rounded-3xl bg-white/85 dark:bg-[#07090E]/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] flex items-center justify-around px-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex flex-col items-center justify-center w-16 py-1.5 transition-all duration-200 ease-out active:scale-95 ${
                                isActive
                                    ? activeColorClass
                                    : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                        >
                            {isActive && (
                                <span className={`absolute inset-0 rounded-2xl opacity-15 border ${rolePill(userRole)}`} />
                            )}
                            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} />
                            <span className="text-[10px] font-mono tracking-tight font-bold mt-0.5 uppercase">
                                {tab.label}
                            </span>
                            {isActive && (
                                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 animate-pulse ${activeDotClass}`} />
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default BottomNav;