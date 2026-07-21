import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm, calculateETA, formatDistance } from '../../utils/geo';
import { playDriverAlertChime } from '../../utils/webAudio';
import { Radio, UserCheck, Check, Zap, MapPin } from 'lucide-react';
import type { WaitingBeaconDoc, UserData } from '../../types';
import DriverApproachNotifier from './DriverApproachNotifier';

interface DriverRadarProps {
    driverData: UserData;
    currencyMode: 'XLM' | 'PHP';
    setCurrencyMode: React.Dispatch<React.SetStateAction<'XLM' | 'PHP'>>;
}

export const DriverRadar: React.FC<DriverRadarProps> = ({ driverData }) => {
    const searchRadiusKm = 0.5; // 500-meter driver discovery radius for waiting passengers
    const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'ready' | 'denied' | 'error'>('acquiring');
    const [waitingBeacons, setWaitingBeacons] = useState<WaitingBeaconDoc[]>([]);
    const [isLoadingPassengers, setIsLoadingDrivers] = useState<boolean>(true);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);

    const DEFAULT_COORDS = { lat: 14.5995, lng: 120.9842 };
    const driverVehicleType = driverData.vehicleType || 'Tricycle';

    // Acquire Driver GPS Location
    useEffect(() => {
        let isMounted = true;
        if (!('geolocation' in navigator)) {
            if (isMounted) {
                setDriverCoords(DEFAULT_COORDS);
                setGpsStatus('error');
            }
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (isMounted) {
                    setDriverCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setGpsStatus('ready');
                }
            },
            (err) => {
                console.warn('Driver GPS error:', err);
                if (isMounted) {
                    setDriverCoords(DEFAULT_COORDS);
                    setGpsStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );

        return () => {
            isMounted = false;
        };
    }, []);

    // Firestore Listener strictly for WAITING PASSENGERS matching Driver's Vehicle Type
    useEffect(() => {
        setIsLoadingDrivers(true);
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
                    // Vehicle Type Filter: Only include if preferred is 'All' or matches driver's vehicle type
                    const pref = data.preferredVehicleType || 'All';
                    const matchesVehicle =
                        pref === 'All' ||
                        pref.toLowerCase() === driverVehicleType.toLowerCase();

                    if (matchesVehicle && typeof data.lat === 'number' && typeof data.lng === 'number') {
                        list.push({ ...data, id: docSnap.id });
                    }
                });
                setWaitingBeacons(list);
                setIsLoadingDrivers(false);
            },
            (err) => {
                console.warn("Firestore waiting beacons listener warning:", err);
                setIsLoadingDrivers(false);
            }
        );

        return () => unsubscribe();
    }, [driverVehicleType]);

    // Calculate Distance & Sort Nearby Waiting Passengers
    const centerCoords = driverCoords || DEFAULT_COORDS;
    const nearbyPassengers = useMemo(() => {
        return waitingBeacons
            .map((b) => {
                const distKm = calculateDistanceKm(centerCoords.lat, centerCoords.lng, b.lat, b.lng);
                return { ...b, distKm };
            })
            .filter((b) => b.distKm <= searchRadiusKm)
            .sort((a, b) => a.distKm - b.distKm);
    }, [waitingBeacons, centerCoords]);

    const handleAcceptPickup = async (beacon: WaitingBeaconDoc) => {
        if (!driverData.uid || !driverCoords) return;
        setAcceptingId(beacon.id);

        try {
            const sessionId = `pickup_${beacon.commuterUid}`;
            await setDoc(doc(db, 'active_pickup_sessions', sessionId), {
                id: sessionId,
                driverUid: driverData.uid,
                commuterUid: beacon.commuterUid,
                status: 'accepted',
                vehicleType: driverVehicleType,
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

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center font-sans space-y-6">
            
            {/* Driver Approach Proximity Notifier (200m, 100m, 50m, 10m alerts) */}
            <DriverApproachNotifier
                driverCoords={driverCoords}
                isOnDuty={Boolean(driverData.isDuty)}
            />

            {/* DRIVER COCKPIT OPERATIONAL BANNER */}
            <div className="w-full p-6 rounded-[2.5rem] bg-gradient-to-r from-cyan-500/15 via-emerald-500/15 to-indigo-500/15 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0 font-black text-3xl shadow-md">
                        {driverVehicleType === 'Jeepney' ? '🛻' :
                         driverVehicleType === 'UV Express' ? '🚐' :
                         driverVehicleType === 'Bus' ? '🚌' :
                         driverVehicleType === 'E-Vehicle' ? '🚙' :
                         driverVehicleType === 'Motorcycle' ? '🛵' : '🛺'}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${driverData.isDuty ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
                            <h3 className="font-black text-lg text-slate-900 dark:text-white">
                                Driver Passenger Discovery Radar
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${driverData.isDuty ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'}`}>
                                {driverData.isDuty ? 'ON DUTY • Broadcasting' : 'OFF DUTY'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-gray-300 font-mono mt-0.5">
                            Operating {driverVehicleType} ({driverData.plateNumber || 'TOD-1234'}) • {driverData.todaAffiliation || 'Coop TODA'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-500 bg-cyan-500/10 px-4 py-2.5 rounded-2xl border border-cyan-500/20 shadow-sm">
                    <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
                    <span>Matching Passenger Requests</span>
                </div>
            </div>

            {/* GPS Status Warning */}
            {gpsStatus === 'denied' && (
                <div className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-500 flex items-center gap-3">
                    <MapPin className="w-5 h-5 flex-shrink-0" />
                    <span>Driver GPS fallback applied. Enable browser GPS for exact proximity scanning.</span>
                </div>
            )}

            {/* SONAR RADAR CANVAS FOR DRIVERS (CENTER = DRIVER VEHICLE, DOTS = WAITING PASSENGERS) */}
            <div className="w-full bg-slate-900 dark:bg-[#06080F] border border-slate-800 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[360px]">
                
                {/* Sonar Radar Container */}
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                    
                    {/* Rotating Radar Sweep Line */}
                    <div 
                        className="absolute inset-0 rounded-full animate-spin pointer-events-none opacity-40"
                        style={{
                            animationDuration: '4s',
                            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(0, 210, 255, 0.4) 360deg)'
                        }}
                    />

                    {/* Outer sonar rings */}
                    <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-20 pointer-events-none" />
                    <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/30" />
                    <div className="absolute inset-8 rounded-full border border-cyan-500/25" />
                    <div className="absolute inset-20 rounded-full border border-cyan-500/40" />

                    {/* Center Driver Pin */}
                    <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 p-0.5 shadow-[0_0_30px_rgba(0,210,255,0.8)]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-2xl">
                            {driverVehicleType === 'Jeepney' ? '🛻' :
                             driverVehicleType === 'UV Express' ? '🚐' :
                             driverVehicleType === 'Bus' ? '🚌' :
                             driverVehicleType === 'E-Vehicle' ? '🚙' :
                             driverVehicleType === 'Motorcycle' ? '🛵' : '🛺'}
                        </div>
                    </div>

                    {/* Waiting Passengers Markers Visualization on Radar */}
                    {nearbyPassengers.slice(0, 8).map((pass, idx) => {
                        const angle = (idx * 45 * Math.PI) / 180;
                        const radiusRatio = Math.min(pass.distKm / searchRadiusKm, 0.85);
                        const radiusPx = Math.max(35, 120 * radiusRatio);
                        const x = Math.cos(angle) * radiusPx;
                        const y = Math.sin(angle) * radiusPx;

                        return (
                            <button
                                key={pass.id}
                                onClick={() => handleAcceptPickup(pass)}
                                style={{ transform: `translate(${x}px, ${y}px)` }}
                                title={`Waiting Passenger (${formatDistance(pass.distKm)})`}
                                className="absolute z-20 w-10 h-10 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-[0_0_25px_rgba(0,210,255,0.9)] hover:scale-125 transition-transform font-bold text-lg animate-bounce"
                            >
                                👤
                            </button>
                        );
                    })}
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20">
                    <Zap className="w-4 h-4 animate-pulse" />
                    <span>
                        {nearbyPassengers.length} Passenger{nearbyPassengers.length === 1 ? '' : 's'} Waiting for {driverVehicleType}
                    </span>
                </div>
            </div>

            {/* NEARBY WAITING PASSENGERS DISPATCH LIST */}
            <div className="w-full">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                    <span>Passengers Requesting {driverVehicleType}</span>
                    <span className="text-xs font-mono text-cyan-500 font-bold">REAL-TIME DISPATCH</span>
                </h3>

                {isLoadingPassengers ? (
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="p-5 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-2xl animate-pulse flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="w-36 h-4 bg-slate-200 dark:bg-white/10 rounded" />
                                    <div className="w-24 h-3 bg-slate-100 dark:bg-white/5 rounded" />
                                </div>
                                <div className="w-24 h-10 bg-slate-200 dark:bg-white/10 rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : nearbyPassengers.length > 0 ? (
                    <div className="space-y-4">
                        {nearbyPassengers.map((pass) => {
                            const eta = calculateETA(pass.distKm);
                            const formattedDist = formatDistance(pass.distKm);

                            return (
                                <div
                                    key={pass.id}
                                    className="p-5 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-cyan-500/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 flex items-center justify-center font-black text-2xl shadow-sm">
                                            👤
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                                                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                                                    Waiting Passenger
                                                </h4>
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 font-mono">
                                                    Target: {pass.preferredVehicleType || 'All'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                                                Distance: {formattedDist} • ETA: {eta}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
                                        <button
                                            onClick={() => handleAcceptPickup(pass)}
                                            disabled={acceptingId === pass.id}
                                            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(0,210,255,0.4)] flex items-center gap-1.5 hover:scale-105"
                                        >
                                            <Check className="w-4 h-4" /> Accept Pickup
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-8 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-2xl text-center space-y-2">
                        <UserCheck className="w-8 h-8 text-slate-400 mx-auto" />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Passengers Waiting Nearby</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Waiting passengers requesting {driverVehicleType} will automatically appear here when they signal for a ride.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverRadar;
