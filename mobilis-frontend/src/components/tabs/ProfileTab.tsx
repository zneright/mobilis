import React, { useState } from 'react';
import { Copy, Check, QrCode, Shield, LogOut, ChevronRight, User, Phone, MapPin } from 'lucide-react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

interface ProfileTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stellarData: any;
    isSuperAdmin?: boolean;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ stellarData }) => {
    const [copiedKey, setCopiedKey] = useState(false);
    const [showQr, setShowQr] = useState(false);

    const handleCopyKey = () => {
        if (stellarData?.publicKey) {
            navigator.clipboard.writeText(stellarData.publicKey);
            setCopiedKey(true);
            setTimeout(() => setCopiedKey(false), 2000);
        }
    };

    const handleSignOut = () => {
        signOut(auth).catch(console.error);
    };

    const pubKey = stellarData?.publicKey || '';
    const obfuscatedKey = pubKey ? `${pubKey.substring(0, 8)}...${pubKey.substring(pubKey.length - 8)}` : 'N/A';

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 text-white font-sans">
            
            {/* USER AVATAR & IDENTITY HEADER */}
            <div className="p-8 rounded-[2.5rem] bg-[#121418] border border-white/10 shadow-2xl text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-teal-300 to-emerald-400 p-1 mx-auto shadow-[0_0_25px_rgba(0,210,255,0.4)]">
                    <div className="w-full h-full rounded-full bg-[#090A0C] flex items-center justify-center text-white font-black text-2xl">
                        {(stellarData?.fullName || stellarData?.coopName || 'User').charAt(0).toUpperCase()}
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-black text-white">{stellarData?.fullName || stellarData?.coopName || 'Mobilis Member'}</h2>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{stellarData?.email || 'Registered User'}</p>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                    <Shield className="w-3.5 h-3.5" />
                    Role: {stellarData?.role || 'User'}
                </div>
            </div>

            {/* WALLET ADDRESS KEY CARD */}
            <div className="p-6 rounded-3xl bg-[#121418] border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-gray-300 uppercase tracking-wider">Stellar Public Key</h3>
                    <button
                        onClick={handleCopyKey}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-cyan-400 flex items-center gap-1.5 transition-all border border-white/10"
                    >
                        {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedKey ? 'Copied!' : 'Copy Key'}
                    </button>
                </div>

                <div className="p-4 bg-black/50 border border-dashed border-white/20 rounded-2xl font-mono text-xs text-cyan-400 break-all">
                    {obfuscatedKey}
                </div>

                <button
                    onClick={() => setShowQr(!showQr)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all border border-white/10"
                >
                    <QrCode className="w-4 h-4 text-cyan-400" />
                    {showQr ? 'Hide Public Key QR' : 'Show Wallet QR Code'}
                </button>

                {showQr && (
                    <div className="p-6 bg-white rounded-3xl text-center space-y-3 shadow-2xl">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${pubKey}`}
                            alt="Wallet Public Key QR"
                            className="mx-auto rounded-xl"
                        />
                        <span className="text-[10px] font-mono text-slate-800 font-bold uppercase block">Scan to Receive XLM / Fares</span>
                    </div>
                )}
            </div>

            {/* CATEGORIZED SETTINGS LIST */}
            <div className="p-6 rounded-3xl bg-[#121418] border border-white/10 shadow-xl space-y-2">
                <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-3 px-2">Account Preferences</h3>

                <div className="p-4 bg-black/30 rounded-2xl flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-cyan-400" />
                        <span>Account Type</span>
                    </div>
                    <span className="font-mono text-gray-300 font-bold capitalize">{stellarData?.role}</span>
                </div>

                {stellarData?.phone && (
                    <div className="p-4 bg-black/30 rounded-2xl flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-cyan-400" />
                            <span>Contact Phone</span>
                        </div>
                        <span className="font-mono text-gray-300">{stellarData.phone}</span>
                    </div>
                )}

                {stellarData?.todaAffiliation && (
                    <div className="p-4 bg-black/30 rounded-2xl flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-cyan-400" />
                            <span>TODA Cooperative</span>
                        </div>
                        <span className="font-bold text-emerald-400">{stellarData.todaAffiliation}</span>
                    </div>
                )}

                <button
                    onClick={handleSignOut}
                    className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-2xl text-xs font-bold flex items-center justify-between transition-all mt-4"
                >
                    <div className="flex items-center gap-3">
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out Safely</span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ProfileTab;