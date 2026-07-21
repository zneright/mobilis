import React, { useState, useEffect, useRef, useMemo, Component } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm, calculateBearing, calculateETA, formatDistance } from '../../utils/geo';
import { playCommuterChime } from '../../utils/webAudio';
import { Zap, EyeOff, ShieldCheck, Filter, Bell, Check } from 'lucide-react';
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
            setNotifySuccessMsg(`notified nearby ${v.vehicleType.toLowerCase()} drivers.`);
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
            const hash = drv.uid.substring(0, 4).toLowerCase();
            const anonId = `vhcl.${hash}`;

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
            counts[v.vehicleType.toLowerCase()] = (counts[v.vehicleType.toLowerCase()] || 0) + 1;
        });
        return counts;
    }, [anonymizedVehicles]);

    const activeVehicleSummary = useMemo(() => {
        const entries = Object.entries(vehicleCounts);
        if (entries.length === 0) return 'no vehicles broadcasting within 50m radius.';
        return entries
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(' · ') + ' approaching nearby.';
    }, [vehicleCounts]);

    const selectedVehicle = useMemo(() => {
        return filteredVehicles.find((v) => v.anonId === selectedAnonId) || filteredVehicles[0] || null;
    }, [filteredVehicles, selectedAnonId]);

    // Initialize MapLibre GL Vector Map safely with WebGL fallback
    useEffect(() => {
        if (displayMode !== 'maplibre' || !mapContainerRef.current || mapRef.current) return;

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
                    <div class="relative z-10 px-3 py-1.5 rounded-xl bg-[#0B0F19] text-cyan-400 font-mono flex items-center gap-1.5 shadow-[0_0_25px_rgba(0,210,255,1)] border border-cyan-400/50 text-xs whitespace-nowrap lowercase">
                        <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                        <span>you</span>
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

                if (markersRef.current.has(v.anonId)) {
                    const marker = markersRef.current.get(v.anonId)!;
                    marker.setLngLat([v.lng, v.lat]);
                    marker.setRotation(v.bearing.angle);
                } else {
                    const el = document.createElement('div');
                    el.className = `cursor-pointer transition-all duration-300 p-2 rounded-xl flex flex-col items-center gap-1 shadow-2xl ${isSelected
                        ? 'bg-emerald-500 text-black scale-110 shadow-[0_0_25px_rgba(52,211,153,0.9)] border border-emerald-300'
                        : 'bg-[#0B0F19] text-white border border-white/20 hover:scale-105'
                        }`;
                    el.innerHTML = `
                        <span style="font-size: 16px;">${v.icon}</span>
                        <span class="text-[9px] lowercase font-mono opacity-90">.${v.anonId.split('.')[1]}</span>
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
        <div className="w-full flex flex-col gap-6 text-slate-900 dark:text-white font-mono lowercase">

            {/* PRIVACY GUARANTEE & VEHICLE DENSITY BAR (VERTICAL STACK) */}
            <div className="p-5 rounded-[2rem] bg-gradient-to-b from-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-col gap-5 shadow-sm">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-bold">
                            {webGlSupported ? '.maplibre_engine' : '.sonar_engine'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                        .privacy_status = redacted;
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 leading-relaxed border-l-2 border-emerald-500/50 pl-3">
                        {activeVehicleSummary}
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => {
                            if (!webGlSupported) return;
                            setDisplayMode('maplibre');
                        }}
                        disabled={!webGlSupported}
                        className={`px-4 py-3 rounded-2xl text-[10px] font-bold transition-all border text-left flex items-center gap-3 ${displayMode === 'maplibre'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40'
                            }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${displayMode === 'maplibre' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
                        .view_maplibre {!webGlSupported && '(unavailable)'}
                    </button>
                    <button
                        onClick={() => setDisplayMode('sonar')}
                        className={`px-4 py-3 rounded-2xl text-[10px] font-bold transition-all border text-left flex items-center gap-3 ${displayMode === 'sonar'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${displayMode === 'sonar' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
                        .view_sonar
                    </button>
                </div>
            </div>

            {/* VEHICLE CATEGORY FILTER PILLS (VERTICAL LIST) */}
            <div className="flex flex-col gap-2 p-5 rounded-[2rem] border border-slate-200 dark:border-white/10">
                <span className="text-slate-400 dark:text-gray-500 text-[10px] flex items-center gap-2 mb-2">
                    <Filter className="w-3 h-3" /> .filter_by_type
                </span>
                <div className="flex flex-col gap-1.5">
                    {[
                        { label: 'all_vehicles', value: 'all' },
                        { label: 'jeepney', value: 'jeepney' },
                        { label: 'tricycle', value: 'tricycle' },
                        { label: 'uv_express', value: 'uv express' },
                        { label: 'bus', value: 'bus' },
                        { label: 'e-vehicle', value: 'e-vehicle' },
                        { label: 'motorcycle', value: 'motorcycle' },
                    ].map((pill) => (
                        <button
                            key={pill.value}
                            onClick={() => setVehicleFilter(pill.value)}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all text-left flex items-center gap-3 ${vehicleFilter === pill.value
                                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                        >
                            <span className={`w-1 h-1 rounded-full ${vehicleFilter === pill.value ? 'bg-cyan-500' : 'bg-transparent'}`}></span>
                            .{pill.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* DISPLAY MODE 1: MAPLIBRE GL JS VECTOR MAP */}
            {displayMode === 'maplibre' && webGlSupported ? (
                <div className="relative w-full h-[420px] rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg">
                    <div ref={mapContainerRef} className="w-full h-full" />
                    <div className="absolute top-4 left-4 z-10 p-3 bg-slate-900/90 dark:bg-black/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] text-white flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                            .live_vector_map
                        </div>
                        <p className="text-gray-400 pl-3.5 border-l border-white/10">
                            tap_marker_for_eta_and_payment
                        </p>
                    </div>
                </div>
            ) : (
                /* DISPLAY MODE 2: SONAR RADAR CANVAS */
                <div className="relative w-full h-[420px] rounded-[2rem] bg-white dark:bg-[#07090E] border border-slate-200 dark:border-white/10 overflow-hidden shadow-lg flex items-center justify-center transition-colors duration-300">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[340px] h-[340px] rounded-full border border-emerald-500/10 animate-pulse" />
                        <div className="w-[240px] h-[240px] rounded-full border border-emerald-500/20" />
                        <div className="w-[140px] h-[140px] rounded-full border border-emerald-500/30" />
                        <div className="absolute w-[340px] h-[340px] rounded-full border-t border-emerald-500/40 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>

                    <div className="relative z-20 flex flex-col items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(0,210,255,0.6)] animate-ping absolute" />
                        <div className="w-3 h-3 rounded-full bg-cyan-500 relative z-10" />
                        <span className="text-[9px] text-cyan-600 dark:text-cyan-400">
                            .you
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
                                <div
                                    className={`p-2 rounded-xl flex flex-col items-center gap-1 shadow-xl transition-all border ${isSelected
                                        ? 'bg-emerald-500/10 text-emerald-500 scale-110 border-emerald-500/50 backdrop-blur-md'
                                        : 'bg-slate-900/90 text-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:scale-105'
                                        }`}
                                >
                                    <span className="text-sm">{v.icon}</span>
                                    <span className="text-[8px] opacity-80">.{v.anonId.split('.')[1]}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SELECTED ANONYMIZED VEHICLE ETA DETAILS (VERTICAL LAYOUT) */}
            {selectedVehicle && (
                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-[#121418] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col gap-6">

                    {/* Header Info */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-2xl shrink-0">
                                {selectedVehicle.icon}
                            </div>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                                    .{selectedVehicle.vehicleType.toLowerCase()}
                                </h3>
                                <p className="text-[10px] text-emerald-500">
                                    id: {selectedVehicle.anonId}
                                </p>
                                <span className="text-[9px] text-slate-400 mt-1">
                                    .status = on_transit
                                </span>
                            </div>
                        </div>

                        {/* Metrics stacked vertically */}
                        <div className="flex flex-col gap-2 pl-4 border-l-2 border-slate-200 dark:border-white/10 text-[10px] text-slate-500 dark:text-gray-400">
                            <p className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                distance: {selectedVehicle.formattedDistance}
                            </p>
                            <p className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                bearing: {selectedVehicle.bearing.cardinal.toLowerCase()} ({selectedVehicle.bearing.angle}deg)
                            </p>
                            <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                eta: {selectedVehicle.eta}
                            </p>
                            <p className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                speed: ~20 km/h
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons stacked vertically */}
                    <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                        {commuterUid && (
                            <button
                                onClick={() => handleNotifyVehicleDriver(selectedVehicle)}
                                disabled={notifyingId === selectedVehicle.anonId}
                                className="w-full py-3.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                            >
                                <Bell className="w-3.5 h-3.5" /> .notify_driver()
                            </button>
                        )}
                        {onSelectVehicleToPay && (
                            <button
                                onClick={() => onSelectVehicleToPay(selectedVehicle.rawDoc)}
                                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                            >
                                <Zap className="w-3.5 h-3.5" /> .pay_fare()
                            </button>
                        )}
                    </div>

                    {notifySuccessMsg && (
                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 text-[10px] rounded-xl flex items-center gap-2">
                            <Check className="w-3.5 h-3.5" /> {notifySuccessMsg}
                        </div>
                    )}

                    {/* Privacy Footer stacked */}
                    <div className="pt-2 flex flex-col gap-2 text-[9px] text-slate-400 dark:text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <EyeOff className="w-3 h-3" /> data.redacted = true;
                        </span>
                        <span className="text-cyan-500/70">
                            network.stellar = ready;
                        </span>
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
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] flex flex-col gap-2 text-slate-400 font-mono text-[10px] lowercase">
                    <p className="text-amber-400 font-bold">
                        .error = map_engine_unavailable;
                    </p>
                    <p className="pl-2 border-l border-slate-700">
                        active_drivers = visible_on_sonar;
                    </p>
                </div>
            );
        }
        return this.props.children;
    }
}

export default LiveTransitMap;