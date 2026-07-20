import React from 'react';
import { LayoutDashboard, Wallet, History, UserCog, Radio } from 'lucide-react';
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
        <aside className="hidden md:flex flex-col w-64 h-screen border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#060610] transition-colors duration-300">
            {/* Sidebar Header */}
            <div className="h-20 flex items-center px-6 border-b border-gray-200 dark:border-white/10">
                <MobilisLogo size={32} showText />
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${isActive
                                ? 'bg-emerald-50 dark:bg-[#1a1a24] text-emerald-600 dark:text-emerald-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
};

export default Sidebar;