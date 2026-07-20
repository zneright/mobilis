import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDistanceKm } from '../../utils/geo';
import { trackDriverDutyToggled } from '../../services/analytics';
import { Navigation, ShieldAlert, Power } from 'lucide-react';
import type { UserData } from '../../types';

interface DriverDutyToggleProps {
    userData: UserData;
}

export const DriverDutyToggle: React.FC<DriverDutyToggleProps> = ({ userData }) => {
    const [isOnDuty, setIsOnDuty] = useState<boolean>(userData.isDuty || false);
    const [statusText, setStatusText] = useState<string>('Off Duty');
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);

    const watchIdRef = useRef<number | null>(null);
    const lastCoordsRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

    const publishLocation = async (lat: number, lng: number) => {
        if (!userData.uid) return;
        setIsUpdating(true);
        try {
            const driverLocationData = {
                uid: userData.uid,
                publicKey: userData.publicKey || '',
                driverName: userData.fullName || 'Driver',
                plateNumber: userData.plateNumber || 'N/A',
                todaAffiliation: userData.todaAffiliation || 'Independent',
                lat,
                lng,
                active: true,
                updatedAt: new Date().toISOString(),
            };

            // Write to driver_locations collection
            await setDoc(doc(db, 'driver_locations', userData.uid), driverLocationData, { merge: true });
            
            // Also sync isDuty state on user profile doc
            await setDoc(doc(db, 'users', userData.uid), { isDuty: true, lastLocation: { lat, lng, updatedAt: new Date().toISOString() } }, { merge: true });

            lastCoordsRef.current = { lat, lng, time: Date.now() };
            setStatusText(`On Duty • Broadcasting GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            setLocationError(null);
        } catch (err) {
            console.error('Error publishing location:', err);
            setStatusText('On Duty • GPS Sync Error');
        } finally {
            setIsUpdating(false);
        }
    };

    const stopDuty = async () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        setIsOnDuty(false);
        setStatusText('Off Duty');

        if (userData.uid) {
            try {
                await setDoc(doc(db, 'driver_locations', userData.uid), { active: false, updatedAt: new Date().toISOString() }, { merge: true });
                await setDoc(doc(db, 'users', userData.uid), { isDuty: false }, { merge: true });
            } catch (err) {
                console.error('Error setting off duty status:', err);
            }
        }
        trackDriverDutyToggled(false, userData.uid);
    };

    const startDuty = () => {
        if (!('geolocation' in navigator)) {
            setLocationError('Geolocation is not supported by your browser.');
            return;
        }

        setLocationError(null);
        setIsOnDuty(true);
        setStatusText('Acquiring GPS Signal...');
        trackDriverDutyToggled(true, userData.uid);

        const options = {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 15000,
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                // Battery & Network Optimization: Only publish if position shifted > 10m (0.01 km) or 30s elapsed
                if (lastCoordsRef.current) {
                    const distMoved = calculateDistanceKm(
                        lastCoordsRef.current.lat,
                        lastCoordsRef.current.lng,
                        latitude,
                        longitude
                    );
                    const timeElapsedSec = (Date.now() - lastCoordsRef.current.time) / 1000;

                    if (distMoved < 0.01 && timeElapsedSec < 30) {
                        return; // Skip unnecessary Firestore write
                    }
                }

                publishLocation(latitude, longitude);
            },
            (error) => {
                console.warn('Geolocation watch error:', error);
                let msg = 'Unable to access location.';
                if (error.code === error.PERMISSION_DENIED) {
                    msg = 'Location permission denied. Enable GPS to go On Duty.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    msg = 'GPS signal unavailable. Move to an open area.';
                }
                setLocationError(msg);
                stopDuty();
            },
            options
        );
    };

    const toggleDuty = () => {
        if (isOnDuty) {
            stopDuty();
        } else {
            startDuty();
        }
    };

    // Auto cleanup on unmount or user logout
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return (
        <div className="w-full bg-white dark:bg-[#0a0a14] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xl transition-all">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                        isOnDuty 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_20px_rgba(52,211,153,0.4)] animate-pulse' 
                            : 'bg-gray-100 dark:bg-white/5 text-gray-400 border border-gray-200 dark:border-white/10'
                    }`}>
                        <Navigation className="w-7 h-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-ping' : 'bg-gray-400'}`} />
                            <h4 className="font-black text-lg tracking-wider text-gray-900 dark:text-white uppercase">
                                {isOnDuty ? 'ON TRANSIT • RADAR VISIBLE' : 'OFF TRANSIT'}
                            </h4>
                        </div>
                        <p className="text-xs text-gray-500 font-mono mt-1">{statusText}</p>
                    </div>
                </div>

                <button
                    onClick={toggleDuty}
                    disabled={isUpdating}
                    className={`w-full sm:w-auto px-7 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                        isOnDuty
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/40'
                            : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                    }`}
                >
                    <Power className="w-5 h-5" />
                    {isOnDuty ? 'Go Off Transit' : 'Go On Transit (Broadcast GPS)'}
                </button>
            </div>

            {locationError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{locationError}</span>
                </div>
            )}
        </div>
    );
};

export default DriverDutyToggle;
