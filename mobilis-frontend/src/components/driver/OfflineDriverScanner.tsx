import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Volume2, CloudUpload } from 'lucide-react';
import {
    queueDriverVoucher,
    getDriverVoucherQueue,
    type VerifiedVoucherRecord,
    type OfflineVoucherPayload,
} from '../../services/offlineVoucher';
import { offlineSyncService } from '../../services/offlineSync';
import { playDoubleChime } from '../../utils/webAudio';

interface OfflineDriverScannerProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    driverData: any;
    onClose: () => void;
    onSuccess?: () => void;
}

export const OfflineDriverScanner: React.FC<OfflineDriverScannerProps> = ({
    driverData,
    onClose,
    onSuccess,
}) => {
    const [rawInput, setRawInput] = useState<string>('');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [queue, setQueue] = useState<VerifiedVoucherRecord[]>([]);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [syncSummary, setSyncSummary] = useState<string | null>(null);

    const driverPubKey = driverData?.publicKey || driverData?.uid || 'GCVTE4BG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID';

    useEffect(() => {
        setQueue(getDriverVoucherQueue());
        const unsub = offlineSyncService.subscribe((_synced, _pending) => {
            setQueue(getDriverVoucherQueue());
        });
        return () => unsub();
    }, []);

    const handleProcessVoucher = (voucherObj?: OfflineVoucherPayload) => {
        setStatusMessage(null);
        setSyncSummary(null);

        try {
            let voucher: OfflineVoucherPayload;
            if (voucherObj) {
                voucher = voucherObj;
            } else {
                if (!rawInput.trim()) {
                    throw new Error('Please paste or scan a valid voucher QR code payload.');
                }
                voucher = JSON.parse(rawInput) as OfflineVoucherPayload;
            }

            const result = queueDriverVoucher(voucher, driverPubKey);
            if (!result.success) {
                setStatusMessage({ type: 'error', message: result.error || 'Voucher verification failed.' });
                return;
            }

            // Play dual tone audio chime immediately for offline feedback!
            playDoubleChime();

            setStatusMessage({
                type: 'success',
                message: `✅ Verified ₱${voucher.farePhp} (${voucher.fareXlm} XLM) fare voucher offline! Signature proof valid.`,
            });
            setRawInput('');
            setQueue(getDriverVoucherQueue());
            if (onSuccess) onSuccess();
        } catch (err: unknown) {
            setStatusMessage({
                type: 'error',
                message: err instanceof Error ? err.message : 'Invalid JSON or QR code format.',
            });
        }
    };

    const handleSyncNow = async () => {
        setIsSyncing(true);
        setSyncSummary(null);
        try {
            const secret = driverData?.secret;
            const res = await offlineSyncService.syncPendingVouchers(secret);
            setSyncSummary(`Synced ${res.synced} voucher(s) to Stellar Horizon & Firestore. (${res.failed} failed)`);
            setQueue(getDriverVoucherQueue());
        } catch (err: unknown) {
            setSyncSummary(err instanceof Error ? err.message : 'Sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    const pendingCount = queue.filter(q => q.status === 'pending_sync').length;
    const totalPendingPhp = queue
        .filter(q => q.status === 'pending_sync')
        .reduce((sum, item) => sum + parseFloat(item.voucher.farePhp || '0'), 0);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white relative max-h-[90vh] overflow-y-auto font-sans">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold font-mono tracking-tight">Offline Fare Scanner</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                    ZERO DATA VERIFIED
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-mono">Verify passenger cryptographic passes instantly with 0 internet connection</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Status Notice */}
                {statusMessage && (
                    <div
                        className={`p-4 rounded-2xl border flex items-center gap-3 font-mono text-xs ${
                            statusMessage.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                    >
                        {statusMessage.type === 'success' ? (
                            <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
                        ) : (
                            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                        )}
                        <span className="leading-relaxed">{statusMessage.message}</span>
                    </div>
                )}

                {/* Scan / Input Area */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                        <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                            <Smartphone className="w-4 h-4" /> Scan or Paste Passenger Voucher
                        </span>
                        <span className="flex items-center gap-1 text-[11px]">
                            <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Auto-Chime on proof
                        </span>
                    </div>

                    <textarea
                        rows={3}
                        value={rawInput}
                        onChange={(e) => setRawInput(e.target.value)}
                        placeholder='Paste voucher QR payload JSON here (e.g. {"voucherId": "VCH-...", "signature": "..."})'
                        className="w-full p-3.5 bg-slate-950 border border-white/10 rounded-2xl font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all resize-none"
                    />

                    <button
                        onClick={() => handleProcessVoucher()}
                        className="w-full py-3.5 rounded-2xl font-mono font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 hover:scale-[1.01] active:scale-95 transition-all"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify Cryptographic Signature (Offline)</span>
                    </button>
                </div>

                {/* Pending Offline Ledger Queue */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Offline Queue</div>
                            <div className="text-lg font-black font-mono text-white">
                                {pendingCount} Pending Fare(s) <span className="text-cyan-400 text-sm font-normal">(₱{totalPendingPhp.toFixed(2)})</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSyncNow}
                            disabled={isSyncing || pendingCount === 0}
                            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                                pendingCount > 0 && !isSyncing
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                                    : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                            }`}
                        >
                            <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                            <span>{isSyncing ? 'Syncing...' : 'Sync to Stellar'}</span>
                        </button>
                    </div>

                    {syncSummary && (
                        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                            {syncSummary}
                        </div>
                    )}

                    {queue.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {queue.map((item) => (
                                <div
                                    key={item.voucher.voucherId}
                                    className="p-3 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between font-mono text-xs"
                                >
                                    <div className="space-y-0.5">
                                        <div className="font-bold flex items-center gap-2">
                                            <span>₱{item.voucher.farePhp} ({item.voucher.fareXlm} XLM)</span>
                                            {item.status === 'synced' ? (
                                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Synced
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <RefreshCw className="w-3 h-3 animate-spin" /> Pending Sync
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-400">{item.voucher.voucherId}</div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(item.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-xs font-mono text-slate-500">
                            No offline fares scanned yet. Vouchers scanned in dead zones will appear here.
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
