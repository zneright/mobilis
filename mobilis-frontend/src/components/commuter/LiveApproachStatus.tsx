import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm, calculateETA, formatDistance } from '../../utils/geo';
import { playCommuterChime } from '../../utils/webAudio';
import { Bell, CheckCircle2, Clock, X } from 'lucide-react';
import type { PickupSessionDoc } from '../../types';

interface LiveApproachStatusProps {
    commuterUid: string;
    commuterCoords: { lat: number; lng: number } | null;
}

export const LiveApproachStatus: React.FC<LiveApproachStatusProps> = ({
    commuterUid,
    commuterCoords,
}) => {
    const [activeSession, setActiveSession] = useState<PickupSessionDoc | null>(null);
    const [arrivalNotice, setArrivalNotice] = useState<string | null>(null);
    const [timeLeftSec, setTimeLeftSec] = useState<number>(600); // 10-minute countdown
    const [isCancelling, setIsCancelling] = useState<boolean>(false);
    const triggeredSetRef = useRef<Set<number>>(new Set<number>());

    // Real-time listener for active pickup session
    useEffect(() => {
        if (!commuterUid) return;

        const sessionDocRef = doc(db, 'active_pickup_sessions', `pickup_${commuterUid}`);
        const unsubscribe = onSnapshot(sessionDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as PickupSessionDoc;
                if (data.status !== 'completed' && data.status !== 'cancelled') {
                    setActiveSession(data);
                } else {
                    setActiveSession(null);
                }
            } else {
                setActiveSession(null);
            }
        });

        return () => unsubscribe();
    }, [commuterUid]);

    // 10-Minute Auto-Cancellation Countdown Timer
    useEffect(() => {
        if (!activeSession) return;

        const acceptedTime = activeSession.acceptedAt
            ? new Date(activeSession.acceptedAt).getTime()
            : Date.now();
        const expirationTime = acceptedTime + 10 * 60 * 1000; // 10 Minutes after acceptance

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expirationTime - Date.now()) / 1000));
            setTimeLeftSec(remaining);

            if (remaining <= 0) {
                handleAutoCancelTimeout();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [activeSession]);

    // Proximity arrival alerts (200m, 100m, 50m, 10m)
    useEffect(() => {
        if (!activeSession || !commuterCoords || typeof activeSession.driverLat !== 'number') return;

        const distKm = calculateDistanceKm(
            commuterCoords.lat,
            commuterCoords.lng,
            activeSession.driverLat,
            activeSession.driverLng
        );
        const distMeters = Math.round(distKm * 1000);

        let msg = '';
        let threshold = 0;

        if (distMeters <= 10 && !triggeredSetRef.current.has(10)) {
            threshold = 10;
            msg = '📳 Driver Has Arrived at Your Pickup Point!';
        } else if (distMeters <= 50 && !triggeredSetRef.current.has(50)) {
            threshold = 50;
            msg = '🔔 50m: Please prepare to board!';
        } else if (distMeters <= 100 && !triggeredSetRef.current.has(100)) {
            threshold = 100;
            msg = '🔔 100m: Driver is almost there!';
        } else if (distMeters <= 200 && !triggeredSetRef.current.has(200)) {
            threshold = 200;
            msg = '🔔 200m: Vehicle approaching!';
        }

        if (threshold > 0) {
            triggeredSetRef.current.add(threshold);
            playCommuterChime();
            setArrivalNotice(msg);
            setTimeout(() => setArrivalNotice(null), 6000);
        }
    }, [activeSession, commuterCoords]);

    const handleAutoCancelTimeout = async () => {
        if (!activeSession || !commuterUid) return;

        try {
            await setDoc(doc(db, 'active_pickup_sessions', activeSession.id), {
                status: 'cancelled',
                cancelledBy: 'auto_timeout_10m',
                cancelReason: 'Driver did not arrive within 10 minutes',
                updatedAt: new Date().toISOString(),
            }, { merge: true }).catch(() => {});

            await deleteDoc(doc(db, 'waiting_beacons', commuterUid)).catch(() => {});
            setActiveSession(null);
        } catch (err) {
            console.error("Auto cancel timeout error:", err);
        }
    };

    const handleCommuterCancel = async () => {
        if (!activeSession || !commuterUid) return;
        setIsCancelling(true);

        try {
            await setDoc(doc(db, 'active_pickup_sessions', activeSession.id), {
                status: 'cancelled',
                cancelledBy: 'commuter',
                cancelReason: 'Cancelled by commuter',
                updatedAt: new Date().toISOString(),
            }, { merge: true });

            await deleteDoc(doc(db, 'waiting_beacons', commuterUid)).catch(() => {});
            setActiveSession(null);
        } catch (err) {
            console.error("Commuter cancel error:", err);
        } finally {
            setIsCancelling(false);
        }
    };

    if (!activeSession) return null;

    const distKm = commuterCoords && typeof activeSession.driverLat === 'number'
        ? calculateDistanceKm(commuterCoords.lat, commuterCoords.lng, activeSession.driverLat, activeSession.driverLng)
        : 0.15;
    const eta = calculateETA(distKm);
    const formattedDist = formatDistance(distKm);

    const formatCountdown = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    };

    return (
        <div className="w-full space-y-3">
            {/* Arrival Notice Toast Banner */}
            {arrivalNotice && (
                <div className="p-4 rounded-2xl bg-cyan-500 text-black font-black text-xs shadow-[0_0_25px_rgba(0,210,255,0.6)] flex items-center gap-2.5 animate-bounce">
                    <Bell className="w-5 h-5 flex-shrink-0" />
                    <span>{arrivalNotice}</span>
                </div>
            )}

            {/* Active Approach Card */}
            <div className="p-6 rounded-[2.5rem] bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 border border-emerald-500/40 shadow-2xl space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-black text-2xl shadow-lg">
                            {activeSession.vehicleType === 'Jeepney' ? '🛻' :
                             activeSession.vehicleType === 'UV Express' ? '🚐' :
                             activeSession.vehicleType === 'Bus' ? '🚌' :
                             activeSession.vehicleType === 'E-Vehicle' ? '🚙' :
                             activeSession.vehicleType === 'Motorcycle' ? '🛵' : '🛺'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                <h3 className="font-black text-base text-slate-900 dark:text-white">
                                    Driver Accepted Pickup
                                </h3>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-gray-300 font-mono mt-0.5">
                                {activeSession.vehicleType} • {formattedDist} away
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <span className="text-sm font-mono font-black text-emerald-500 block">
                                {eta}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Live Approach</span>
                        </div>

                        {/* Commuter Cancel Ride Button */}
                        <button
                            onClick={handleCommuterCancel}
                            disabled={isCancelling}
                            className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5"
                        >
                            <X className="w-4 h-4" />
                            <span>{isCancelling ? 'Cancelling...' : 'Cancel Request'}</span>
                        </button>
                    </div>
                </div>

                {/* Auto-Cancel Countdown Bar & Verification */}
                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-gray-400 font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Driver En Route to Your Pickup Spot
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Clock className="w-3.5 h-3.5 animate-spin" /> Auto-cancels in {formatCountdown(timeLeftSec)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LiveApproachStatus;
