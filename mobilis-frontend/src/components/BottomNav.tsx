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
        { id: 'hub', label: isAdmin ? 'Command' : isCommuter ? 'Radar' : 'Control', icon: isCommuter ? Radio : LayoutDashboard },
        { id: 'vault', label: isAdmin ? 'Treasury' : 'Wallet', icon: Wallet },
        { id: 'history', label: 'Ledger', icon: History },
        { id: 'profile', label: 'Profile', icon: UserCog },
    ] as const;

    const navAtmosphereClass = 'bg-white/95 dark:bg-[#07090E]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white shadow-lg';

    const activeColorClass = isDriver
        ? 'text-cyan-500 dark:text-cyan-400 font-bold'
        : isAdmin
        ? 'text-indigo-600 dark:text-indigo-400 font-bold'
        : 'text-emerald-500 dark:text-emerald-400 font-bold';

    const activeDotClass = isDriver
        ? 'bg-cyan-500'
        : isAdmin
        ? 'bg-indigo-600 dark:bg-indigo-400'
        : 'bg-emerald-500';

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-50 w-full pb-safe transition-all duration-300 font-sans ${navAtmosphereClass}`}>
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
                                    : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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