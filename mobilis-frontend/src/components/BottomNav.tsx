import React from 'react';
import { LayoutDashboard, Wallet, History, UserCog, Radio } from 'lucide-react';

interface BottomNavProps {
    activeTab: 'hub' | 'vault' | 'history' | 'profile';
    setActiveTab: (tab: 'hub' | 'vault' | 'history' | 'profile') => void;
    role?: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, role }) => {
    const isAdmin = role === 'superadmin' || role === 'admin';
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

    return (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 pointer-events-none flex justify-center">
            <nav className="pointer-events-auto w-full max-w-md bg-slate-900/90 dark:bg-[#060610]/95 backdrop-blur-2xl border border-slate-700/60 dark:border-white/15 rounded-full p-2 shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex items-center justify-around">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center justify-center py-2 px-3 rounded-full transition-all duration-200 active:scale-95 ${
                                isActive
                                    ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(52,211,153,0.5)] font-black'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : 'scale-100'}`} />
                            <span className="text-[9px] font-mono tracking-wider font-bold mt-0.5 uppercase">
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default BottomNav;