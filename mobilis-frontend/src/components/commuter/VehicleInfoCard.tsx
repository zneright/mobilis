import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { playCommuterChime } from '../../utils/webAudio';
import { Bell, EyeOff, Check } from 'lucide-react';

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
        occupancyStatus === 'Available' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
        occupancyStatus === 'Nearly Full' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
        'bg-red-500/20 text-red-400 border-red-500/30';

    return (
        <div className="w-full p-6 rounded-[2.5rem] bg-[#090C14] border border-cyan-500/30 shadow-2xl space-y-4 text-white font-sans backdrop-blur-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-3xl shadow-md">
                        {icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-lg text-white">
                                {vehicleType} <span className="text-cyan-400 font-mono text-xs">(ON TRANSIT)</span>
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${occupancyColor}`}>
                                {occupancyStatus}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {distanceText} away • {bearingText}
                        </p>
                    </div>
                </div>

                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right font-mono">
                        <span className="text-sm font-black text-cyan-400 block">
                            {etaText}
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Average Speed ~20 km/h</span>
                    </div>

                    <button
                        onClick={handleSendWaitingSignal}
                        disabled={isSubmitting || !commuterUid}
                        className="px-6 py-3.5 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-black text-xs rounded-2xl transition-all shadow-[0_0_20px_rgba(0,210,255,0.4)] flex items-center gap-2 hover:scale-105"
                    >
                        <Bell className="w-4 h-4" />
                        <span>{isSubmitting ? 'Signaling...' : "I'm Waiting For Ride"}</span>
                    </button>
                </div>
            </div>

            {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold rounded-2xl flex items-center gap-2 animate-bounce">
                    <Check className="w-4 h-4" /> {successMsg}
                </div>
            )}

            {/* Privacy Redaction Guarantee */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-cyan-400" /> Personal details redacted by Mobilis Privacy Layer
                </span>
                <span className="text-emerald-400 font-bold">Stellar Public Transit Ledger</span>
            </div>
        </div>
    );
};

export default VehicleInfoCard;
