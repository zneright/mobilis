import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebase';

export const logAnalyticsEvent = (eventName: string, eventParams?: Record<string, unknown>) => {
    try {
        if (analytics) {
            logEvent(analytics, eventName, eventParams);
        }
    } catch (error) {
        console.warn(`[Analytics Error] ${eventName}:`, error);
    }
};

export const trackWalletCreated = (role: string, publicKey: string) => {
    logAnalyticsEvent('wallet_created', { role, publicKey: publicKey.slice(0, 8) });
};

export const trackDriverDutyToggled = (isDuty: boolean, uid: string) => {
    logAnalyticsEvent('driver_duty_toggled', { status: isDuty ? 'on_duty' : 'off_duty', uid });
};

export const trackPaymentSuccess = (amount: string, driverId: string, commuterId: string, txHash: string) => {
    logAnalyticsEvent('payment_success', {
        amount,
        driverId,
        commuterId,
        txHash: txHash.slice(0, 10),
    });
};

export const trackPaymentFailure = (reason: string, driverId?: string) => {
    logAnalyticsEvent('payment_failed', { reason, driverId });
};

export const trackNotificationDelivered = (type: 'toast' | 'browser' | 'fcm', recipientId: string) => {
    logAnalyticsEvent('notification_delivered', { type, recipientId });
};
