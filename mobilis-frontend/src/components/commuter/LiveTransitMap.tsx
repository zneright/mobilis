import React, { useState, useEffect, useRef, useMemo, Component } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm, calculateBearing, calculateETA, formatDistance } from '../../utils/geo';
import { playCommuterChime } from '../../utils/webAudio';
import { Navigation, MapPin, Zap, EyeOff, ShieldCheck, Filter, Bell, Check } from 'lucide-react';
import type { DriverLocationDoc } from '../../types';

interface LiveTransitMapProps {
    commuterCoords: { lat: number; lng: number };
    activeDrivers: DriverLocationDoc[];
    onSelectVehicleToPay?: (driverDoc: DriverLocationDoc) => void;
    commuterUid?: string;
}

interface AnonymizedVehicle {
    anonId: string;
    vehicleType: string;
    lat: number;
    lng: number;
    distanceKm: number;
    formattedDistance: string;
    bearing: { angle: number; cardinal: string };
    eta: string;
    icon: string;
    rawDoc: DriverLocationDoc;
}

function isWebGlAvailable(): boolean {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(
            (window.WebGL2RenderingContext || window.WebGLRenderingContext) &&
            (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch {
        return false;
    }
}

export const LiveTransitMap: React.FC<LiveTransitMapProps> = ({
    commuterCoords,
    activeDrivers,
    onSelectVehicleToPay,
    commuterUid,
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const commuterMarkerRef = useRef<maplibregl.Marker | null>(null);

    const [selectedAnonId, setSelectedAnonId] = useState<string | null>(null);
    const [vehicleFilter, setVehicleFilter] = useState<string>('all');
    const [webGlSupported, setWebGlSupported] = useState<boolean>(true);
    const [displayMode, setDisplayMode] = useState<'maplibre' | 'sonar'>('sonar');
    const [notifyingId, setNotifyingId] = useState<string | null>(null);
    const [notifySuccessMsg, setNotifySuccessMsg] = useState<string>('');

    const handleNotifyVehicleDriver = async (v: AnonymizedVehicle) => {
        if (!commuterUid || !commuterCoords) return;
        setNotifyingId(v.anonId);

        try {
            const expirationTime = new Date(Date.now() + 10 * 60 * 1000);
            await setDoc(doc(db, 'waiting_beacons', commuterUid), {
                commuterUid,
                lat: commuterCoords.lat,
                lng: commuterCoords.lng,
                active: true,
                preferredVehicleType: v.vehicleType,
                createdAt: new Date().toISOString(),
                expiresAt: expirationTime.toISOString(),
            });

            playCommuterChime();
            setNotifySuccessMsg(`Notified nearby ${v.vehicleType} drivers!`);
            setTimeout(() => setNotifySuccessMsg(''), 5000);
        } catch (err) {
            console.error("Failed to notify vehicle driver:", err);
        } finally {
            setNotifyingId(null);
        }
    };

    // Check WebGL availability on mount
    useEffect(() => {
        const supported = isWebGlAvailable();
        setWebGlSupported(supported);
        if (supported) {
            setDisplayMode('maplibre');
        } else {
            setDisplayMode('sonar');
        }
    }, []);

    // Transform raw driver documents into Privacy-First Anonymized Vehicles
    const anonymizedVehicles: AnonymizedVehicle[] = useMemo(() => {
        return activeDrivers.map((drv) => {
            const hash = drv.uid.substring(0, 4).toUpperCase();
            const anonId = `Vehicle #${hash}`;

            const vehicleType = drv.vehicleType || 'Tricycle';
            let icon = '🛺';
            if (vehicleType === 'Jeepney') icon = '🛻';
            else if (vehicleType === 'UV Express') icon = '🚐';
            else if (vehicleType === 'Bus') icon = '🚌';
            else if (vehicleType === 'E-Vehicle') icon = '🚙';
            else if (vehicleType === 'Motorcycle') icon = '🛵';

            const distKm = calculateDistanceKm(commuterCoords.lat, commuterCoords.lng, drv.lat, drv.lng);
            const bearing = calculateBearing(commuterCoords.lat, commuterCoords.lng, drv.lat, drv.lng);
            const eta = calculateETA(distKm);

            return {
                anonId,
                vehicleType,
                lat: drv.lat,
                lng: drv.lng,
                distanceKm: distKm,
                formattedDistance: formatDistance(distKm),
                bearing,
                eta,
                icon,
                rawDoc: drv,
            };
        }).sort((a, b) => a.distanceKm - b.distanceKm);
    }, [activeDrivers, commuterCoords]);

    // Filtered Vehicles by category
    const filteredVehicles = useMemo(() => {
        if (vehicleFilter === 'all') return anonymizedVehicles;
        return anonymizedVehicles.filter((v) => v.vehicleType.toLowerCase() === vehicleFilter.toLowerCase());
    }, [anonymizedVehicles, vehicleFilter]);

    // Vehicle Density Summary
    const vehicleCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        anonymizedVehicles.forEach((v) => {
            counts[v.vehicleType] = (counts[v.vehicleType] || 0) + 1;
        });
        return counts;
    }, [anonymizedVehicles]);

    const activeVehicleSummary = useMemo(() => {
        const entries = Object.entries(vehicleCounts);
        if (entries.length === 0) return 'No vehicles broadcasting within 50m radius';
        return entries
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(' • ') + ' Approaching Nearby';
    }, [vehicleCounts]);

    const selectedVehicle = useMemo(() => {
        return filteredVehicles.find((v) => v.anonId === selectedAnonId) || filteredVehicles[0] || null;
    }, [filteredVehicles, selectedAnonId]);

    // Initialize MapLibre GL Vector Map safely with WebGL fallback
    useEffect(() => {
        if (displayMode !== 'maplibre' || !mapContainerRef.current || mapRef.current) return;

        // Check WebGL availability before constructing map
        if (!isWebGlAvailable()) {
            console.warn("MapLibre GL WebGL context unavailable in current environment. Falling back to Sonar Radar.");
            setWebGlSupported(false);
            setDisplayMode('sonar');
            return;
        }

        try {
            const isDarkMode = document.documentElement.classList.contains('dark');
            const styleUrl = isDarkMode
                ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
                : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

            const map = new maplibregl.Map({
                container: mapContainerRef.current,
                style: styleUrl,
                center: [commuterCoords.lng, commuterCoords.lat],
                zoom: 16.5,
                pitch: 35,
                bearing: 0,
                attributionControl: false,
            });

            map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
            mapRef.current = map;
            setWebGlSupported(true);
        } catch (err) {
            console.warn("WebGL initialization failed:", err);
            setWebGlSupported(false);
            setDisplayMode('sonar');
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [displayMode, commuterCoords]);

    // Update Commuter Marker & Center Map on GPS updates
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        try {
            if (!commuterMarkerRef.current) {
                const el = document.createElement('div');
                el.className = 'relative flex items-center justify-center';
                el.innerHTML = `
                    <div class="absolute w-12 h-12 rounded-full bg-cyan-400/30 border border-cyan-400/60 animate-ping"></div>
                    <div class="relative z-10 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-mono font-black flex items-center gap-1.5 shadow-[0_0_25px_rgba(0,210,255,1)] border-2 border-white text-xs whitespace-nowrap">
                        <span>📍 YOU (MY LOCATION)</span>
                    </div>
                `;

                commuterMarkerRef.current = new maplibregl.Marker({ element: el })
                    .setLngLat([commuterCoords.lng, commuterCoords.lat])
                    .addTo(map);
            } else {
                commuterMarkerRef.current.setLngLat([commuterCoords.lng, commuterCoords.lat]);
            }

            map.easeTo({ center: [commuterCoords.lng, commuterCoords.lat], duration: 1000 });
        } catch (err) {
            console.warn("Error updating commuter marker:", err);
        }
    }, [commuterCoords]);

    // Update Vehicle Markers on MapLibre Canvas
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const currentMarkerKeys = new Set<string>();

        try {
            filteredVehicles.forEach((v) => {
                currentMarkerKeys.add(v.anonId);
                const isSelected = selectedAnonId === v.anonId;

                const vt = v.vehicleType.toLowerCase();
                let gradientClass = 'from-cyan-400 to-emerald-400';
                let glowClass = 'shadow-[0_0_20px_rgba(0,210,255,0.9)]';

                if (vt.includes('jeepney')) {
                    gradientClass = 'from-blue-600 to-cyan-500';
                    glowClass = 'shadow-[0_0_20px_rgba(0,136,255,0.9)]';
                } else if (vt.includes('tricycle')) {
                    gradientClass = 'from-emerald-500 to-teal-400';
                    glowClass = 'shadow-[0_0_20px_rgba(0,210,106,0.9)]';
                } else if (vt.includes('express') || vt.includes('uv') || vt.includes('shuttle')) {
                    gradientClass = 'from-amber-500 to-yellow-400';
                    glowClass = 'shadow-[0_0_20px_rgba(255,153,0,0.9)]';
                } else if (vt.includes('bus')) {
                    gradientClass = 'from-purple-600 to-indigo-500';
                    glowClass = 'shadow-[0_0_20px_rgba(139,92,246,0.9)]';
                } else if (vt.includes('motorcycle') || vt.includes('habal')) {
                    gradientClass = 'from-rose-500 to-red-400';
                    glowClass = 'shadow-[0_0_20px_rgba(255,59,48,0.9)]';
                } else if (vt.includes('taxi')) {
                    gradientClass = 'from-yellow-400 to-amber-300';
                    glowClass = 'shadow-[0_0_20px_rgba(255,204,0,0.9)]';
                }

                if (markersRef.current.has(v.anonId)) {
                    const marker = markersRef.current.get(v.anonId)!;
                    marker.setLngLat([v.lng, v.lat]);
                    marker.setRotation(v.bearing.angle);
                } else {
                    const el = document.createElement('div');
                    el.className = 'cursor-pointer group relative flex items-center justify-center';
                    el.innerHTML = `
                        <div class="absolute w-12 h-12 rounded-full bg-white/20 border border-white/50 animate-ping"></div>
                        <div class="relative z-10 w-11 h-11 rounded-full bg-gradient-to-tr ${gradientClass} p-0.5 ${glowClass} ${isSelected ? 'scale-125 border-4 border-white' : 'border-2 border-white'} group-hover:scale-125 transition-transform flex items-center justify-center shadow-2xl">
                            <span class="text-xl">${v.icon}</span>
                        </div>
                        <div class="absolute -bottom-6 px-2 py-0.5 rounded-full bg-[#070A12]/95 border border-white/20 text-[9px] font-mono font-black text-white shadow-xl whitespace-nowrap">
                            ${v.vehicleType} (${v.anonId})
                        </div>
                    `;

                    el.addEventListener('click', () => {
                        setSelectedAnonId(v.anonId);
                    });

                    const marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
                        .setLngLat([v.lng, v.lat])
                        .setRotation(v.bearing.angle)
                        .addTo(map);

                    markersRef.current.set(v.anonId, marker);
                }
            });

            markersRef.current.forEach((marker, key) => {
                if (!currentMarkerKeys.has(key)) {
                    marker.remove();
                    markersRef.current.delete(key);
                }
            });
        } catch (err) {
            console.warn("Error updating vehicle markers on map:", err);
        }
    }, [filteredVehicles, selectedAnonId]);

    // Sonar Radar Offsets Calculation
    const getRadarOffsets = (vLat: number, vLng: number) => {
        const deltaLat = (vLat - commuterCoords.lat) * 20000;
        const deltaLng = (vLng - commuterCoords.lng) * 20000;
        const x = Math.max(-120, Math.min(120, deltaLng));
        const y = Math.max(-120, Math.min(120, -deltaLat));
        return { x, y };
    };

    return (
        <div className="w-full space-y-6 text-slate-900 dark:text-white font-sans">
            
            {/* PRIVACY GUARANTEE & VEHICLE DENSITY BAR */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3 text-center sm:text-left">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                                {webGlSupported ? 'MapLibre Vector Engine' : '50m Sonar Engine'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">100% Privacy Redacted</span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                            {activeVehicleSummary}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => {
                            if (!webGlSupported) return;
                            setDisplayMode('maplibre');
                        }}
                        disabled={!webGlSupported}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                            displayMode === 'maplibre'
                                ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-md'
                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 disabled:opacity-40'
                        }`}
                    >
                        🗺️ MapLibre GL Map {!webGlSupported && '(WebGL Unavailable)'}
                    </button>
                    <button
                        onClick={() => setDisplayMode('sonar')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                            displayMode === 'sonar'
                                ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-md'
                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400'
                        }`}
                    >
                        🌐 50m Sonar Radar
                    </button>
                </div>
            </div>

            {/* VEHICLE CATEGORY FILTER PILLS */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 text-xs">
                <span className="text-slate-400 dark:text-gray-500 font-mono font-bold flex items-center gap-1 uppercase tracking-wider pr-1">
                    <Filter className="w-3.5 h-3.5" /> Filter:
                </span>
                {[
                    { label: 'All Vehicles', value: 'all' },
                    { label: '🛻 Jeepney', value: 'jeepney' },
                    { label: '🛺 Tricycle', value: 'tricycle' },
                    { label: '🚐 UV Express', value: 'uv express' },
                    { label: '🚌 Bus', value: 'bus' },
                    { label: '🚙 E-Vehicle', value: 'e-vehicle' },
                    { label: '🛵 Motorcycle', value: 'motorcycle' },
                ].map((pill) => (
                    <button
                        key={pill.value}
                        onClick={() => setVehicleFilter(pill.value)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold font-mono whitespace-nowrap transition-all border ${
                            vehicleFilter === pill.value
                                ? 'bg-cyan-500 text-black border-cyan-400 font-black shadow-md'
                                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        {pill.label}
                    </button>
                ))}
            </div>

            {/* DISPLAY MODE 1: MAPLIBRE GL JS VECTOR MAP */}
            {displayMode === 'maplibre' && webGlSupported ? (
                <div className="relative w-full h-[420px] rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl">
                    <div ref={mapContainerRef} className="w-full h-full" />
                    
                    <div className="absolute top-4 left-4 z-10 p-3 bg-slate-900/90 dark:bg-black/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl text-[11px] text-white space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                            <Navigation className="w-3.5 h-3.5" /> Live Vector Transit Map
                        </div>
                        <p className="text-[10px] text-gray-300">
                            Tap any anonymized vehicle marker to view ETA and initiate instant Stellar fare payment.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            if (mapRef.current) {
                                mapRef.current.flyTo({ center: [commuterCoords.lng, commuterCoords.lat], zoom: 17, duration: 1000 });
                            }
                        }}
                        title="Locate My Position"
                        className="absolute bottom-4 right-4 z-20 w-11 h-11 rounded-2xl bg-[#0A0D14]/90 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg hover:scale-110 transition-transform backdrop-blur-md"
                    >
                        <Navigation className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                /* DISPLAY MODE 2: SONAR RADAR CANVAS (FALLBACK & NATIVE DISPLAY) */
                <div className="relative w-full h-[420px] rounded-[2.5rem] bg-white dark:bg-[#07090E] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl flex items-center justify-center transition-colors duration-300">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[340px] h-[340px] rounded-full border border-emerald-500/10 animate-pulse" />
                        <div className="w-[240px] h-[240px] rounded-full border border-emerald-500/20" />
                        <div className="w-[140px] h-[140px] rounded-full border border-emerald-500/30" />
                        <div className="absolute w-[340px] h-[340px] rounded-full border-t-2 border-emerald-500/40 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>

                    <div className="relative z-20 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-cyan-500 text-black flex items-center justify-center font-black shadow-[0_0_20px_rgba(0,210,255,0.6)] animate-bounce">
                            <Navigation className="w-5 h-5 fill-current" />
                        </div>
                        <span className="px-2 py-0.5 mt-1 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[9px] font-mono font-bold border border-cyan-500/30">
                            Your Pickup Location
                        </span>
                    </div>

                    {filteredVehicles.map((v) => {
                        const { x, y } = getRadarOffsets(v.lat, v.lng);
                        const isSelected = selectedVehicle?.anonId === v.anonId;

                        return (
                            <div
                                key={v.anonId}
                                onClick={() => setSelectedAnonId(v.anonId)}
                                style={{ transform: `translate(${x}px, ${y}px)` }}
                                className="absolute z-30 cursor-pointer transition-all duration-700 ease-out flex flex-col items-center"
                            >
                                <div className="w-1 h-8 bg-gradient-to-t from-emerald-500/40 to-transparent rounded-full mb-1 animate-pulse" />
                                <div
                                    className={`p-2.5 rounded-2xl flex items-center gap-1.5 shadow-xl transition-all ${
                                        isSelected
                                            ? 'bg-emerald-500 text-black scale-110 shadow-[0_0_25px_rgba(52,211,153,0.8)] border-2 border-white'
                                            : 'bg-slate-900/90 text-white dark:bg-white/10 border border-slate-200 dark:border-white/20 hover:scale-105'
                                    }`}
                                >
                                    <span className="text-lg">{v.icon}</span>
                                    <span className="text-[10px] font-black font-mono">{v.anonId}</span>
                                    <span className="text-[9px] font-mono opacity-80">({v.eta})</span>
                                </div>
                            </div>
                        );
                    })}

                    <div className="absolute bottom-4 left-4 z-20 p-3 bg-slate-900/90 dark:bg-black/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl text-[11px] text-white space-y-1 max-w-xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                            <MapPin className="w-3.5 h-3.5" /> Suggested Boarding Point
                        </div>
                        <p className="text-[10px] text-gray-300">
                            Stand safely on the near sidewalk 15m ahead along the vehicle route vector.
                        </p>
                    </div>
                </div>
            )}

            {/* SELECTED ANONYMIZED VEHICLE ETA DETAILS & PAY FARE CARD */}
            {selectedVehicle && (
                <div className="p-6 rounded-[2.5rem] bg-white dark:bg-[#121418] border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 transition-colors duration-300">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-3xl shadow-sm">
                                {selectedVehicle.icon}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-lg text-slate-900 dark:text-white">
                                        {selectedVehicle.vehicleType} <span className="text-emerald-500 font-mono">({selectedVehicle.anonId})</span>
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold border border-emerald-500/20">
                                        ON TRANSIT
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                                    {selectedVehicle.formattedDistance} • Heading {selectedVehicle.bearing.cardinal} ({selectedVehicle.bearing.angle}°)
                                </p>
                            </div>
                        </div>

                        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-right">
                                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                                    {selectedVehicle.eta}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Average Speed ~20 km/h</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {commuterUid && (
                                    <button
                                        onClick={() => handleNotifyVehicleDriver(selectedVehicle)}
                                        disabled={notifyingId === selectedVehicle.anonId}
                                        className="px-5 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs rounded-2xl transition-all shadow-[0_0_20px_rgba(0,210,255,0.4)] flex items-center gap-1.5 hover:scale-105"
                                    >
                                        <Bell className="w-4 h-4" /> Notify Driver
                                    </button>
                                )}
                                {onSelectVehicleToPay && (
                                    <button
                                        onClick={() => onSelectVehicleToPay(selectedVehicle.rawDoc)}
                                        className="px-5 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-2xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] flex items-center gap-2 hover:scale-105"
                                    >
                                        <Zap className="w-4 h-4" /> Pay Fare
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {notifySuccessMsg && (
                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold rounded-2xl flex items-center gap-2 animate-bounce">
                            <Check className="w-4 h-4" /> {notifySuccessMsg}
                        </div>
                    )}

            {/* Privacy Guarantee Footer */}
                    <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-400 dark:text-gray-500 font-mono">
                        <span className="flex items-center gap-1">
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" /> Driver personal info redacted by Mobilis Privacy Layer
                        </span>
                        <span className="text-cyan-500 font-bold">Stellar Testnet Ledger Ready</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export class LiveTransitMapErrorBoundary extends Component<
    { children: React.ReactNode; fallback?: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.warn("LiveTransitMap Error Boundary caught rendering error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-2 text-white font-mono text-xs">
                    <p className="text-amber-400 font-bold">
                        ⚠️ Live Vector Map Engine Unavailable in Current Environment
                    </p>
                    <p className="text-slate-400">
                        Active drivers remain visible on the 50m Sonar Radar canvas.
                    </p>
                </div>
            );
        }
        return this.props.children;
    }
}

export default LiveTransitMap;
