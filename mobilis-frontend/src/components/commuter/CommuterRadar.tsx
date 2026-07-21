import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm } from '../../utils/geo';
import { Compass, Navigation, Radio, RefreshCw, Fuel, Zap, MapPin } from 'lucide-react';
import type { DriverLocationDoc, UserData } from '../../types';
import FarePaymentModal from './FarePaymentModal';
import LiveTransitMap, { LiveTransitMapErrorBoundary } from './LiveTransitMap';
import WaitingBeaconButton from './WaitingBeaconButton';
import LiveApproachStatus from './LiveApproachStatus';
import DriverApproachNotifier from '../driver/DriverApproachNotifier';
import DriverPickupDispatch from '../driver/DriverPickupDispatch';

interface CommuterRadarProps {
    commuterData: UserData;
    currencyMode: 'XLM' | 'PHP';
    setCurrencyMode: React.Dispatch<React.SetStateAction<'XLM' | 'PHP'>>;
}

export const CommuterRadar: React.FC<CommuterRadarProps> = ({ commuterData, currencyMode, setCurrencyMode }) => {
    const searchRadiusKm = 0.05; // Fixed 50-meter GPS radar radius
    const [viewMode, setViewMode] = useState<'radar' | 'map'>('radar');
    const [commuterCoords, setCommuterCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'ready' | 'denied' | 'error'>('acquiring');
    const [allActiveDrivers, setAllActiveDrivers] = useState<DriverLocationDoc[]>([]);
    const [isLoadingDrivers, setIsLoadingDrivers] = useState<boolean>(true);
    const [selectedDriver, setSelectedDriver] = useState<DriverLocationDoc | null>(null);

    // Default Fallback Coordinates (Metro Manila Transport Center) if GPS is denied
    const DEFAULT_COORDS = { lat: 14.5995, lng: 120.9842 };

    useEffect(() => {
        let isMounted = true;
        if (!('geolocation' in navigator)) {
            if (isMounted) {
                setCommuterCoords(DEFAULT_COORDS);
                setGpsStatus('error');
            }
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (isMounted) {
                    setCommuterCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setGpsStatus('ready');
                }
            },
            (err) => {
                console.warn('Commuter GPS error:', err);
                if (isMounted) {
                    setCommuterCoords(DEFAULT_COORDS);
                    setGpsStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );

        return () => {
            isMounted = false;
        };
    }, []);

    // Firestore Real-Time Listener strictly for Drivers who are ON TRANSIT (active: true in driver_locations)
    useEffect(() => {
        setIsLoadingDrivers(true);
        const qLocations = query(
            collection(db, 'driver_locations'),
            where('active', '==', true)
        );

        const unsubscribe = onSnapshot(
            qLocations,
            (snapshot) => {
                const activeOnTransitDrivers: DriverLocationDoc[] = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data() as DriverLocationDoc;
                    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
                        activeOnTransitDrivers.push(data);
                    }
                });

                setAllActiveDrivers(activeOnTransitDrivers);
                setIsLoadingDrivers(false);
            },
            (err) => {
                console.warn('Firestore driver locations error:', err);
                setIsLoadingDrivers(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Filter & Sort Nearby Drivers by Distance
    const centerCoords = commuterCoords || DEFAULT_COORDS;
    const nearbyDrivers = allActiveDrivers
        .map((drv) => {
            const distKm = calculateDistanceKm(centerCoords.lat, centerCoords.lng, drv.lat, drv.lng);
            return { ...drv, distanceKm: distKm };
        })
        .filter((drv) => drv.distanceKm <= searchRadiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);

    const formatReadableDistance = (distKm: number) => {
        const meters = Math.round(distKm * 1000);
        if (meters < 1000) return `${meters} m away`;
        return `${distKm.toFixed(2)} km away`;
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
            
            {/* Top Toolbar & View Mode Switcher */}
            <div className="w-full mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Radio className="w-7 h-7 text-emerald-500 animate-pulse" />
                        Commuter Transport Radar
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Discover drivers currently ON TRANSIT and pay instant Stellar fares.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Mode Selector */}
                    <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                        <button
                            onClick={() => setViewMode('radar')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                                viewMode === 'radar'
                                    ? 'bg-emerald-500 text-black font-black shadow-sm'
                                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            🛰️ 50m Radar
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                                viewMode === 'map'
                                    ? 'bg-emerald-500 text-black font-black shadow-sm'
                                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            🗺️ Live Transit Map
                        </button>
                    </div>

                    <button
                        onClick={() => setCurrencyMode((p) => (p === 'PHP' ? 'XLM' : 'PHP'))}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-mono bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 shadow-sm text-slate-900 dark:text-white"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Currency: {currencyMode}
                    </button>
                </div>
            </div>

            {/* Live Accepted Pickup Approach Status */}
            <div className="w-full mb-6">
                <LiveApproachStatus
                    commuterUid={commuterData.uid}
                    commuterCoords={centerCoords}
                />
            </div>

            {/* Driver Passenger Discovery & Dispatch Section */}
            {commuterData.role === 'driver' && Boolean(commuterData.isDuty) && (
                <div className="w-full mb-6">
                    <DriverPickupDispatch
                        driverUid={commuterData.uid}
                        driverVehicleType={commuterData.vehicleType || 'Tricycle'}
                        driverCoords={commuterCoords}
                        isOnDuty={true}
                    />
                </div>
            )}

            {/* Driver Approach Proximity Notifier (200m, 100m, 50m, 10m alerts) */}
            <DriverApproachNotifier
                driverCoords={commuterCoords}
                isOnDuty={commuterData.role === 'driver' && Boolean(commuterData.isDuty)}
            />

            {/* Commuter Waiting Beacon Button (COMMUTERS ONLY) */}
            {commuterData.role !== 'driver' && (
                <div className="w-full mb-6">
                    <WaitingBeaconButton
                        commuterUid={commuterData.uid}
                        commuterCoords={centerCoords}
                    />
                </div>
            )}

            {/* Driver Cockpit Operational Header (DRIVERS ONLY) */}
            {commuterData.role === 'driver' && (
                <div className="w-full mb-6 p-5 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-indigo-500/10 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0 border border-cyan-500/30 font-black text-2xl">
                            {commuterData.vehicleType === 'Jeepney' ? '🛻' :
                             commuterData.vehicleType === 'UV Express' ? '🚐' :
                             commuterData.vehicleType === 'Bus' ? '🚌' :
                             commuterData.vehicleType === 'E-Vehicle' ? '🚙' :
                             commuterData.vehicleType === 'Motorcycle' ? '🛵' : '🛺'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${commuterData.isDuty ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
                                <h4 className="font-black text-base text-slate-900 dark:text-white">
                                    Driver Transit Cockpit
                                </h4>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${commuterData.isDuty ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400'}`}>
                                    {commuterData.isDuty ? 'ON DUTY • GPS Active' : 'OFF DUTY'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                                Operating {commuterData.vehicleType || 'Tricycle'} ({commuterData.plateNumber || 'TOD-1234'}) • {commuterData.todaAffiliation || 'Coop TODA'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-500 bg-cyan-500/10 px-4 py-2 rounded-2xl border border-cyan-500/20">
                        <Navigation className="w-4 h-4 animate-spin" />
                        <span>Passenger Dispatch Active</span>
                    </div>
                </div>
            )}

            {/* Fixed 50-Meter Radar Status Banner */}
            <div className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-6 shadow-md flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        🛰️ Active GPS Radar Radius: <span className="text-emerald-500 font-mono font-black">50 METERS ONLY</span>
                    </span>
                </div>

                <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-mono font-bold">
                    GPS Broadcast Lock • 50m Radius
                </span>
            </div>

            {/* GPS Status Banner */}
            {gpsStatus === 'denied' && (
                <div className="w-full mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-500 flex items-center gap-3">
                    <MapPin className="w-5 h-5 flex-shrink-0" />
                    <span>Location fallback applied. Enable browser GPS permission for precise distance scanning.</span>
                </div>
            )}

            {/* VIEW MODE 1: SONAR RADAR CANVAS */}
            {viewMode === 'radar' && (
                <div className="w-full bg-slate-900 dark:bg-[#0B0F19] border border-slate-800 dark:border-white/10 rounded-[2.5rem] p-8 mb-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[340px]">
                    
                    {/* Sonar Radar Container */}
                    <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                        
                        {/* Rotating Radar Sweep Line */}
                        <div 
                            className="absolute inset-0 rounded-full animate-spin pointer-events-none opacity-40"
                            style={{
                                animationDuration: '4s',
                                background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(16, 185, 129, 0.35) 360deg)'
                            }}
                        />

                        {/* Ring 3 (Outer sonar ring) */}
                        <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-20 pointer-events-none" />
                        <div className="absolute inset-0 rounded-full border border-dashed border-emerald-500/30" />
                        
                        {/* Ring 2 (Middle) */}
                        <div className="absolute inset-8 rounded-full border border-emerald-500/25" />
                        
                        {/* Ring 1 (Inner) */}
                        <div className="absolute inset-20 rounded-full border border-emerald-500/40" />

                        {/* Center Commuter Marker */}
                        <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 p-0.5 shadow-[0_0_25px_rgba(52,211,153,0.8)]">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-emerald-400">
                                <Navigation className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Driver Markers Visualization on Radar */}
                        {nearbyDrivers.slice(0, 8).map((drv, idx) => {
                            const angle = (idx * 45 * Math.PI) / 180;
                            const radiusRatio = Math.min(drv.distanceKm / searchRadiusKm, 0.85);
                            const radiusPx = Math.max(35, 120 * radiusRatio);
                            const x = Math.cos(angle) * radiusPx;
                            const y = Math.sin(angle) * radiusPx;

                            return (
                                <button
                                    key={drv.uid}
                                    onClick={() => setSelectedDriver(drv)}
                                    style={{ transform: `translate(${x}px, ${y}px)` }}
                                    title={`${drv.driverName} (${formatReadableDistance(drv.distanceKm)})`}
                                    className="absolute z-20 w-9 h-9 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.9)] hover:scale-130 transition-transform font-bold"
                                >
                                    <Fuel className="w-4 h-4" />
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                        <Zap className="w-4 h-4 animate-pulse" />
                        <span>
                            {nearbyDrivers.length} Driver{nearbyDrivers.length === 1 ? '' : 's'} ON TRANSIT within 50 Meters
                        </span>
                    </div>
                </div>
            )}

            {/* VIEW MODE 2: PRIVACY-FIRST LIVE TRANSIT MAP */}
            {viewMode === 'map' && (
                <div className="w-full mb-8">
                    <LiveTransitMapErrorBoundary>
                        <LiveTransitMap
                            commuterCoords={centerCoords}
                            activeDrivers={nearbyDrivers}
                            onSelectVehicleToPay={commuterData.role !== 'driver' ? (drv) => setSelectedDriver(drv) : undefined}
                        />
                    </LiveTransitMapErrorBoundary>
                </div>
            )}

            {/* NEARBY ON TRANSIT DRIVERS LIST */}
            <div className="w-full">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                    <span>Active Drivers On Transit</span>
                    <span className="text-xs font-mono text-emerald-500 font-bold">LIVE GPS BROADCAST</span>
                </h3>

                {isLoadingDrivers ? (
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
                ) : nearbyDrivers.length > 0 ? (
                    <div className="space-y-4">
                        {nearbyDrivers.map((drv) => (
                            <div
                                key={drv.uid}
                                className="p-5 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-emerald-500/50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white font-black text-lg shadow-sm">
                                        {(drv.driverName || 'Driver').charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                            <h4 className="font-bold text-base text-slate-900 dark:text-white">
                                                {drv.driverName}
                                            </h4>
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                ON TRANSIT
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                                            {drv.vehicleType === 'Jeepney' ? '🛻 Modern Jeepney' :
                                             drv.vehicleType === 'UV Express' ? '🚐 UV Express' :
                                             drv.vehicleType === 'Bus' ? '🚌 Public Bus' :
                                             drv.vehicleType === 'E-Vehicle' ? '🚙 E-Trike' :
                                             drv.vehicleType === 'Motorcycle' ? '🛵 Habal-Habal' : '🛺 Tricycle'} • Plate: {drv.plateNumber} ({drv.todaAffiliation})
                                        </p>
                                    </div>
                                </div>

                                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
                                    <span className="text-xs font-mono font-bold text-emerald-500">
                                        {formatReadableDistance(drv.distanceKm)}
                                    </span>
                                    {commuterData.role !== 'driver' ? (
                                        <button
                                            onClick={() => setSelectedDriver(drv)}
                                            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(52,211,153,0.3)] flex items-center gap-1.5"
                                        >
                                            <Zap className="w-4 h-4" /> Pay Fare
                                        </button>
                                    ) : (
                                        <span className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-mono font-bold">
                                            🛰️ Transit Active
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 rounded-2xl text-center space-y-2">
                        <Fuel className="w-8 h-8 text-slate-400 mx-auto" />
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">No Drivers Active Within 50 Meters</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Drivers will automatically appear here when they switch their status to ON TRANSIT.
                        </p>
                    </div>
                )}
            </div>

            {/* FARE PAYMENT MODAL */}
            {selectedDriver && (
                <FarePaymentModal
                    commuterData={commuterData}
                    driver={selectedDriver}
                    onClose={() => setSelectedDriver(null)}
                />
            )}
        </div>
    );
};

export default CommuterRadar;
