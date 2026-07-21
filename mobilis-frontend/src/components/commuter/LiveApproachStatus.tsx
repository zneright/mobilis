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
        <div className="w-full space-y-2 font-sans">
            {/* Arrival Notice Toast Banner */}
            {arrivalNotice && (
                <div className="p-3 rounded-2xl bg-emerald-500 text-black font-extrabold text-xs shadow-md flex items-center gap-2 animate-bounce">
                    <Bell className="w-4 h-4 flex-shrink-0" />
                    <span>{arrivalNotice}</span>
                </div>
            )}

            {/* Active Approach Floating Glass Card */}
            <div className="p-4 rounded-3xl bg-white/90 dark:bg-[#07090E]/90 border border-emerald-500/30 shadow-md backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-extrabold text-xl">
                            {activeSession.vehicleType === 'Jeepney' ? '🛻' :
                             activeSession.vehicleType === 'UV Express' ? '🚐' :
                             activeSession.vehicleType === 'Bus' ? '🚌' :
                             activeSession.vehicleType === 'E-Vehicle' ? '🚙' :
                             activeSession.vehicleType === 'Motorcycle' ? '🛵' : '🛺'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                                    Driver Accepted Pickup
                                </h3>
                            </div>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                                {activeSession.vehicleType} • {formattedDist} away
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-xs font-mono font-extrabold text-emerald-500 block">
                                {eta}
                            </span>
                            <span className="text-[9px] font-mono text-gray-400 uppercase">ETA</span>
                        </div>

                        <button
                            onClick={handleCommuterCancel}
                            disabled={isCancelling}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-full transition-all"
                            title="Cancel Request"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Auto-Cancel Countdown Bar */}
                <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-[11px] text-gray-500 font-mono">
                    <span className="flex items-center gap-1 text-emerald-500 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Driver En Route
                    </span>
                    <span className="flex items-center gap-1 text-amber-500 font-bold">
                        <Clock className="w-3 h-3 animate-spin" /> Auto-cancels in {formatCountdown(timeLeftSec)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LiveApproachStatus;
