import React from 'react';
import { LayoutDashboard, Wallet, History, UserCog, Radio } from 'lucide-react';

interface BottomNavProps {
    activeTab: 'hub' | 'vault' | 'history' | 'profile';
    setActiveTab: (tab: 'hub' | 'vault' | 'history' | 'profile') => void;
    role?: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, role }) => {
    const isAdmin = role === 'superadmin' || role === 'admin' || role === 'cooperative';
    const isDriver = role === 'driver';
    const isCommuter = role === 'commuter';

    const tabs: {
        readonly id: 'hub' | 'vault' | 'history' | 'profile';
        readonly label: string;
        readonly icon: React.ComponentType<{ className?: string }>;
    }[] = [
        { id: 'hub', label: isAdmin ? 'Command' : isCommuter ? 'Radar' : 'Cockpit', icon: isCommuter ? Radio : LayoutDashboard },
        { id: 'vault', label: isAdmin ? 'Treasury' : 'Wallet', icon: Wallet },
        { id: 'history', label: 'Ledger', icon: History },
        { id: 'profile', label: 'Profile', icon: UserCog },
    ] as const;

    const navAtmosphereClass = isDriver
        ? 'bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent text-white border-t border-gray-900'
        : isAdmin
        ? 'bg-gradient-to-t from-slate-100 via-slate-100/95 to-transparent text-slate-900 border-t border-slate-200/60 dark:from-[#07090E] dark:via-[#07090E]/95 dark:text-white dark:border-white/10'
        : 'bg-gradient-to-t from-white via-white/95 to-transparent text-slate-900 border-t border-gray-100 dark:from-[#07090E] dark:via-[#07090E]/95 dark:text-white dark:border-white/10';

    const activeColorClass = isDriver
        ? 'text-amber-400 font-bold'
        : isAdmin
        ? 'text-indigo-600 dark:text-indigo-400 font-bold'
        : 'text-emerald-500 font-bold';

    const activeDotClass = isDriver
        ? 'bg-amber-400'
        : isAdmin
        ? 'bg-indigo-600 dark:bg-indigo-400'
        : 'bg-emerald-500';

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-50 w-full pb-safe backdrop-blur-md transition-all duration-300 font-sans ${navAtmosphereClass}`}>
            <nav className="max-w-md mx-auto h-16 flex items-center justify-around px-4">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center justify-center w-16 py-1 transition-all duration-200 ease-out hover:brightness-110 active:scale-[0.96] ${
                                isActive
                                    ? activeColorClass
                                    : isDriver
                                    ? 'text-zinc-500 hover:text-zinc-300'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} />
                            <span className="text-[10px] font-mono tracking-tight font-bold mt-1 uppercase">
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