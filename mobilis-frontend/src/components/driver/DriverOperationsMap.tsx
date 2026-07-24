import React, { useState, useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { collection, query, where, onSnapshot, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm, calculateETA, formatDistance, fetchRealRoadRoute } from '../../utils/geo';
import { playDriverAlertChime } from '../../utils/webAudio';
import { applyRoleMapStyle } from '../../utils/mapStyle';
import { Navigation, Radio, Check, Gauge, MapPin } from 'lucide-react';
import { cardRoleStyle, roleCtaBg, rolePill, roleAccentText } from '../tabs/roleStyleTokens';
import type { WaitingBeaconDoc, UserData } from '../../types';
import DriverApproachNotifier from './DriverApproachNotifier';

interface DriverOperationsMapProps {
    driverData: UserData;
    currencyMode: 'XLM' | 'PHP';
    setCurrencyMode: React.Dispatch<React.SetStateAction<'XLM' | 'PHP'>>;
    theme?: 'dark' | 'light';
}

interface PickupSessionDoc {
    id: string;
    driverUid: string;
    commuterUid: string;
    commuterName?: string;
    status: 'accepted' | 'en_route' | 'completed' | 'cancelled';
    commuterLat: number;
    commuterLng: number;
    driverLat?: number;
    driverLng?: number;
    acceptedAt?: string;
}

export const DriverOperationsMap: React.FC<DriverOperationsMapProps> = ({ driverData, theme = 'dark' }) => {
    const searchRadiusKm = 5.0; // 5-kilometer passenger discovery radius
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
    const passengerMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const activeRouteIdsRef = useRef<Set<string>>(new Set());

    const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'ready' | 'denied' | 'error'>('acquiring');
    const [waitingBeacons, setWaitingBeacons] = useState<WaitingBeaconDoc[]>([]);
    const [activePickupSessions, setActivePickupSessions] = useState<PickupSessionDoc[]>([]);
    const [isLoadingPassengers, setIsLoadingPassengers] = useState<boolean>(true);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [mapPitch, setMapPitch] = useState<number>(45);

    const DEFAULT_COORDS = { lat: 14.5995, lng: 120.9842 };
    const driverVehicleType = driverData.vehicleType || 'Tricycle';

    // GPS Location Listener
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

    // Firestore Listener strictly for WAITING PASSENGERS matching Driver Vehicle
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

    // Firestore Listener for ACTIVE PICKUP SESSIONS accepted by this Driver
    useEffect(() => {
        if (!driverData.uid) return;
        const qSessions = query(
            collection(db, 'active_pickup_sessions'),
            where('driverUid', '==', driverData.uid),
            where('status', 'in', ['accepted', 'en_route'])
        );

        const unsubscribe = onSnapshot(
            qSessions,
            (snapshot) => {
                const list: PickupSessionDoc[] = [];
                snapshot.forEach((docSnap) => {
                    list.push({ ...docSnap.data(), id: docSnap.id } as PickupSessionDoc);
                });
                setActivePickupSessions(list);
            },
            (err) => {
                console.warn("Active pickup sessions listener warning:", err);
            }
        );

        return () => unsubscribe();
    }, [driverData.uid]);

    // Auto-complete/remove route session when driver is within 15 meters (0.015 km) or goes beyond commuter
    useEffect(() => {
        if (!driverCoords || activePickupSessions.length === 0) return;

        activePickupSessions.forEach(async (session) => {
            if (typeof session.commuterLat === 'number' && typeof session.commuterLng === 'number') {
                const distKm = calculateDistanceKm(driverCoords.lat, driverCoords.lng, session.commuterLat, session.commuterLng);
                if (distKm <= 0.015) {
                    try {
                        await updateDoc(doc(db, 'active_pickup_sessions', session.id), {
                            status: 'completed',
                            completedAt: new Date().toISOString(),
                        });
                    } catch (e) {
                        console.warn("Auto completing pickup session warning:", e);
                    }
                }
            }
        });
    }, [driverCoords, activePickupSessions]);

    // Render Multi-Passenger Route Lines on MapLibre Canvas
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        const drawRoutes = async () => {
            if (!mapRef.current || !driverCoords) return;
            const currentSessionIds = new Set<string>();

            for (const session of activePickupSessions) {
                if (typeof session.commuterLat !== 'number' || typeof session.commuterLng !== 'number') continue;
                const id = session.id;
                currentSessionIds.add(id);

                const sourceId = `route-source-${id}`;
                const layerGlowId = `route-layer-glow-${id}`;
                const layerLineId = `route-layer-line-${id}`;

                // Fetch real turn-by-turn road geometry from OSRM
                const roadGeometry = await fetchRealRoadRoute(
                    driverCoords.lng,
                    driverCoords.lat,
                    session.commuterLng,
                    session.commuterLat
                );

                const geojson: { type: 'Feature'; properties: Record<string, unknown>; geometry: { type: string; coordinates: number[][] } } = {
                    type: 'Feature',
                    properties: {},
                    geometry: roadGeometry,
                };

                if (map.getSource(sourceId)) {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
                } else {
                    map.addSource(sourceId, {
                        type: 'geojson',
                        data: geojson,
                    });

                    // Glowing Under-Layer Path (Driver Role Amber Gold)
                    map.addLayer({
                        id: layerGlowId,
                        type: 'line',
                        source: sourceId,
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: {
                            'line-color': '#F59E0B',
                            'line-width': 10,
                            'line-opacity': 0.6,
                        },
                    });

                    // High-Visibility Guidance Line (Driver Bright Amber)
                    map.addLayer({
                        id: layerLineId,
                        type: 'line',
                        source: sourceId,
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: {
                            'line-color': '#FCD34D',
                            'line-width': 5,
                            'line-dasharray': [2, 2],
                        },
                    });
                }
            }

            // Clean up completed / removed route lines from MapLibre canvas
            activeRouteIdsRef.current.forEach((prevId) => {
                if (!currentSessionIds.has(prevId)) {
                    const sourceId = `route-source-${prevId}`;
                    const layerGlowId = `route-layer-glow-${prevId}`;
                    const layerLineId = `route-layer-line-${prevId}`;

                    if (map.getLayer(layerLineId)) map.removeLayer(layerLineId);
                    if (map.getLayer(layerGlowId)) map.removeLayer(layerGlowId);
                    if (map.getSource(sourceId)) map.removeSource(sourceId);
                }
            });

            activeRouteIdsRef.current = currentSessionIds;
        };

        if (map.isStyleLoaded()) {
            drawRoutes();
        } else {
            const onStyleData = () => {
                if (map.isStyleLoaded()) {
                    drawRoutes();
                    map.off('styledata', onStyleData);
                }
            };
            map.on('styledata', onStyleData);
        }
    }, [driverCoords, activePickupSessions]);

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

    // Initialize Driver Cyberpunk MapLibre Map with dynamic theme switching
    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Clean up previous map instance if re-initializing for theme change
        if (mapRef.current) {
            passengerMarkersRef.current.forEach((marker) => marker.remove());
            passengerMarkersRef.current.clear();
            if (driverMarkerRef.current) {
                driverMarkerRef.current.remove();
                driverMarkerRef.current = null;
            }
            mapRef.current.remove();
            mapRef.current = null;
        }

        try {
            const isDarkMode = theme === 'dark';
            const styleUrl = isDarkMode
                ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
                : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

            const map = new maplibregl.Map({
                container: mapContainerRef.current,
                style: styleUrl,
                center: [centerCoords.lng, centerCoords.lat],
                zoom: 16.8,
                pitch: mapPitch,
                bearing: -15,
                attributionControl: false,
            });

            map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

            map.on('load', () => {
                applyRoleMapStyle(map, 'driver', isDarkMode);
            });

            mapRef.current = map;
        } catch (err) {
            console.warn("Driver MapLibre initialization failed:", err);
        }

        return () => {
            if (driverMarkerRef.current) {
                driverMarkerRef.current.remove();
                driverMarkerRef.current = null;
            }
            passengerMarkersRef.current.forEach((marker) => marker.remove());
            passengerMarkersRef.current.clear();
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [theme]);

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

    // Update Driver Vehicle & Passenger Markers
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        // Driver Vehicle Marker (Pure Navigation Arrow - No Text)
        try {
            if (!driverMarkerRef.current) {
                const el = document.createElement('div');
                el.className = 'relative flex items-center justify-center cursor-pointer group';
                el.innerHTML = `
                    <div class="absolute w-14 h-14 rounded-full bg-cyan-400/30 border border-cyan-400/60 animate-ping pointer-events-none"></div>
                    <div class="relative z-10 w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 text-black flex items-center justify-center shadow-2xl border-2 border-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                    </div>
                `;
                driverMarkerRef.current = new maplibregl.Marker({
                    element: el,
                    rotationAlignment: 'viewport',
                    pitchAlignment: 'viewport',
                })
                    .setLngLat([centerCoords.lng, centerCoords.lat])
                    .addTo(map);
            } else {
                driverMarkerRef.current.setLngLat([centerCoords.lng, centerCoords.lat]);
            }
        } catch (e) {
            console.warn("Driver marker render error:", e);
        }

        // Passenger Markers (3D White Stickman Pins - No Text Badges)
        try {
            const currentKeys = new Set<string>();
            nearbyPassengers.forEach((p) => {
                currentKeys.add(p.id);
                if (passengerMarkersRef.current.has(p.id)) {
                    passengerMarkersRef.current.get(p.id)!.setLngLat([p.lng, p.lat]);
                } else {
                    const el = document.createElement('div');
                    el.className = 'cursor-pointer group relative flex flex-col items-center justify-center';
                    el.innerHTML = `
                        <div class="absolute w-20 h-20 rounded-full bg-emerald-400/35 border-2 border-emerald-400/70 animate-ping pointer-events-none"></div>
                        <div class="relative z-10 w-16 h-20 flex items-center justify-center filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.8)] drop-shadow-[0_0_20px_rgba(16,185,129,1)] transition-transform group-hover:scale-125">
                            <img src="/commuter-stickman.png" alt="Commuter" class="w-full h-full object-contain filter brightness-115 contrast-105" />
                        </div>
                    `;
                    el.addEventListener('click', () => handleAcceptPickup(p));
                    const marker = new maplibregl.Marker({
                        element: el,
                        rotationAlignment: 'viewport',
                        pitchAlignment: 'viewport',
                    })
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
    }, [centerCoords, nearbyPassengers]);

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
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center font-sans space-y-4 text-slate-900 dark:text-white transition-colors duration-300">
            
            {/* Driver Approach Proximity Notifier (200m, 100m, 50m, 10m alerts) */}
            <DriverApproachNotifier
                driverCoords={driverCoords}
                isOnDuty={Boolean(driverData.isDuty)}
            />

            {/* GPS Warning Banner */}
            {gpsStatus === 'denied' && (
                <div className="w-full p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2 font-mono">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>GPS fallback applied. Enable browser GPS for precise proximity telemetry.</span>
                </div>
            )}

            {/* TOP CYBERPUNK HUD TELEMETRY STRIP */}
            <div className={`w-full p-4 rounded-3xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${cardRoleStyle('driver')}`}>
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                    <span className={`font-black tracking-wider uppercase ${roleAccentText('driver')}`}>
                        DRIVER MISSION CONTROL • HUD ONLINE
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${rolePill('driver')}`}>
                        {driverData.isDuty ? 'ON DUTY • GPS BROADCASTING' : 'OFF DUTY'}
                    </span>
                </div>

                <div className="flex items-center gap-6 font-bold text-slate-700 dark:text-slate-300">
                    <span className={`flex items-center gap-1.5 ${roleAccentText('driver')}`}>
                        <Gauge className="w-3.5 h-3.5" /> ~22 KM/H SPEED
                    </span>
                    <span className={`flex items-center gap-1.5 ${roleAccentText('driver')}`}>
                        <Radio className="w-3.5 h-3.5 animate-pulse" /> {nearbyPassengers.length} PASSENGERS IN RADAR
                    </span>
                    <span className={`font-black ${roleAccentText('driver')}`}>STELLAR TESTNET</span>
                </div>
            </div>

            {/* MAIN DRIVER OPERATIONAL MAP */}
            <div className="w-full bg-slate-100 dark:bg-[#050505] border border-cyan-500/30 rounded-[2.5rem] p-3 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[480px]">
                <div className="w-full h-[460px] rounded-[2rem] overflow-hidden relative border border-slate-300 dark:border-white/10">
                    <div ref={mapContainerRef} className="w-full h-full" />
                    
                    {/* CUSTOM RADIAL HUD FLOATING CONTROLS */}
                    <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
                        <button
                            onClick={recenterMap}
                            title="Locate Driver"
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform backdrop-blur-md border ${rolePill('driver')}`}
                        >
                            <Navigation className="w-5 h-5" />
                        </button>
                        <button
                            onClick={togglePitch}
                            title="Toggle 45° Cockpit Pitch"
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform backdrop-blur-md text-xs font-mono font-black border ${rolePill('driver')}`}
                        >
                            {mapPitch}°
                        </button>
                    </div>

                    {/* PROXIMITY ARRIVAL BANNER */}
                    {nearestPassenger && nearestPassenger.distKm <= 0.2 && (
                        <div className="absolute top-4 left-4 right-16 z-30 p-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl text-black font-black text-xs font-mono flex items-center justify-between shadow-[0_0_25px_rgba(255,107,0,0.8)] animate-pulse">
                            <span>📳 ARRIVING AT PASSENGER PICKUP POINT ({formatDistance(nearestPassenger.distKm)})</span>
                            <span className="px-2 py-0.5 rounded bg-black text-orange-400 text-[10px]">PREPARE STOP</span>
                        </div>
                    )}
                </div>
            </div>

            {/* PASSENGER DISPATCH QUEUE */}
            <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm uppercase tracking-widest font-mono flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <Radio className={`w-4 h-4 animate-pulse ${roleAccentText('driver')}`} />
                        Passenger Dispatch Queue ({driverVehicleType})
                    </h4>
                    <span className={`text-xs font-mono font-bold ${roleAccentText('driver')}`}>
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
                                    className={`p-5 rounded-3xl shadow-xl flex items-center justify-between gap-4 transition-all ${cardRoleStyle('driver')}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-black text-xl shadow-sm ${rolePill('driver')}`}>
                                            📡
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-black text-sm text-slate-900 dark:text-white">
                                                    Waiting Passenger
                                                </h5>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${rolePill('driver')}`}>
                                                    Target: {pass.preferredVehicleType || 'All'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                                {formattedDist} • ETA: {eta}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleAcceptPickup(pass)}
                                        disabled={acceptingId === pass.id}
                                        className={`px-5 py-3 font-black text-xs rounded-2xl transition-all shadow-md flex items-center gap-1.5 hover:scale-105 ${roleCtaBg('driver')}`}
                                    >
                                        <Check className="w-4 h-4" /> Accept Pickup
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={`p-8 rounded-3xl text-center space-y-2 font-mono ${cardRoleStyle('driver')}`}>
                        <Radio className={`w-8 h-8 mx-auto animate-pulse ${roleAccentText('driver')}`} />
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white">No Passengers Waiting Nearby</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Waiting passengers requesting {driverVehicleType} will automatically appear in your Mission Control HUD.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverOperationsMap;
