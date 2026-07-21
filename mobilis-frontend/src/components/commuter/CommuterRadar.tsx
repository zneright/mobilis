import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm } from '../../utils/geo';
import { Navigation, Radio, RefreshCw, Fuel, Zap, MapPin } from 'lucide-react';
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
    const searchRadiusKm = 0.05; // 50-meter GPS transit discovery radius
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
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-5 font-sans">
            
            {/* Top Toolbar & View Mode Switcher */}
            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
                        Transport Discovery
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Real-time nearby vehicles with instant Stellar fare payments.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Mode Selector */}
                    <div className="flex items-center gap-1 p-1 bg-white/90 dark:bg-[#07090E]/90 border border-gray-100 dark:border-white/10 rounded-full shadow-sm">
                        <button
                            onClick={() => setViewMode('map')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                viewMode === 'map'
                                    ? 'bg-gray-900 text-white dark:bg-emerald-500 dark:text-black font-extrabold shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            🗺️ Vector Map
                        </button>
                        <button
                            onClick={() => setViewMode('radar')}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                viewMode === 'radar'
                                    ? 'bg-gray-900 text-white dark:bg-emerald-500 dark:text-black font-extrabold shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            🛰️ Sonar Radar
                        </button>
                    </div>

                    <button
                        onClick={() => setCurrencyMode((p) => (p === 'PHP' ? 'XLM' : 'PHP'))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-white dark:bg-[#07090E] border border-gray-100 dark:border-white/10 shadow-sm text-gray-900 dark:text-white transition-all"
                    >
                        <RefreshCw className="w-3 h-3 text-emerald-500" /> {currencyMode}
                    </button>
                </div>
            </div>

            {/* Live Accepted Pickup Approach Status */}
            <div className="w-full">
                <LiveApproachStatus
                    commuterUid={commuterData.uid}
                    commuterCoords={centerCoords}
                />
            </div>

            {/* Driver Passenger Discovery & Dispatch Section */}
            {commuterData.role === 'driver' && Boolean(commuterData.isDuty) && (
                <div className="w-full">
                    <DriverPickupDispatch
                        driverUid={commuterData.uid}
                        driverVehicleType={commuterData.vehicleType || 'Tricycle'}
                        driverCoords={commuterCoords}
                        isOnDuty={true}
                    />
                </div>
            )}

            {/* Driver Approach Proximity Notifier */}
            <DriverApproachNotifier
                driverCoords={commuterCoords}
                isOnDuty={commuterData.role === 'driver' && Boolean(commuterData.isDuty)}
            />

            {/* Commuter Waiting Beacon Button (COMMUTERS ONLY) */}
            {commuterData.role !== 'driver' && (
                <div className="w-full">
                    <WaitingBeaconButton
                        commuterUid={commuterData.uid}
                        commuterCoords={centerCoords}
                    />
                </div>
            )}

            {/* Driver Cockpit Operational Header (DRIVERS ONLY) */}
            {commuterData.role === 'driver' && (
                <div className="w-full p-4 rounded-3xl bg-white dark:bg-[#07090E] border border-gray-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0 font-bold text-xl">
                            {commuterData.vehicleType === 'Jeepney' ? '🛻' :
                             commuterData.vehicleType === 'UV Express' ? '🚐' :
                             commuterData.vehicleType === 'Bus' ? '🚌' :
                             commuterData.vehicleType === 'E-Vehicle' ? '🚙' :
                             commuterData.vehicleType === 'Motorcycle' ? '🛵' : '🛺'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${commuterData.isDuty ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
                                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                                    Driver Cockpit
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${commuterData.isDuty ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400'}`}>
                                    {commuterData.isDuty ? 'ON DUTY • Active' : 'OFF DUTY'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                                Operating {commuterData.vehicleType || 'Tricycle'} ({commuterData.plateNumber || 'TOD-1234'}) • {commuterData.todaAffiliation || 'Coop TODA'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                        <Navigation className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatch Active</span>
                    </div>
                </div>
            )}

            {/* GPS Warning Banner */}
            {gpsStatus === 'denied' && (
                <div className="w-full p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-500 flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>Location fallback applied. Enable browser GPS permission for precise scanning.</span>
                </div>
            )}

            {/* VIEW MODE 1: PRIVACY-FIRST LIVE TRANSIT MAP */}
            {viewMode === 'map' && (
                <div className="w-full">
                    <LiveTransitMapErrorBoundary>
                        <LiveTransitMap
                            commuterCoords={centerCoords}
                            activeDrivers={nearbyDrivers}
                            onSelectVehicleToPay={commuterData.role !== 'driver' ? (drv) => setSelectedDriver(drv) : undefined}
                            commuterUid={commuterData.uid}
                        />
                    </LiveTransitMapErrorBoundary>
                </div>
            )}

            {/* VIEW MODE 2: SONAR RADAR CANVAS */}
            {viewMode === 'radar' && (
                <div className="w-full bg-white dark:bg-[#0c121e] border-t-4 border-t-emerald-500 border-x border-b border-gray-100 dark:border-emerald-500/20 rounded-3xl p-6 shadow-[0_10px_30px_rgba(16,185,129,0.15)] relative overflow-hidden flex flex-col items-center justify-center min-h-[320px]">
                    
                    {/* Sonar Radar Container */}
                    <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                        <div 
                            className="absolute inset-0 rounded-full animate-spin pointer-events-none opacity-40"
                            style={{
                                animationDuration: '4s',
                                background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(16, 185, 129, 0.35) 360deg)'
                            }}
                        />

                        <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-20 pointer-events-none" />
                        <div className="absolute inset-0 rounded-full border border-dashed border-emerald-500/30" />
                        <div className="absolute inset-8 rounded-full border border-emerald-500/25" />
                        <div className="absolute inset-20 rounded-full border border-emerald-500/40" />

                        {/* Center Commuter Marker */}
                        <div className="relative z-10 w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md">
                            <Navigation className="w-5 h-5" />
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
                                    className="absolute z-20 w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md hover:scale-125 transition-transform font-bold"
                                >
                                    <Fuel className="w-3.5 h-3.5" />
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs font-mono text-emerald-500 font-bold bg-emerald-500/10 px-4 py-1.5 rounded-full">
                        <Zap className="w-3.5 h-3.5 animate-pulse" />
                        <span>
                            {nearbyDrivers.length} Driver{nearbyDrivers.length === 1 ? '' : 's'} ON TRANSIT within 50 meters
                        </span>
                    </div>
                </div>
            )}

            {/* NEARBY ON TRANSIT DRIVERS LIST */}
            <div className="w-full pt-2">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                    <span>Active Drivers On Transit</span>
                    <span className="text-xs font-mono text-emerald-500 font-bold">LIVE GPS BROADCAST</span>
                </h3>

                {isLoadingDrivers ? (
                    <div className="space-y-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="p-4 bg-white dark:bg-[#07090E] border border-gray-100 dark:border-white/10 rounded-2xl animate-pulse flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="w-36 h-4 bg-gray-200 dark:bg-white/10 rounded" />
                                    <div className="w-24 h-3 bg-gray-100 dark:bg-white/5 rounded" />
                                </div>
                                <div className="w-24 h-9 bg-gray-200 dark:bg-white/10 rounded-full" />
                            </div>
                        ))}
                    </div>
                ) : nearbyDrivers.length > 0 ? (
                    <div className="space-y-2.5">
                        {nearbyDrivers.map((drv) => (
                            <div
                                key={drv.uid}
                                className="p-4 bg-white dark:bg-[#07090E] border border-gray-100 dark:border-white/10 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:border-emerald-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-extrabold text-base shadow-sm">
                                        {(drv.driverName || 'Driver').charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">
                                                {drv.driverName}
                                            </h4>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 font-mono">
                                                ON TRANSIT
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                                            {drv.vehicleType === 'Jeepney' ? '🛻 Modern Jeepney' :
                                             drv.vehicleType === 'UV Express' ? '🚐 UV Express' :
                                             drv.vehicleType === 'Bus' ? '🚌 Public Bus' :
                                             drv.vehicleType === 'E-Vehicle' ? '🚙 E-Trike' :
                                             drv.vehicleType === 'Motorcycle' ? '🛵 Habal-Habal' : '🛺 Tricycle'} • Plate: {drv.plateNumber} ({drv.todaAffiliation})
                                        </p>
                                    </div>
                                </div>

                                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
                                    <span className="text-xs font-mono font-bold text-emerald-500">
                                        {formatReadableDistance(drv.distanceKm)}
                                    </span>
                                    {commuterData.role !== 'driver' ? (
                                        <button
                                            onClick={() => setSelectedDriver(drv)}
                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                                        >
                                            <Zap className="w-3.5 h-3.5" /> Pay Fare
                                        </button>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-mono font-bold">
                                            🛰️ Transit Active
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-6 bg-white dark:bg-[#07090E] border border-gray-100 dark:border-white/10 rounded-2xl text-center space-y-1 font-mono">
                        <Fuel className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <h4 className="font-bold text-xs text-gray-900 dark:text-white">No Active Drivers Within 50 Meters</h4>
                        <p className="text-[10px] text-gray-500">
                            Drivers will automatically appear live on your map when they turn ON DUTY.
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
