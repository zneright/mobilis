import React from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';
import MobilisLogo from './common/MobilisLogo';

interface HeaderProps {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onSignOut }) => {
    return (
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#060610]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 transition-colors duration-300 h-20 flex items-center">
            <div className="w-full px-6 flex items-center justify-between">

                {/* Brand - Hidden on Desktop because Sidebar has it */}
                <div className="md:hidden">
                    <MobilisLogo size={32} showText />
                </div>
                <div className="hidden md:block"></div> {/* Spacer for desktop */}

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={onSignOut}
                        className="flex items-center gap-2 p-2.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all font-bold"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;