import React, { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { MapPin, Navigation, Clock, X, Filter } from 'lucide-react';
import { playCommuterChime } from '../../utils/webAudio';

interface WaitingBeaconButtonProps {
    commuterUid: string;
    commuterCoords: { lat: number; lng: number } | null;
}

export const WaitingBeaconButton: React.FC<WaitingBeaconButtonProps> = ({
    commuterUid,
    commuterCoords,
}) => {
    const [isWaiting, setIsWaiting] = useState<boolean>(false);
    const [preferredVehicle, setPreferredVehicle] = useState<string>('All');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [timeLeftSec, setTimeLeftSec] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const beaconDocRef = doc(db, 'waiting_beacons', commuterUid);

    // Auto-countdown timer for active beacon (10 minute auto-expiration)
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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    };

    return (
        <div className="w-full space-y-4">
            
            {/* Preferred Transport Category Selector (Before starting Wait Mode) */}
            {!isWaiting && (
                <div className="p-4 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 dark:text-gray-300">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider">
                            <Filter className="w-3.5 h-3.5 text-cyan-500" /> Preferred Transport Target:
                        </span>
                        <span className="text-cyan-500">{preferredVehicle}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono font-bold">
                        {[
                            { label: 'All Vehicles', value: 'All', icon: '🚐' },
                            { label: '🛺 Tricycle', value: 'Tricycle' },
                            { label: '🛻 Jeepney', value: 'Jeepney' },
                            { label: '🚐 UV Express', value: 'UV Express' },
                            { label: '🚌 Bus', value: 'Bus' },
                            { label: '🚙 E-Vehicle', value: 'E-Vehicle' },
                            { label: '🛵 Motorcycle', value: 'Motorcycle' },
                        ].map((item) => (
                            <button
                                key={item.value}
                                onClick={() => setPreferredVehicle(item.value)}
                                className={`px-3 py-2 rounded-xl border transition-all text-center whitespace-nowrap ${
                                    preferredVehicle === item.value
                                        ? 'bg-cyan-500 text-black border-cyan-400 font-black shadow-md'
                                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isWaiting ? (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0 border border-emerald-500/30">
                            <Navigation className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                <h4 className="font-black text-base text-slate-900 dark:text-white">
                                    Commuter Beacon Active ({preferredVehicle})
                                </h4>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                                    Anonymous
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-gray-300 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3.5 h-3.5 text-emerald-500" /> Auto-expires in <strong className="text-emerald-500 font-mono">{formatTime(timeLeftSec)}</strong>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleStopWaiting}
                        disabled={isSubmitting}
                        className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition-all"
                    >
                        <X className="w-4 h-4" /> Cancel Waiting Signal
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleStartWaiting}
                    disabled={isSubmitting || !commuterCoords}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-black font-black text-sm rounded-2xl transition-all shadow-[0_0_25px_rgba(52,211,153,0.4)] flex items-center justify-center gap-2.5 hover:scale-[1.02] active:scale-98"
                >
                    <MapPin className="w-5 h-5" /> 🟢 I'M WAITING FOR RIDE ({preferredVehicle})
                </button>
            )}
        </div>
    );
};

export default WaitingBeaconButton;
