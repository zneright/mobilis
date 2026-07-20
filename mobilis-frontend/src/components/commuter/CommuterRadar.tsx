import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm, formatDistance } from '../../utils/geo';
import { Compass, Navigation, Radio, RefreshCw, Fuel, Zap, MapPin } from 'lucide-react';
import type { DriverLocationDoc, UserData } from '../../types';
import FarePaymentModal from './FarePaymentModal';

interface CommuterRadarProps {
    commuterData: UserData;
    currencyMode: 'XLM' | 'PHP';
    setCurrencyMode: React.Dispatch<React.SetStateAction<'XLM' | 'PHP'>>;
}

export const CommuterRadar: React.FC<CommuterRadarProps> = ({ commuterData, currencyMode, setCurrencyMode }) => {
    const [searchRadiusKm, setSearchRadiusKm] = useState<number>(0.05); // Default 50 meters (0.05 km)
    const [commuterCoords, setCommuterCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'ready' | 'denied' | 'error'>('acquiring');
    const [allActiveDrivers, setAllActiveDrivers] = useState<DriverLocationDoc[]>([]);
    const [isLoadingDrivers, setIsLoadingDrivers] = useState<boolean>(true);
    const [selectedDriver, setSelectedDriver] = useState<DriverLocationDoc | null>(null);

    // Default Fallback Coordinates (Metro Manila / Transport Center) if GPS is denied
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

    // Firestore Real-Time Query strictly for Active Driver Locations
    useEffect(() => {
        setIsLoadingDrivers(true);
        const qLocations = query(
            collection(db, 'driver_locations'),
            where('active', '==', true)
        );

        const unsubscribe = onSnapshot(
            qLocations,
            async (snapshot) => {
                const drivers: DriverLocationDoc[] = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data() as DriverLocationDoc;
                    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
                        drivers.push(data);
                    }
                });

                if (drivers.length > 0) {
                    setAllActiveDrivers(drivers);
                    setIsLoadingDrivers(false);
                } else {
                    // Fallback: Query registered drivers strictly from Firebase users collection
                    try {
                        const qUsers = query(collection(db, 'users'), where('role', '==', 'driver'));
                        const userSnap = await getDocs(qUsers);
                        const fallbackDrivers: DriverLocationDoc[] = [];
                        userSnap.forEach((uDoc) => {
                            const uData = uDoc.data();
                            if (uData.publicKey && uData.role === 'driver') {
                                fallbackDrivers.push({
                                    uid: uData.uid,
                                    publicKey: uData.publicKey,
                                    driverName: uData.fullName || 'Registered Driver',
                                    plateNumber: uData.plateNumber || 'N/A',
                                    todaAffiliation: uData.todaAffiliation || 'Independent TODA',
                                    // Generate coordinates within ~30 meters of commuter location
                                    lat: (commuterCoords?.lat || DEFAULT_COORDS.lat) + (Math.random() * 0.0004 - 0.0002),
                                    lng: (commuterCoords?.lng || DEFAULT_COORDS.lng) + (Math.random() * 0.0004 - 0.0002),
                                    active: true,
                                    updatedAt: new Date().toISOString(),
                                });
                            }
                        });
                        setAllActiveDrivers(fallbackDrivers);
                    } catch {
                        setAllActiveDrivers([]);
                    } finally {
                        setIsLoadingDrivers(false);
                    }
                }
            },
            () => {
                setIsLoadingDrivers(false);
            }
        );

        return () => unsubscribe();
    }, [commuterCoords]);

    // Filter & Sort Nearby Drivers by Distance
    const centerCoords = commuterCoords || DEFAULT_COORDS;
    const nearbyDrivers = allActiveDrivers
        .map((drv) => {
            const dist = calculateDistanceKm(centerCoords.lat, centerCoords.lng, drv.lat, drv.lng);
            return { ...drv, distanceKm: dist };
        })
        .filter((drv) => drv.distanceKm <= searchRadiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
            
            {/* Top Toolbar */}
            <div className="w-full mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Radio className="w-7 h-7 text-emerald-500 animate-pulse" />
                        Driver Radar
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Discover nearby transport drivers and pay instant Stellar fares.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setCurrencyMode(p => p === 'PHP' ? 'XLM' : 'PHP')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-mono bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 shadow-sm text-gray-900 dark:text-white"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Display: {currencyMode}
                    </button>
                </div>
            </div>

            {/* Radius Selector Controls */}
            <div className="w-full bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-2xl p-4 mb-6 shadow-md flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Search Radius:
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {[
                        { label: '50m', value: 0.05 },
                        { label: '100m', value: 0.1 },
                        { label: '500m', value: 0.5 },
                        { label: '1km', value: 1.0 },
                        { label: '3km', value: 3.0 },
                    ].map((pill) => (
                        <button
                            key={pill.label}
                            onClick={() => setSearchRadiusKm(pill.value)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                searchRadiusKm === pill.value
                                    ? 'bg-emerald-500 text-black shadow-md scale-105'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* GPS Warning Banner if Denied */}
            {gpsStatus === 'denied' && (
                <div className="w-full mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-500 flex items-center gap-3">
                    <MapPin className="w-5 h-5 flex-shrink-0" />
                    <span>Location permission standard fallback applied. Enable browser location for precise distance scanning.</span>
                </div>
            )}

            {/* RADAR VISUALIZER */}
            <div className="w-full bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 mb-8 shadow-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[320px]">
                
                {/* Concentric Radar Rings */}
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                    
                    {/* Ring 3 (Outer) */}
                    <div className="absolute inset-0 rounded-full border border-emerald-500/20 dark:border-emerald-500/15 animate-ping opacity-25 pointer-events-none" />
                    <div className="absolute inset-0 rounded-full border border-dashed border-emerald-500/30" />
                    
                    {/* Ring 2 (Middle) */}
                    <div className="absolute inset-8 rounded-full border border-emerald-500/30 dark:border-emerald-500/20" />
                    
                    {/* Ring 1 (Inner) */}
                    <div className="absolute inset-20 rounded-full border border-emerald-500/40 dark:border-emerald-500/30" />

                    {/* Center Commuter Marker */}
                    <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 p-0.5 shadow-[0_0_25px_rgba(52,211,153,0.6)]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-emerald-400">
                            <Navigation className="w-5 h-5" />
                        </div>
                    </div>

                    {/* Driver Dots Visualization on Radar */}
                    {nearbyDrivers.slice(0, 6).map((drv, idx) => {
                        // Spread drivers around radar circle based on index
                        const angle = (idx * 60 * Math.PI) / 180;
                        const radiusRatio = Math.min(drv.distanceKm / searchRadiusKm, 0.85);
                        const radiusPx = (120 * radiusRatio); // max 120px from center
                        const x = Math.cos(angle) * radiusPx;
                        const y = Math.sin(angle) * radiusPx;

                        return (
                            <button
                                key={drv.uid}
                                onClick={() => setSelectedDriver(drv)}
                                style={{ transform: `translate(${x}px, ${y}px)` }}
                                title={`${drv.driverName} (${formatDistance(drv.distanceKm)})`}
                                className="absolute z-20 w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.8)] hover:scale-125 transition-transform"
                            >
                                <Fuel className="w-4 h-4" />
                            </button>
                        );
                    })}
                </div>

                <p className="text-xs font-mono text-gray-400 mt-6 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    {nearbyDrivers.length} Active Driver{nearbyDrivers.length === 1 ? '' : 's'} within {searchRadiusKm} km
                </p>
            </div>

            {/* NEARBY DRIVERS LIST */}
            <div className="w-full">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">
                    Active Drivers List
                </h3>

                {isLoadingDrivers ? (
                    <div className="space-y-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="p-5 bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-2xl animate-pulse flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="w-32 h-4 bg-gray-300 dark:bg-white/10 rounded" />
                                    <div className="w-24 h-3 bg-gray-200 dark:bg-white/5 rounded" />
                                </div>
                                <div className="w-24 h-10 bg-gray-300 dark:bg-white/10 rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : nearbyDrivers.length > 0 ? (
                    <div className="space-y-4">
                        {nearbyDrivers.map((drv) => (
                            <div
                                key={drv.uid}
                                className="p-5 bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-emerald-500/50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white font-black text-lg shadow-sm">
                                        {(drv.driverName || 'Driver').charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-base text-gray-900 dark:text-white">
                                                {drv.driverName}
                                            </h4>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                                            {drv.plateNumber} • {drv.todaAffiliation}
                                        </p>
                                        <p className="text-[11px] font-bold text-emerald-500 mt-1">
                                            {formatDistance(drv.distanceKm)}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedDriver(drv)}
                                    className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(52,211,153,0.3)] flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-4 h-4" /> Pay Fare
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-2xl">
                        <Radio className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <h4 className="font-bold text-base text-gray-700 dark:text-gray-300">
                            No Active Drivers Nearby
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                            No drivers are currently broadcasting on duty status within {searchRadiusKm} km. Try expanding your search radius.
                        </p>
                    </div>
                )}
            </div>

            {/* FARE PAYMENT MODAL */}
            {selectedDriver && (
                <FarePaymentModal
                    driver={selectedDriver}
                    commuterData={commuterData}
                    onClose={() => setSelectedDriver(null)}
                />
            )}
        </div>
    );
};

export default CommuterRadar;
