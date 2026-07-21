import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { playCommuterChime } from '../../utils/webAudio';
import { Bell, EyeOff, Check, X } from 'lucide-react';

interface VehicleInfoCardProps {
    vehicleType: string;
    icon: string;
    distanceText: string;
    etaText: string;
    bearingText: string;
    occupancyStatus: 'Available' | 'Nearly Full' | 'Full';
    commuterUid?: string;
    commuterCoords?: { lat: number; lng: number };
    onClose?: () => void;
}

export const VehicleInfoCard: React.FC<VehicleInfoCardProps> = ({
    vehicleType,
    icon,
    distanceText,
    etaText,
    bearingText,
    occupancyStatus,
    commuterUid,
    commuterCoords,
    onClose,
}) => {
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [successMsg, setSuccessMsg] = useState<string>('');

    const handleSendWaitingSignal = async () => {
        if (!commuterUid || !commuterCoords) return;
        setIsSubmitting(true);

        try {
            const expirationTime = new Date(Date.now() + 10 * 60 * 1000);
            await setDoc(doc(db, 'waiting_beacons', commuterUid), {
                commuterUid,
                lat: commuterCoords.lat,
                lng: commuterCoords.lng,
                active: true,
                preferredVehicleType: vehicleType,
                createdAt: new Date().toISOString(),
                expiresAt: expirationTime.toISOString(),
            });

            playCommuterChime();
            setSuccessMsg(`Signaled waiting beacon for ${vehicleType}!`);
            setTimeout(() => {
                setSuccessMsg('');
                if (onClose) onClose();
            }, 3000);
        } catch (err) {
            console.error("Failed to signal waiting beacon:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const occupancyColor =
        occupancyStatus === 'Available' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
        occupancyStatus === 'Nearly Full' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
        'bg-rose-500/10 text-rose-500 border-rose-500/20';

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
            {/* Pull-Up Bottom Sheet Container */}
            <div className="w-full max-w-lg mx-auto bg-white dark:bg-[#07090E] rounded-t-[40px] p-6 shadow-[0_-20px_60px_rgba(0,0,0,0.15)] border-t border-gray-100 dark:border-white/10 text-gray-900 dark:text-white font-sans space-y-4">
                
                {/* Gray Drag Handle Pill */}
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-2" />

                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-2xl">
                            {icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                                    {vehicleType}
                                </h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${occupancyColor}`}>
                                    {occupancyStatus}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                                {distanceText} away • {bearingText}
                            </p>
                        </div>
                    </div>

                    {onClose && (
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                    <div>
                        <span className="text-xs text-gray-500 font-mono">Estimated Arrival (ETA)</span>
                        <span className="text-lg font-extrabold text-emerald-500 block">{etaText}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-gray-500 font-mono">Avg Speed</span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">~20 km/h</span>
                    </div>
                </div>

                {successMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-mono text-xs font-bold rounded-2xl flex items-center gap-2 animate-bounce">
                        <Check className="w-4 h-4" /> {successMsg}
                    </div>
                )}

                <button
                    onClick={handleSendWaitingSignal}
                    disabled={isSubmitting || !commuterUid}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-full transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
                >
                    <Bell className="w-4 h-4" />
                    <span>{isSubmitting ? 'Signaling...' : "I'M WAITING FOR RIDE"}</span>
                </button>

                {/* Privacy Redaction Guarantee */}
                <div className="pt-2 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span className="flex items-center gap-1">
                        <EyeOff className="w-3 h-3 text-emerald-500" /> Mobilis Privacy Protected
                    </span>
                    <span className="text-emerald-500 font-bold">Stellar Transit</span>
                </div>
            </div>
        </div>
    );
};

export default VehicleInfoCard;
