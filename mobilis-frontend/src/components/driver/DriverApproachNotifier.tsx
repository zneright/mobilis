import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm } from '../../utils/geo';
import { playDoubleChime } from '../../utils/webAudio';
import { Bell, X } from 'lucide-react';
import type { WaitingBeaconDoc } from '../../types';

interface DriverApproachNotifierProps {
    driverCoords: { lat: number; lng: number } | null;
    isOnDuty: boolean;
}

export const DriverApproachNotifier: React.FC<DriverApproachNotifierProps> = ({
    driverCoords,
    isOnDuty,
}) => {
    const [waitingBeacons, setWaitingBeacons] = useState<WaitingBeaconDoc[]>([]);
    const [proximityAlert, setProximityAlert] = useState<{ message: string; distanceMeters: number } | null>(null);

    // Track triggered thresholds per commuter beacon ID to avoid sound spamming
    const notifiedThresholdsRef = useRef<Record<string, Set<number>>>({});

    // Listen to real-time waiting_beacons collection
    useEffect(() => {
        if (!isOnDuty) {
            setWaitingBeacons([]);
            return;
        }

        const qBeacons = query(
            collection(db, 'waiting_beacons'),
            where('active', '==', true)
        );

        const unsubscribe = onSnapshot(qBeacons, (snapshot) => {
            const list: WaitingBeaconDoc[] = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data() as WaitingBeaconDoc;
                if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
                    list.push({ ...data, id: docSnap.id });
                }
            });
            setWaitingBeacons(list);
        });

        return () => unsubscribe();
    }, [isOnDuty]);

    // Check distances against 200m, 100m, 50m, and 10m thresholds
    useEffect(() => {
        if (!isOnDuty || !driverCoords || waitingBeacons.length === 0) return;

        waitingBeacons.forEach((beacon) => {
            const distKm = calculateDistanceKm(driverCoords.lat, driverCoords.lng, beacon.lat, beacon.lng);
            const distMeters = Math.round(distKm * 1000);

            if (!notifiedThresholdsRef.current[beacon.id]) {
                notifiedThresholdsRef.current[beacon.id] = new Set<number>();
            }
            const triggeredSet = notifiedThresholdsRef.current[beacon.id];

            // Thresholds: 200m, 100m, 50m, 10m
            let thresholdLabel = '';
            let thresholdValue = 0;

            if (distMeters <= 10 && !triggeredSet.has(10)) {
                thresholdValue = 10;
                thresholdLabel = '📳 Arrival: Waiting passenger point reached';
            } else if (distMeters <= 50 && !triggeredSet.has(50)) {
                thresholdValue = 50;
                thresholdLabel = '🔔 50m: Prepare to stop for waiting passenger';
            } else if (distMeters <= 100 && !triggeredSet.has(100)) {
                thresholdValue = 100;
                thresholdLabel = '🔔 100m: Passenger nearby ahead';
            } else if (distMeters <= 200 && !triggeredSet.has(200)) {
                thresholdValue = 200;
                thresholdLabel = '🔔 200m: Passenger waiting ahead';
            }

            if (thresholdValue > 0) {
                triggeredSet.add(thresholdValue);
                playDoubleChime();
                setProximityAlert({ message: thresholdLabel, distanceMeters: distMeters });
                setTimeout(() => setProximityAlert(null), 6000);
            }
        });
    }, [driverCoords, waitingBeacons, isOnDuty]);

    if (!isOnDuty || !proximityAlert) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-full bg-slate-900 dark:bg-[#0A0D14] border border-cyan-500/40 text-white p-4 rounded-2xl shadow-[0_0_30px_rgba(0,210,255,0.5)] flex items-center gap-3 animate-bounce">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
                <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
                <p className="font-black text-[10px] uppercase tracking-wider text-cyan-400">Proximity Transit Beacon</p>
                <p className="font-bold text-xs">{proximityAlert.message}</p>
            </div>
            <button onClick={() => setProximityAlert(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default DriverApproachNotifier;
