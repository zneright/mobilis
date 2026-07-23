import React, { useState, useEffect, useRef, useMemo, Component } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm, calculateBearing, calculateETA, formatDistance } from '../../utils/geo';
import { playCommuterChime } from '../../utils/webAudio';
import { applyRoleMapStyle } from '../../utils/mapStyle';
import { Zap, Filter, Bell, Check, Navigation, MapPin, X } from 'lucide-react';
import { cardRoleStyle, roleCtaBg, rolePill, roleAccentText } from '../tabs/roleStyleTokens';
import type { DriverLocationDoc } from '../../types';

interface LiveTransitMapProps {
    commuterCoords: { lat: number; lng: number };
    activeDrivers: DriverLocationDoc[];
    onSelectVehicleToPay?: (driverDoc: DriverLocationDoc) => void;
    commuterUid?: string;
    theme?: 'dark' | 'light';
    vehicleFilter?: string;
    setVehicleFilter?: (filter: string) => void;
    userRole?: 'commuter' | 'driver' | 'coop' | 'admin';
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
    theme = 'dark',
    vehicleFilter: propVehicleFilter,
    setVehicleFilter: propSetVehicleFilter,
    userRole = 'commuter',
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const commuterMarkerRef = useRef<maplibregl.Marker | null>(null);

    const [selectedAnonId, setSelectedAnonId] = useState<string | null>(null);
    const [internalFilter, setInternalFilter] = useState<string>('All');

    const vehicleFilter = propVehicleFilter !== undefined ? propVehicleFilter : internalFilter;
    const setVehicleFilter = propSetVehicleFilter || setInternalFilter;

    const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
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
            if (vehicleType === 'E-Jeepney') icon = '⚡🚍';
            else if (vehicleType === 'Jeepney') icon = '🛻';
            else if (vehicleType === 'E-Trike') icon = '⚡🛺';
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

    // Filtered Vehicles by exact category
    const filteredVehicles = useMemo(() => {
        if (!vehicleFilter || vehicleFilter.toLowerCase() === 'all') return anonymizedVehicles;
        const target = vehicleFilter.trim().toLowerCase();

        return anonymizedVehicles.filter((v) => {
            const vt = (v.vehicleType || '').trim().toLowerCase();

            if (target === 'e-jeepney' || target === 'ejeepney' || target === 'modern e-jeepney') {
                return vt.includes('e-jeepney') || vt === 'ejeepney' || vt.includes('modern');
            }
            if (target === 'jeepney' || target === 'traditional jeepney') {
                return vt.includes('jeepney') && !vt.includes('e-jeepney') && !vt.includes('ejeepney') && !vt.includes('modern');
            }
            if (target === 'e-trike' || target === 'etrike') {
                return vt.includes('e-trike') || vt === 'etrike';
            }
            if (target === 'tricycle') {
                return vt.includes('tricycle') && !vt.includes('e-trike') && !vt.includes('etrike');
            }
            if (target === 'uv express' || target === 'uv') {
                return vt.includes('uv') || vt.includes('express');
            }
            if (target === 'bus') {
                return vt.includes('bus');
            }

            return vt.includes(target);
        });
    }, [anonymizedVehicles, vehicleFilter]);


    const selectedVehicle = useMemo(() => {
        return filteredVehicles.find((v) => v.anonId === selectedAnonId) || filteredVehicles[0] || null;
    }, [filteredVehicles, selectedAnonId]);

    // Initialize MapLibre GL Vector Map safely with WebGL fallback and dynamic theme switching
    useEffect(() => {
        if (displayMode !== 'maplibre' || !mapContainerRef.current) return;

        if (!isWebGlAvailable()) {
            console.warn("MapLibre GL WebGL context unavailable in current environment. Falling back to Sonar Radar.");
            setWebGlSupported(false);
            setDisplayMode('sonar');
            return;
        }

        // Clean up previous map instance if re-initializing for theme change
        if (mapRef.current) {
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current.clear();
            if (commuterMarkerRef.current) {
                commuterMarkerRef.current.remove();
                commuterMarkerRef.current = null;
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
                center: [commuterCoords.lng, commuterCoords.lat],
                zoom: 16.5,
                pitch: 35,
                bearing: 0,
                attributionControl: false,
            });

            map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

            map.on('load', () => {
                applyRoleMapStyle(map, 'commuter', isDarkMode);
            });

            mapRef.current = map;
            setWebGlSupported(true);
        } catch (err) {
            console.warn("WebGL initialization failed:", err);
            setWebGlSupported(false);
            setDisplayMode('sonar');
        }

        return () => {
            if (commuterMarkerRef.current) {
                commuterMarkerRef.current.remove();
                commuterMarkerRef.current = null;
            }
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current.clear();
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [displayMode, theme]);

    // Update Commuter / Driver User Marker & Center Map on GPS updates
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        try {
            if (!commuterMarkerRef.current) {
                const el = document.createElement('div');
                el.className = 'relative flex items-center justify-center cursor-pointer group';

                if (userRole === 'driver') {
                    // DRIVER USER: Directional Navigation Arrow Pin
                    el.innerHTML = `
                        <div class="absolute w-14 h-14 rounded-full bg-cyan-400/30 border border-cyan-400/60 animate-ping pointer-events-none"></div>
                        <div class="relative z-10 w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 p-2 text-black flex items-center justify-center shadow-2xl border-2 border-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                        </div>
                    `;
                } else {
                    // COMMUTER USER: Pure 3D White Stickman Pin (No Letters, Larger Size)
                    el.innerHTML = `
                        <div class="absolute w-24 h-24 rounded-full bg-emerald-400/35 border-2 border-emerald-400/70 animate-ping pointer-events-none"></div>
                        <div class="relative z-10 flex items-center justify-center group">
                            <div class="w-20 h-24 flex items-center justify-center filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.8)] drop-shadow-[0_0_20px_rgba(16,185,129,1)] transition-transform group-hover:scale-125">
                                <img src="/commuter-stickman.png" alt="Commuter" class="w-full h-full object-contain filter brightness-115 contrast-105" />
                            </div>
                        </div>
                    `;
                }

                commuterMarkerRef.current = new maplibregl.Marker({
                    element: el,
                    rotationAlignment: 'viewport',
                    pitchAlignment: 'viewport',
                })
                    .setLngLat([commuterCoords.lng, commuterCoords.lat])
                    .addTo(map);
            } else {
                commuterMarkerRef.current.setLngLat([commuterCoords.lng, commuterCoords.lat]);
            }

            map.easeTo({ center: [commuterCoords.lng, commuterCoords.lat], duration: 1000 });
        } catch (err) {
            console.warn("Error updating user marker:", err);
        }
    }, [commuterCoords, displayMode, userRole]);

    // Update Vehicle Markers on MapLibre Canvas (Color-Coded Circles + Speed Badge)
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const currentMarkerKeys = new Set<string>();

        try {
            filteredVehicles.forEach((v) => {
                currentMarkerKeys.add(v.anonId);
                const isSelected = selectedAnonId === v.anonId;

                const vt = v.vehicleType.toLowerCase();
                let gradientClass = 'from-emerald-500 to-teal-400';
                let glowClass = 'shadow-[0_0_20px_rgba(16,185,129,0.9)]';

                if (vt.includes('e-jeepney') || vt === 'ejeepney') {
                    gradientClass = 'from-emerald-500 to-teal-400';
                    glowClass = 'shadow-[0_0_20px_rgba(16,185,129,0.9)]';
                } else if (vt.includes('jeepney')) {
                    gradientClass = 'from-amber-500 to-yellow-400';
                    glowClass = 'shadow-[0_0_20px_rgba(245,158,11,0.9)]';
                } else if (vt.includes('e-trike') || vt === 'etrike') {
                    gradientClass = 'from-teal-400 to-emerald-400';
                    glowClass = 'shadow-[0_0_20px_rgba(20,184,166,0.9)]';
                } else if (vt.includes('tricycle')) {
                    gradientClass = 'from-cyan-500 to-blue-400';
                    glowClass = 'shadow-[0_0_20px_rgba(6,182,212,0.9)]';
                } else if (vt.includes('express') || vt.includes('uv') || vt.includes('shuttle')) {
                    gradientClass = 'from-purple-500 to-pink-400';
                    glowClass = 'shadow-[0_0_20px_rgba(168,85,247,0.9)]';
                } else if (vt.includes('bus')) {
                    gradientClass = 'from-indigo-600 to-violet-500';
                    glowClass = 'shadow-[0_0_20px_rgba(99,102,241,0.9)]';
                } else if (vt.includes('motorcycle') || vt.includes('habal')) {
                    gradientClass = 'from-rose-500 to-red-400';
                    glowClass = 'shadow-[0_0_20px_rgba(244,63,94,0.9)]';
                }

                const vehicleSpeed = typeof v.rawDoc.speed === 'number' && v.rawDoc.speed > 0 ? Math.round(v.rawDoc.speed) : 20;

                if (markersRef.current.has(v.anonId)) {
                    const marker = markersRef.current.get(v.anonId)!;
                    marker.setLngLat([v.lng, v.lat]);
                } else {
                    const el = document.createElement('div');
                    el.className = 'cursor-pointer group relative flex items-center justify-center';
                    el.innerHTML = `
                        <div class="absolute w-10 h-10 rounded-full bg-white/20 border border-white/50 animate-ping pointer-events-none"></div>
                        <div class="relative z-10 w-9 h-9 rounded-full bg-gradient-to-tr ${gradientClass} ${glowClass} ${isSelected ? 'scale-125 border-4 border-white' : 'border-2 border-white'} group-hover:scale-125 transition-transform flex items-center justify-center text-white shadow-2xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="transform: rotate(${v.bearing.angle}deg);" class="transition-transform duration-500"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
                            <span class="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-slate-950 text-white font-mono font-black text-[9px] border border-white/30 shadow-md">
                                ${vehicleSpeed}
                            </span>
                        </div>
                    `;

                    el.addEventListener('click', () => {
                        setSelectedAnonId(v.anonId);
                    });

                    const marker = new maplibregl.Marker({
                        element: el,
                        rotationAlignment: 'viewport',
                        pitchAlignment: 'viewport',
                    })
                        .setLngLat([v.lng, v.lat])
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
        <div className="w-full space-y-6 text-slate-900 dark:text-white font-sans transition-colors duration-300">

            {/* DISPLAY MODE 1: MAPLIBRE GL JS VECTOR MAP */}
            {displayMode === 'maplibre' && webGlSupported ? (
                <div className="relative w-full h-[460px] rounded-3xl overflow-hidden border border-gray-100 dark:border-white/10 shadow-md">
                    <div ref={mapContainerRef} className="w-full h-full" />

                    <div className="absolute top-4 left-4 z-10 p-3 bg-white/90 dark:bg-[#07090E]/90 backdrop-blur-md border border-gray-100 dark:border-white/10 rounded-2xl text-[11px] text-gray-900 dark:text-white space-y-0.5 shadow-sm font-sans">
                        <div className={`flex items-center gap-1.5 font-extrabold font-mono ${roleAccentText('commuter')}`}>
                            <Navigation className="w-3.5 h-3.5" /> Live Vector Transit Map
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono">
                            Tap any vehicle marker pin to view ETA and pay fare.
                        </p>
                    </div>

                    {/* Floating Map Filter Button */}
                    <button
                        onClick={() => setShowFilterModal(true)}
                        className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-2xl bg-white/90 dark:bg-[#07090E]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-md font-mono text-xs font-bold flex items-center gap-1.5 hover:scale-105 transition-all text-slate-900 dark:text-white"
                    >
                        <Filter className={`w-3.5 h-3.5 ${roleAccentText('commuter')}`} />
                        <span>Filter ({vehicleFilter})</span>
                    </button>

                    {/* Floating Locate Button */}
                    <button
                        onClick={() => {
                            if (mapRef.current) {
                                mapRef.current.flyTo({ center: [commuterCoords.lng, commuterCoords.lat], zoom: 17, duration: 1000 });
                            }
                        }}
                        title="Locate My Position"
                        className={`absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full border flex items-center justify-center shadow-md hover:scale-110 transition-transform backdrop-blur-md ${rolePill('commuter')}`}
                    >
                        <Navigation className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                /* DISPLAY MODE 2: SONAR RADAR CANVAS */
                <div className="relative w-full h-[420px] rounded-3xl bg-white dark:bg-[#07090E] border border-gray-100 dark:border-white/10 overflow-hidden shadow-md flex items-center justify-center transition-colors duration-300">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[340px] h-[340px] rounded-full border border-emerald-500/10 animate-pulse" />
                        <div className="w-[240px] h-[240px] rounded-full border border-emerald-500/20" />
                        <div className="w-[140px] h-[140px] rounded-full border border-emerald-500/30" />
                        <div className="absolute w-[340px] h-[340px] rounded-full border-t-2 border-emerald-500/40 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>

                    <div className="relative z-20 flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold shadow-md animate-bounce ${roleCtaBg('commuter')}`}>
                            <Navigation className="w-4 h-4 fill-current" />
                        </div>
                        <span className={`px-3 py-1 mt-1.5 rounded-full text-[10px] font-mono font-bold border ${rolePill('commuter')}`}>
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
                                    className={`p-2.5 rounded-2xl flex items-center gap-1.5 shadow-md transition-all ${isSelected
                                        ? 'bg-emerald-500 text-black scale-110 shadow-lg border-2 border-white'
                                        : 'bg-white/90 text-gray-900 dark:bg-white/10 dark:text-white border border-gray-200 dark:border-white/20 hover:scale-105'
                                        }`}
                                >
                                    <span className="text-lg">{v.icon}</span>
                                    <span className="text-[9px] font-mono opacity-80">({v.eta})</span>
                                </div>
                            </div>
                        );
                    })}

                    <div className="absolute bottom-4 left-4 z-20 p-3 bg-white/90 dark:bg-[#07090E]/90 backdrop-blur-md border border-gray-100 dark:border-white/10 rounded-2xl text-[11px] text-gray-900 dark:text-white space-y-0.5 max-w-xs font-mono shadow-sm">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-500">
                            <MapPin className="w-3.5 h-3.5" /> Suggested Boarding Point
                        </div>
                        <p className="text-[10px] text-gray-500">
                            Stand safely on the near sidewalk 15m ahead along the vehicle route vector.
                        </p>
                    </div>
                </div>
            )}

            {/* SELECTED VEHICLE DETAILS & PAY FARE CARD */}
            {selectedVehicle && (
                <div className="p-5 rounded-3xl bg-white dark:bg-[#07090E] border border-gray-100 dark:border-white/10 shadow-md space-y-4 font-sans">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-2xl">
                                {selectedVehicle.icon}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                                        {selectedVehicle.vehicleType}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-bold border border-emerald-500/20">
                                        ON TRANSIT
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 font-mono mt-0.5">
                                    {selectedVehicle.formattedDistance} • Heading {selectedVehicle.bearing.cardinal} ({selectedVehicle.bearing.angle}°)
                                </p>
                            </div>
                        </div>

                        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-right">
                                <span className="text-xs font-mono font-black text-emerald-500 block">
                                    {selectedVehicle.eta}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {commuterUid && (
                                    <button
                                        onClick={() => handleNotifyVehicleDriver(selectedVehicle)}
                                        disabled={notifyingId === selectedVehicle.anonId}
                                        className="px-4 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-extrabold text-xs rounded-full transition-all flex items-center gap-1.5"
                                    >
                                        <Bell className="w-3.5 h-3.5 text-emerald-500" /> Notify
                                    </button>
                                )}
                                {onSelectVehicleToPay && (
                                    <button
                                        onClick={() => onSelectVehicleToPay(selectedVehicle.rawDoc)}
                                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full transition-all shadow-md flex items-center gap-2"
                                    >
                                        <Zap className="w-3.5 h-3.5" /> Pay Fare
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {notifySuccessMsg && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-mono text-xs font-bold rounded-2xl flex items-center gap-2 animate-bounce">
                            <Check className="w-4 h-4" /> {notifySuccessMsg}
                        </div>
                    )}
                </div>
            )}

            {/* FILTER CHECKLIST MODAL */}
            {showFilterModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in font-sans">
                    <div className={`w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl relative text-slate-900 dark:text-white space-y-4 border ${cardRoleStyle('commuter')}`}>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2.5 rounded-2xl border ${rolePill('commuter')}`}>
                                    <Filter className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg tracking-tight">Filter Transport Vehicles</h3>
                                    <p className="text-xs text-slate-500 font-mono">Live Map & Broadcast Beacon Target</p>
                                </div>
                            </div>
                            <button onClick={() => setShowFilterModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar font-mono text-xs font-bold">
                            {[
                                { label: 'All Vehicles', value: 'All', icon: '🚗' },
                                { label: 'Traditional Jeepney', value: 'Jeepney', icon: '🛻' },
                                { label: 'Modern E-Jeepney', value: 'E-Jeepney', icon: '⚡🚍' },
                                { label: 'Tricycle', value: 'Tricycle', icon: '🛺' },
                                { label: 'E-Trike', value: 'E-Trike', icon: '⚡🛺' },
                                { label: 'UV Express', value: 'UV Express', icon: '🚐' },
                                { label: 'Bus', value: 'Bus', icon: '🚌' },
                            ].map((item) => {
                                const isSelected = vehicleFilter.toLowerCase() === item.value.toLowerCase();
                                return (
                                    <button
                                        key={item.value}
                                        onClick={() => {
                                            if (setVehicleFilter) setVehicleFilter(item.value);
                                            setShowFilterModal(false);
                                        }}
                                        className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between ${isSelected
                                            ? `${roleCtaBg('commuter')} border-transparent text-white shadow-md`
                                            : 'bg-slate-50 dark:bg-white/[0.04] border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{item.icon}</span>
                                            <span>{item.label}</span>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-white" />}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setShowFilterModal(false)}
                            className={`w-full py-3.5 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md text-white ${roleCtaBg('commuter')}`}
                        >
                            Apply Filter
                        </button>
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