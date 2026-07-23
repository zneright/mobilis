import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm } from '../../utils/geo';
import { Navigation, Fuel, Zap, MapPin } from 'lucide-react';
import { cardRoleStyle, roleCtaBg, rolePill, roleAccentText } from '../tabs/roleStyleTokens';
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
    theme?: 'dark' | 'light';
}

export const CommuterRadar: React.FC<CommuterRadarProps> = ({ commuterData, currencyMode, setCurrencyMode, theme = 'dark' }) => {
    const searchRadiusKm = 0.20; // 200-meter GPS transit discovery radius
    const [viewMode, setViewMode] = useState<'map' | 'radar'>('map');
    const [vehicleFilter, setVehicleFilter] = useState<string>('All');
    const [commuterCoords, setCommuterCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'ready' | 'denied' | 'error'>('acquiring');
    const [allActiveDrivers, setAllActiveDrivers] = useState<DriverLocationDoc[]>([]);
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
            },
            (err) => {
                console.warn('Firestore driver locations error:', err);
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

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-4 font-sans">
            
            {/* Minimalist Top Bar */}
            <div className="w-full flex items-center justify-between gap-3 px-1 py-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Commuter Radar
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Mode Selector */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 rounded-2xl">
                        <button
                            onClick={() => setViewMode('map')}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                viewMode === 'map'
                                    ? `${roleCtaBg('commuter')} text-white shadow-sm`
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            🗺️ Map
                        </button>
                        <button
                            onClick={() => setViewMode('radar')}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                viewMode === 'radar'
                                    ? `${roleCtaBg('commuter')} text-white shadow-sm`
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            🛰️ Radar
                        </button>
                    </div>

                    <button
                        onClick={() => setCurrencyMode((p) => (p === 'PHP' ? 'XLM' : 'PHP'))}
                        className="px-3.5 py-1.5 rounded-2xl text-xs font-mono font-black bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white hover:opacity-80 transition-all shadow-xs"
                    >
                        {currencyMode}
                    </button>
                </div>
            </div>

            {/* Live Ride Approach Status (Active Pickups Only) */}
            <div className="w-full">
                <LiveApproachStatus
                    commuterUid={commuterData.uid}
                    commuterCoords={centerCoords}
                />
            </div>

            {/* Driver Operational Dispatch (DRIVERS ONLY) */}
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

            {/* Proximity Notifier */}
            <DriverApproachNotifier
                driverCoords={commuterCoords}
                isOnDuty={commuterData.role === 'driver' && Boolean(commuterData.isDuty)}
            />

            {/* Driver Operational Header (DRIVERS ONLY) */}
            {commuterData.role === 'driver' && (
                <div className="w-full p-4 rounded-3xl bg-white dark:bg-[#07090E] border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0 font-bold text-xl">
                            {commuterData.vehicleType === 'Jeepney' ? '🛻' :
                             commuterData.vehicleType === 'UV Express' ? '🚐' :
                             commuterData.vehicleType === 'Bus' ? '🚌' :
                             commuterData.vehicleType === 'E-Vehicle' ? '🚙' :
                             commuterData.vehicleType === 'Motorcycle' ? '🛵' : '🛺'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${commuterData.isDuty ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                    Driver Operational Status
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${commuterData.isDuty ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400'}`}>
                                    {commuterData.isDuty ? 'ON DUTY' : 'OFF DUTY'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                                Operating {commuterData.vehicleType || 'Tricycle'} ({commuterData.plateNumber || 'TOD-1234'}) • {commuterData.todaAffiliation || 'Coop TODA'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
                        <Navigation className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatch Active</span>
                    </div>
                </div>
            )}

            {/* GPS Warning Banner (Only if permission denied) */}
            {gpsStatus === 'denied' && (
                <div className="w-full p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-500 flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>Location fallback applied. Enable GPS permission for exact positioning.</span>
                </div>
            )}

            {/* VIEW MODE 1: LIVE TRANSIT MAP & FILTER/BEACON BELOW */}
            {viewMode === 'map' && (
                <div className="w-full space-y-4">
                    <LiveTransitMapErrorBoundary>
                        <LiveTransitMap
                            commuterCoords={centerCoords}
                            activeDrivers={nearbyDrivers}
                            onSelectVehicleToPay={commuterData.role !== 'driver' ? (drv) => setSelectedDriver(drv) : undefined}
                            commuterUid={commuterData.uid}
                            theme={theme}
                            vehicleFilter={vehicleFilter}
                            setVehicleFilter={setVehicleFilter}
                            userRole={commuterData.role === 'superadmin' ? 'admin' : commuterData.role}
                        />
                    </LiveTransitMapErrorBoundary>

                    {/* Waiting Beacon Bar & Filter Pills (COMMUTERS ONLY) - PLACED DIRECTLY BELOW MAP */}
                    {commuterData.role !== 'driver' && (
                        <WaitingBeaconButton
                            commuterUid={commuterData.uid}
                            commuterCoords={centerCoords}
                            preferredVehicle={vehicleFilter}
                            setPreferredVehicle={setVehicleFilter}
                        />
                    )}
                </div>
            )}

            {/* VIEW MODE 2: SONAR RADAR CANVAS */}
            {viewMode === 'radar' && (
                <div className={`w-full rounded-[2.5rem] p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[320px] ${cardRoleStyle('commuter')}`}>
                    
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
                                    title={`${drv.driverName} (${Math.round(drv.distanceKm * 1000)}m away)`}
                                    className={`absolute z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform font-bold ${roleCtaBg('commuter')}`}
                                >
                                    <Fuel className="w-3.5 h-3.5" />
                                </button>
                            );
                        })}
                    </div>

                    <div className={`mt-4 flex items-center gap-2 text-xs font-mono font-bold px-4 py-1.5 rounded-full border ${rolePill('commuter')}`}>
                        <Zap className="w-3.5 h-3.5 animate-pulse" />
                        <span>
                            {nearbyDrivers.length} Driver{nearbyDrivers.length === 1 ? '' : 's'} ON TRANSIT within 200m
                        </span>
                    </div>
                </div>
            )}

            {/* NEARBY DRIVERS FEED FOR FARE PAYMENT */}
            {viewMode === 'radar' && (
                <div className="w-full pt-2">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center justify-between tracking-tight">
                        <span>Active Drivers On Transit</span>
                        <span className={`text-[11px] font-mono font-bold ${roleAccentText('commuter')}`}>LIVE GPS BROADCAST</span>
                    </h3>

                    {nearbyDrivers.length > 0 ? (
                        <div className="space-y-2.5">
                            {nearbyDrivers.map((drv) => (
                                <div
                                    key={drv.uid}
                                    className={`p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${cardRoleStyle('commuter')}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-base shadow-xs border ${rolePill('commuter')}`}>
                                            {(drv.driverName || 'Driver').charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                                    {drv.driverName}
                                                </h4>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border ${rolePill('commuter')}`}>
                                                    ON TRANSIT
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                                                {drv.vehicleType === 'Jeepney' ? '🛻 Modern Jeepney' :
                                                 drv.vehicleType === 'UV Express' ? '🚐 UV Express' :
                                                 drv.vehicleType === 'Bus' ? '🚌 Public Bus' :
                                                 drv.vehicleType === 'E-Vehicle' ? '🚙 E-Trike' :
                                                 drv.vehicleType === 'Motorcycle' ? '🛵 Habal-Habal' : '🛺 Tricycle'} • Plate: {drv.plateNumber} ({drv.todaAffiliation})
                                            </p>
                                        </div>
                                    </div>

                                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
                                        <span className={`text-xs font-mono font-bold ${roleAccentText('commuter')}`}>
                                            {Math.round(drv.distanceKm * 1000)}m away
                                        </span>
                                        {commuterData.role !== 'driver' ? (
                                            <button
                                                onClick={() => setSelectedDriver(drv)}
                                                className={`px-4 py-2 font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95 ${roleCtaBg('commuter')}`}
                                            >
                                                <Zap className="w-3.5 h-3.5" /> Pay Fare
                                            </button>
                                        ) : (
                                            <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${rolePill('commuter')}`}>
                                                🛰️ Transit Active
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 bg-white dark:bg-[#07090E] border border-slate-200/80 dark:border-white/10 rounded-2xl text-center space-y-1 font-mono">
                            <Fuel className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white">No Active Drivers Within 200m</h4>
                            <p className="text-[10px] text-slate-500">
                                Drivers automatically appear live when they turn ON DUTY.
                            </p>
                        </div>
                    )}
                </div>
            )}

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
