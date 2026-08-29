import React from 'react';
import { Bell, X, Zap, Megaphone, Navigation, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { cardRoleStyle, rolePill, roleAccentText, roleCtaBg } from '../tabs/roleStyleTokens';

export interface NotificationItem {
    id: string;
    type: 'fare' | 'broadcast' | 'ride' | 'system';
    title: string;
    message: string;
    timestamp: string;
    amountPhp?: string;
    amountXlm?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    txData?: any;
}

interface NotificationCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
    role: string;
    unreadCount: number;
    allNotifications: NotificationItem[];
    filteredNotifications: NotificationItem[];
    notifCategory: 'all' | 'fare' | 'broadcast' | 'ride' | 'system';
    setNotifCategory: (cat: 'all' | 'fare' | 'broadcast' | 'ride' | 'system') => void;
    readIds: Set<string>;
    markAllAsRead: () => void;
    formatNotifDate: (ts?: unknown) => string;
    onSelectTab: (tab: 'hub' | 'vault' | 'history' | 'profile') => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
    isOpen,
    onClose,
    role,
    unreadCount,
    allNotifications,
    filteredNotifications,
    notifCategory,
    setNotifCategory,
    readIds,
    markAllAsRead,
    formatNotifDate,
    onSelectTab,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in font-sans">
            <div className={`w-full max-w-xl rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-white space-y-5 transition-all ${cardRoleStyle(role)}`}>

                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${rolePill(role)}`}>
                            <Bell className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-xl tracking-tight">Notification Center</h3>
                                {unreadCount > 0 && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white font-mono animate-pulse shadow-md">
                                        {unreadCount} NEW
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-gray-400 font-mono flex items-center gap-1.5 pt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Live Updates
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={markAllAsRead}
                            className={`text-xs font-mono font-bold hover:underline px-2.5 py-1 transition-all ${roleAccentText(role)}`}
                        >
                            Mark Read
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Notification Filter Category Bar */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-mono font-bold">
                    {[
                        { id: 'all', label: `All (${allNotifications.length})` },
                        { id: 'fare', label: '⚡ Fares & Loans' },
                        { id: 'broadcast', label: '📢 System' },
                        { id: 'ride', label: '🛺 Ride Status' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setNotifCategory(tab.id as 'all' | 'fare' | 'broadcast' | 'ride' | 'system')}
                            className={`px-3.5 py-2 rounded-2xl font-bold transition-all border whitespace-nowrap ${notifCategory === tab.id
                                ? `${roleCtaBg(role)} border-transparent shadow-md scale-102 text-white`
                                : 'bg-slate-100 dark:bg-white/[0.05] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:scale-102'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Notifications Feed */}
                <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar font-mono">
                    {filteredNotifications.length > 0 ? (
                        filteredNotifications.map((notif) => {
                            if (!notif) return null;
                            const notifId = notif.id || `notif-${Math.random()}`;
                            const isUnread = !readIds.has(notifId);
                            const notifType = notif.type || 'system';
                            const notifTitle = notif.title || 'Notification';
                            const notifMessage = notif.message || '';
                            const formattedTime = formatNotifDate(notif.timestamp);

                            return (
                                <div
                                    key={notifId}
                                    className={`p-4.5 rounded-2xl border transition-all duration-200 relative ${isUnread
                                        ? 'bg-white dark:bg-[#0f1420] border-cyan-500/50 shadow-md'
                                        : 'bg-slate-50/80 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/[0.06] opacity-90'
                                        }`}
                                >
                                    {isUnread && (
                                        <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shadow-sm" />
                                    )}
                                    <div className="flex items-start justify-between gap-3.5">
                                        <div className="flex items-start gap-3.5">
                                            <div className={`p-3 rounded-2xl border flex-shrink-0 mt-0.5 shadow-sm ${rolePill(role)}`}>
                                                {notifType === 'fare' ? <Zap className="w-5 h-5 text-emerald-500" /> :
                                                    notifType === 'broadcast' || notifType === 'system' ? <Megaphone className="w-5 h-5 text-cyan-500" /> :
                                                        notifType === 'ride' ? <Navigation className="w-5 h-5 text-amber-500" /> :
                                                            <ShieldCheck className="w-5 h-5 text-indigo-500" />}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{notifTitle}</p>
                                                </div>

                                                <p className="text-xs text-slate-600 dark:text-gray-300 font-medium leading-relaxed">{notifMessage}</p>

                                                {/* Prominent Amount Display if Available */}
                                                {notif.amountPhp && (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs mt-1.5 border border-emerald-500/25 shadow-xs">
                                                        <span>₱{notif.amountPhp} PHP</span>
                                                        {notif.amountXlm && <span className="opacity-75">({notif.amountXlm} XLM)</span>}
                                                    </div>
                                                )}

                                                <p className="text-[9px] text-slate-400 font-mono pt-1">
                                                    {formattedTime}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {notifType === 'fare' && (
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        onSelectTab('history');
                                                    }}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm ${roleCtaBg(role)}`}
                                                >
                                                    Receipt
                                                </button>
                                            )}
                                            {notifType === 'ride' && (
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        onSelectTab('hub');
                                                    }}
                                                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm ${roleCtaBg(role)}`}
                                                >
                                                    View Map
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 text-center text-slate-400 font-mono space-y-2.5">
                            <CheckCircle2 className="w-10 h-10 mx-auto opacity-30 text-emerald-500" />
                            <p className="text-xs font-bold">All clear! No notifications in this category.</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => {
                        markAllAsRead();
                        onClose();
                    }}
                    className={`w-full py-4 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl hover:opacity-90 active:scale-98 ${roleCtaBg(role)}`}
                >
                    Done & Dismiss All
                </button>
            </div>
        </div>
    );
};
