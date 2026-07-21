import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm, calculateETA, formatDistance } from '../../utils/geo';
import { playCommuterChime } from '../../utils/webAudio';
import { Bell, CheckCircle2 } from 'lucide-react';
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

    if (!activeSession) return null;

    const distKm = commuterCoords && typeof activeSession.driverLat === 'number'
        ? calculateDistanceKm(commuterCoords.lat, commuterCoords.lng, activeSession.driverLat, activeSession.driverLng)
        : 0.15;
    const eta = calculateETA(distKm);
    const formattedDist = formatDistance(distKm);

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
            <div className="p-6 rounded-[2.5rem] bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 border border-emerald-500/40 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
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

                    <div className="text-right">
                        <span className="text-sm font-mono font-black text-emerald-500 block">
                            {eta}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Live Approach</span>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Driver En Route to Your Pickup Spot
                    </span>
                    <span className="text-cyan-400 font-bold">Smart Dispatch Verified</span>
                </div>
            </div>
        </div>
    );
};

export default LiveApproachStatus;
