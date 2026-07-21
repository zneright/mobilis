import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm, calculateETA, formatDistance } from '../../utils/geo';
import { playDriverAlertChime } from '../../utils/webAudio';
import { UserCheck, Check } from 'lucide-react';
import type { WaitingBeaconDoc } from '../../types';

interface DriverPickupDispatchProps {
    driverUid: string;
    driverVehicleType: string;
    driverCoords: { lat: number; lng: number } | null;
    isOnDuty: boolean;
}

export const DriverPickupDispatch: React.FC<DriverPickupDispatchProps> = ({
    driverUid,
    driverVehicleType,
    driverCoords,
    isOnDuty,
}) => {
    const [waitingBeacons, setWaitingBeacons] = useState<WaitingBeaconDoc[]>([]);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);

    // Fetch real-time waiting passenger beacons
    useEffect(() => {
        if (!isOnDuty) {
            setWaitingBeacons([]);
            return;
        }

        const qBeacons = query(
            collection(db, 'waiting_beacons'),
            where('active', '==', true)
        );

        const unsubscribe = onSnapshot(
            qBeacons,
            (snapshot) => {
                const list: WaitingBeaconDoc[] = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data() as WaitingBeaconDoc;
                    // Vehicle Type Matching: Only include if preferred is 'All' or matches driver's vehicle type
                    const pref = data.preferredVehicleType || 'All';
                    const matchesVehicle =
                        pref === 'All' ||
                        pref.toLowerCase() === (driverVehicleType || 'Tricycle').toLowerCase();

                    if (matchesVehicle && typeof data.lat === 'number' && typeof data.lng === 'number') {
                        list.push({ ...data, id: docSnap.id });
                    }
                });
                setWaitingBeacons(list);
            },
            (err) => {
                console.warn("Error fetching waiting beacons:", err);
            }
        );

        return () => unsubscribe();
    }, [isOnDuty, driverVehicleType]);

    // Sorted nearby waiting passengers
    const sortedBeacons = React.useMemo(() => {
        if (!driverCoords) return waitingBeacons;
        return [...waitingBeacons].map((b) => {
            const distKm = calculateDistanceKm(driverCoords.lat, driverCoords.lng, b.lat, b.lng);
            return { ...b, distKm };
        }).sort((a, b) => a.distKm - b.distKm);
    }, [waitingBeacons, driverCoords]);

    const handleAcceptPickup = async (beacon: WaitingBeaconDoc) => {
        if (!driverUid || !driverCoords) return;
        setAcceptingId(beacon.id);

        try {
            const sessionId = `pickup_${beacon.commuterUid}`;
            await setDoc(doc(db, 'active_pickup_sessions', sessionId), {
                id: sessionId,
                driverUid,
                commuterUid: beacon.commuterUid,
                status: 'accepted',
                vehicleType: driverVehicleType || 'Tricycle',
                driverLat: driverCoords.lat,
                driverLng: driverCoords.lng,
                commuterLat: beacon.lat,
                commuterLng: beacon.lng,
                acceptedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });

            playDriverAlertChime();
        } catch (err) {
            console.error("Failed to accept pickup session:", err);
        } finally {
            setAcceptingId(null);
        }
    };

    if (!isOnDuty || sortedBeacons.length === 0) return null;

    return (
        <div className="w-full bg-slate-900 dark:bg-[#080B12] border border-cyan-500/30 rounded-3xl p-5 shadow-2xl text-white space-y-4">
            
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <h3 className="font-black text-sm uppercase tracking-wider text-cyan-400">
                        Passenger Discovery ({sortedBeacons.length} Nearby)
                    </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono font-bold text-cyan-400">
                    Target: {driverVehicleType || 'Tricycle'}
                </span>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {sortedBeacons.map((b) => {
                    const distKm = driverCoords ? calculateDistanceKm(driverCoords.lat, driverCoords.lng, b.lat, b.lng) : 0.1;
                    const eta = calculateETA(distKm);
                    const formattedDist = formatDistance(distKm);

                    return (
                        <div
                            key={b.id}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/50 flex items-center justify-between gap-3 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-base shadow-sm">
                                    👤
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-xs text-white">
                                            Waiting Passenger
                                        </h4>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                                            {b.preferredVehicleType || 'All'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                                        {formattedDist} away • ETA {eta}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleAcceptPickup(b)}
                                disabled={acceptingId === b.id}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center gap-1 hover:scale-105"
                            >
                                <Check className="w-3.5 h-3.5" /> Accept Pickup
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DriverPickupDispatch;
