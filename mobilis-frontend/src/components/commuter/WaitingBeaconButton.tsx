import React, { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { MapPin, Navigation, Clock, X, Filter } from 'lucide-react';
import { roleCtaBg, rolePill, roleAccentText, cardRoleStyle } from '../tabs/roleStyleTokens';
import { playCommuterChime } from '../../utils/webAudio';

interface WaitingBeaconButtonProps {
    commuterUid: string;
    commuterCoords: { lat: number; lng: number } | null;
    preferredVehicle?: string;
    setPreferredVehicle?: (veh: string) => void;
}

export const WaitingBeaconButton: React.FC<WaitingBeaconButtonProps> = ({
    commuterUid,
    commuterCoords,
    preferredVehicle: propPreferredVehicle,
    setPreferredVehicle: propSetPreferredVehicle,
}) => {
    const [isWaiting, setIsWaiting] = useState<boolean>(false);
    const [internalVehicle, setInternalVehicle] = useState<string>('All');

    const preferredVehicle = propPreferredVehicle !== undefined ? propPreferredVehicle : internalVehicle;
    const setPreferredVehicle = propSetPreferredVehicle || setInternalVehicle;

    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [timeLeftSec, setTimeLeftSec] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const beaconDocRef = doc(db, 'waiting_beacons', commuterUid);

    // Auto-countdown timer for active beacon (10 minute auto-expiration)
    const handleStopWaiting = async () => {
        setIsSubmitting(true);
        try {
            await deleteDoc(beaconDocRef).catch(() => {});
            setIsWaiting(false);
            setExpiresAt(null);
            setTimeLeftSec(0);
        } catch (err) {
            console.error("Failed to stop waiting beacon:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!isWaiting || !expiresAt) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
            setTimeLeftSec(remaining);

            if (remaining <= 0) {
                handleStopWaiting();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isWaiting, expiresAt]);

    const handleStartWaiting = async () => {
        if (!commuterUid || !commuterCoords) return;
        setIsSubmitting(true);

        try {
            const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 Minutes
            await setDoc(beaconDocRef, {
                commuterUid,
                lat: commuterCoords.lat,
                lng: commuterCoords.lng,
                active: true,
                preferredVehicleType: preferredVehicle,
                createdAt: new Date().toISOString(),
                expiresAt: expirationTime.toISOString(),
            });

            playCommuterChime();
            setExpiresAt(expirationTime);
            setTimeLeftSec(600);
            setIsWaiting(true);
        } catch (err) {
            console.error("Failed to start waiting beacon:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    };

    return (
        <div className="w-full space-y-3 font-sans">
            
            {/* Preferred Transport Target Pills */}
            {!isWaiting && (
                <div className="p-3 bg-white/90 dark:bg-[#07090E]/90 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xs backdrop-blur-md space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-gray-300">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-slate-500 font-mono">
                            <Filter className={`w-3 h-3 ${roleAccentText('commuter')}`} /> Filter Vehicle:
                        </span>
                        <span className={`font-mono text-xs font-bold ${roleAccentText('commuter')}`}>{preferredVehicle}</span>
                    </div>

                    <div
                        onWheel={(e) => {
                            if (e.deltaY !== 0) {
                                e.currentTarget.scrollLeft += e.deltaY;
                            }
                        }}
                        className="flex items-center gap-1.5 overflow-x-auto sm:flex-wrap pb-1 scrollbar-none [::-webkit-scrollbar]:hidden text-xs font-bold touch-pan-x"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {[
                            { label: 'All Vehicles', value: 'All' },
                            { label: '🛻 Traditional Jeepney', value: 'Jeepney' },
                            { label: '⚡🚍 Modern E-Jeepney', value: 'E-Jeepney' },
                            { label: '🛺 Tricycle', value: 'Tricycle' },
                            { label: '⚡🛺 E-Trike', value: 'E-Trike' },
                            { label: '🚐 UV Express', value: 'UV Express' },
                            { label: '🚌 Bus', value: 'Bus' },
                        ].map((item) => (
                            <button
                                key={item.value}
                                onClick={() => setPreferredVehicle(item.value)}
                                className={`px-3 py-1.5 rounded-xl border transition-all text-center whitespace-nowrap flex-shrink-0 ${
                                    preferredVehicle === item.value
                                        ? `${roleCtaBg('commuter')} border-transparent shadow-xs text-white`
                                        : 'bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-gray-400'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isWaiting ? (
                <div className={`p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs backdrop-blur-md ${cardRoleStyle('commuter')}`}>
                    <div className="flex items-center gap-3 text-center sm:text-left">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0 border ${rolePill('commuter')}`}>
                            <Navigation className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                    Commuter Signal Active ({preferredVehicle})
                                </h4>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 font-mono">
                                <Clock className={`w-3 h-3 ${roleAccentText('commuter')}`} /> Expires in <strong className={`font-mono ${roleAccentText('commuter')}`}>{formatTime(timeLeftSec)}</strong>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleStopWaiting}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                    >
                        <X className="w-3.5 h-3.5" /> Cancel Signal
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleStartWaiting}
                    disabled={isSubmitting || !commuterCoords}
                    className={`w-full py-3.5 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 text-white ${roleCtaBg('commuter')}`}
                >
                    <MapPin className="w-4 h-4" /> BROADCAST PASSENGER BEACON ({preferredVehicle})
                </button>
            )}
        </div>
    );
};

export default WaitingBeaconButton;
