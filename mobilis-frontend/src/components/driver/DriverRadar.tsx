import React, { useState, useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { collection, query, where, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm, calculateETA, formatDistance } from '../../utils/geo';
import { playDriverAlertChime } from '../../utils/webAudio';
import { Radio, UserCheck, Check, Navigation, Gauge, Maximize2, MapPin } from 'lucide-react';
import type { WaitingBeaconDoc, UserData } from '../../types';
import DriverApproachNotifier from './DriverApproachNotifier';

interface DriverRadarProps {
    driverData: UserData;
    currencyMode: 'XLM' | 'PHP';
    setCurrencyMode: React.Dispatch<React.SetStateAction<'XLM' | 'PHP'>>;
}

export const DriverRadar: React.FC<DriverRadarProps> = ({ driverData }) => {
    const searchRadiusKm = 0.5; // 500-meter driver discovery radius for waiting passengers
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
    const passengerMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

    const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'ready' | 'denied' | 'error'>('acquiring');
    const [waitingBeacons, setWaitingBeacons] = useState<WaitingBeaconDoc[]>([]);
    const [isLoadingPassengers, setIsLoadingPassengers] = useState<boolean>(true);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'hud_map' | 'hud_radar'>('hud_map');
    const [mapPitch, setMapPitch] = useState<number>(45);

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
        setIsLoadingPassengers(true);
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
                    const pref = data.preferredVehicleType || 'All';
                    const matchesVehicle =
                        pref === 'All' ||
                        pref.toLowerCase() === driverVehicleType.toLowerCase();

                    if (matchesVehicle && typeof data.lat === 'number' && typeof data.lng === 'number') {
                        list.push({ ...data, id: docSnap.id });
                    }
                });
                setWaitingBeacons(list);
                setIsLoadingPassengers(false);
            },
            (err) => {
                console.warn("Firestore waiting beacons listener warning:", err);
                setIsLoadingPassengers(false);
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

    const nearestPassenger = nearbyPassengers[0] || null;

    // Initialize Driver Cyberpunk MapLibre Map
    useEffect(() => {
        if (!mapContainerRef.current || viewMode !== 'hud_map') return;

        try {
            const map = new maplibregl.Map({
                container: mapContainerRef.current,
                style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
                center: [centerCoords.lng, centerCoords.lat],
                zoom: 16.8,
                pitch: mapPitch,
                bearing: -15,
                attributionControl: false,
            });

            mapRef.current = map;
        } catch (err) {
            console.warn("Driver MapLibre initialization failed:", err);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [viewMode]);

    // Update Driver Vehicle & Passenger Markers on Cyberpunk Map
    useEffect(() => {
        if (!mapRef.current || viewMode !== 'hud_map') return;
        const map = mapRef.current;

        // Driver Vehicle Marker (Orange Neon Glow Cockpit Marker)
        try {
            if (!driverMarkerRef.current) {
                const el = document.createElement('div');
                el.className = 'relative flex items-center justify-center';
                el.innerHTML = `
                    <div class="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 p-0.5 shadow-[0_0_35px_rgba(255,107,0,0.95)] border-2 border-white animate-pulse flex items-center justify-center text-2xl">
                        ${driverVehicleType === 'Jeepney' ? '🛻' :
                          driverVehicleType === 'UV Express' ? '🚐' :
                          driverVehicleType === 'Bus' ? '🚌' :
                          driverVehicleType === 'E-Vehicle' ? '🚙' :
                          driverVehicleType === 'Motorcycle' ? '🛵' : '🛺'}
                    </div>
                    <div class="absolute -inset-3 rounded-full border border-orange-500/40 animate-ping pointer-events-none"></div>
                `;
                driverMarkerRef.current = new maplibregl.Marker({ element: el })
                    .setLngLat([centerCoords.lng, centerCoords.lat])
                    .addTo(map);
            } else {
                driverMarkerRef.current.setLngLat([centerCoords.lng, centerCoords.lat]);
            }
        } catch (e) {
            console.warn("Driver marker render error:", e);
        }

        // Passenger Pulse Echo Markers
        try {
            const currentKeys = new Set<string>();
            nearbyPassengers.forEach((p) => {
                currentKeys.add(p.id);
                if (passengerMarkersRef.current.has(p.id)) {
                    passengerMarkersRef.current.get(p.id)!.setLngLat([p.lng, p.lat]);
                } else {
                    const el = document.createElement('div');
                    el.className = 'cursor-pointer group relative flex items-center justify-center';
                    el.innerHTML = `
                        <div class="w-10 h-10 rounded-full bg-white text-black font-black flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.9)] border-2 border-amber-400 text-lg group-hover:scale-125 transition-transform animate-bounce">
                            👤
                        </div>
                        <div class="absolute -inset-2 rounded-full border border-amber-400/60 animate-ping"></div>
                    `;
                    el.addEventListener('click', () => handleAcceptPickup(p));
                    const marker = new maplibregl.Marker({ element: el })
                        .setLngLat([p.lng, p.lat])
                        .addTo(map);
                    passengerMarkersRef.current.set(p.id, marker);
                }
            });

            passengerMarkersRef.current.forEach((marker, key) => {
                if (!currentKeys.has(key)) {
                    marker.remove();
                    passengerMarkersRef.current.delete(key);
                }
            });
        } catch (e) {
            console.warn("Passenger marker render error:", e);
        }
    }, [centerCoords, nearbyPassengers, viewMode]);

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

    const togglePitch = () => {
        const nextPitch = mapPitch === 45 ? 0 : 45;
        setMapPitch(nextPitch);
        if (mapRef.current) {
            mapRef.current.easeTo({ pitch: nextPitch, duration: 800 });
        }
    };

    const recenterMap = () => {
        if (mapRef.current && driverCoords) {
            mapRef.current.flyTo({ center: [driverCoords.lng, driverCoords.lat], zoom: 17, duration: 1000 });
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center font-sans space-y-4 text-white">
            
            {/* Driver Approach Proximity Notifier (200m, 100m, 50m, 10m alerts) */}
            <DriverApproachNotifier
                driverCoords={driverCoords}
                isOnDuty={Boolean(driverData.isDuty)}
            />

            {/* TOP CYBERPUNK HUD TELEMETRY STRIP */}
            {gpsStatus === 'denied' && (
                <div className="w-full p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-400 flex items-center gap-2 font-mono">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>GPS fallback applied. Enable browser GPS for precise proximity telemetry.</span>
                </div>
            )}
            <div className="w-full bg-[#07090E]/90 border border-orange-500/30 rounded-3xl p-4 shadow-[0_0_30px_rgba(255,107,0,0.15)] backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500 animate-ping" />
                    <span className="font-black text-orange-400 tracking-wider uppercase">
                        MOBILIS DRIVER COCKPIT • HUD ONLINE
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold">
                        {driverData.isDuty ? 'ON DUTY • GPS BROADCASTING' : 'OFF DUTY'}
                    </span>
                </div>

                <div className="flex items-center gap-6 font-bold text-slate-300">
                    <span className="flex items-center gap-1.5 text-amber-400">
                        <Gauge className="w-3.5 h-3.5" /> ~22 KM/H SPEED
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-400">
                        <Radio className="w-3.5 h-3.5 animate-pulse" /> {nearbyPassengers.length} PASSENGERS IN RADAR
                    </span>
                    <span className="text-emerald-400 font-black">STELLAR TESTNET</span>
                </div>
            </div>

            {/* MAIN DRIVER OPERATIONAL MAP & HUD CANVAS */}
            <div className="w-full bg-[#050505] border border-orange-500/30 rounded-[2.5rem] p-3 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[480px]">
                
                {/* HUD MAP VIEW */}
                {viewMode === 'hud_map' && (
                    <div className="w-full h-[460px] rounded-[2rem] overflow-hidden relative border border-white/10">
                        <div ref={mapContainerRef} className="w-full h-full" />
                        
                        {/* CUSTOM RADIAL HUD FLOATING CONTROLS (NO DEFAULT BROWSER BUTTONS) */}
                        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
                            <button
                                onClick={recenterMap}
                                title="Locate Driver"
                                className="w-11 h-11 rounded-2xl bg-[#0A0D14]/90 text-orange-400 border border-orange-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform backdrop-blur-md"
                            >
                                <Navigation className="w-5 h-5" />
                            </button>
                            <button
                                onClick={togglePitch}
                                title="Toggle 45° Cockpit Pitch"
                                className="w-11 h-11 rounded-2xl bg-[#0A0D14]/90 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform backdrop-blur-md text-xs font-mono font-black"
                            >
                                {mapPitch}°
                            </button>
                            <button
                                onClick={() => setViewMode('hud_radar')}
                                title="Switch to Sonar Sweep"
                                className="w-11 h-11 rounded-2xl bg-[#0A0D14]/90 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform backdrop-blur-md"
                            >
                                <Radio className="w-5 h-5" />
                            </button>
                        </div>

                        {/* PROXIMITY ARRIVAL BANNER (WITHIN 200M OF PASSENGER) */}
                        {nearestPassenger && nearestPassenger.distKm <= 0.2 && (
                            <div className="absolute top-4 left-4 right-16 z-30 p-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl text-black font-black text-xs font-mono flex items-center justify-between shadow-[0_0_25px_rgba(255,107,0,0.8)] animate-pulse">
                                <span>📳 ARRIVING AT PASSENGER PICKUP POINT ({formatDistance(nearestPassenger.distKm)})</span>
                                <span className="px-2 py-0.5 rounded bg-black text-orange-400 text-[10px]">PREPARE STOP</span>
                            </div>
                        )}
                    </div>
                )}

                {/* HUD RADAR SONAR VIEW */}
                {viewMode === 'hud_radar' && (
                    <div className="w-full h-[460px] rounded-[2rem] bg-[#05060A] border border-cyan-500/30 flex flex-col items-center justify-center relative overflow-hidden">
                        
                        {/* Radar Mode Switcher */}
                        <button
                            onClick={() => setViewMode('hud_map')}
                            className="absolute top-4 right-4 z-30 px-4 py-2 rounded-2xl bg-[#0A0D14]/90 text-cyan-400 border border-cyan-500/30 flex items-center gap-2 text-xs font-mono font-bold shadow-lg backdrop-blur-md"
                        >
                            <Maximize2 className="w-4 h-4" /> Vector Cockpit Map
                        </button>

                        <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
                            <div 
                                className="absolute inset-0 rounded-full animate-spin pointer-events-none opacity-40"
                                style={{
                                    animationDuration: '3.5s',
                                    background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(255, 107, 0, 0.45) 360deg)'
                                }}
                            />
                            <div className="absolute inset-0 rounded-full border border-orange-500/20 animate-ping opacity-20 pointer-events-none" />
                            <div className="absolute inset-0 rounded-full border border-dashed border-orange-500/30" />
                            <div className="absolute inset-8 rounded-full border border-orange-500/25" />
                            <div className="absolute inset-20 rounded-full border border-orange-500/40" />

                            {/* Center Driver Vehicle Silhouette */}
                            <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 shadow-[0_0_30px_rgba(255,107,0,0.9)]">
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-2xl">
                                    {driverVehicleType === 'Jeepney' ? '🛻' :
                                     driverVehicleType === 'UV Express' ? '🚐' :
                                     driverVehicleType === 'Bus' ? '🚌' :
                                     driverVehicleType === 'E-Vehicle' ? '🚙' :
                                     driverVehicleType === 'Motorcycle' ? '🛵' : '🛺'}
                                </div>
                            </div>

                            {/* Waiting Passengers Markers */}
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
                                        className="absolute z-20 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.9)] hover:scale-125 transition-transform font-bold text-lg animate-bounce border-2 border-orange-500"
                                    >
                                        👤
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* SLIDE-IN PASSENGER DISPATCH ACCEPTANCE SHEET */}
            <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm text-slate-300 uppercase tracking-widest font-mono flex items-center gap-2">
                        <Radio className="w-4 h-4 text-orange-400 animate-pulse" />
                        Passenger Dispatch Queue ({driverVehicleType})
                    </h4>
                    <span className="text-xs font-mono font-bold text-orange-400">
                        AUTOMATIC MATCHING ACTIVE
                    </span>
                </div>

                {isLoadingPassengers ? (
                    <div className="p-5 bg-[#0B0D14] border border-white/10 rounded-3xl animate-pulse space-y-2">
                        <div className="w-40 h-4 bg-white/10 rounded" />
                        <div className="w-24 h-3 bg-white/5 rounded" />
                    </div>
                ) : nearbyPassengers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {nearbyPassengers.map((pass) => {
                            const eta = calculateETA(pass.distKm);
                            const formattedDist = formatDistance(pass.distKm);

                            return (
                                <div
                                    key={pass.id}
                                    className="p-5 rounded-3xl bg-[#090C12] border border-orange-500/30 shadow-xl flex items-center justify-between gap-4 transition-all hover:border-orange-400"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-black flex items-center justify-center font-black text-xl shadow-[0_0_15px_rgba(255,107,0,0.5)]">
                                            👤
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-black text-sm text-white">
                                                    Waiting Passenger
                                                </h5>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                                    Target: {pass.preferredVehicleType || 'All'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                                                {formattedDist} • ETA: {eta}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleAcceptPickup(pass)}
                                        disabled={acceptingId === pass.id}
                                        className="px-5 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-xs rounded-2xl transition-all shadow-[0_0_20px_rgba(255,107,0,0.6)] flex items-center gap-1.5 hover:scale-105"
                                    >
                                        <Check className="w-4 h-4" /> Accept Pickup
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-8 bg-[#080A10] border border-white/10 rounded-3xl text-center space-y-2 font-mono">
                        <UserCheck className="w-8 h-8 text-slate-500 mx-auto" />
                        <h5 className="font-bold text-sm text-slate-300">No Passengers Waiting Nearby</h5>
                        <p className="text-xs text-slate-500">
                            Waiting passengers requesting {driverVehicleType} will automatically appear in your HUD console.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverRadar;
