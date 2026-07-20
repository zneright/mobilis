import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, getFirebaseMessaging } from '../firebase';
import { trackNotificationDelivered } from './analytics';

/**
 * Requests FCM notification permission and registers FCM Token in Firestore user document.
 * Falls back seamlessly to Web Audio API synthesized chimes & in-app toasts if push is denied.
 */
export async function setupFcmNotifications(userUid: string): Promise<string | null> {
    try {
        if (!('Notification' in window)) {
            return null;
        }

        if (Notification.permission === 'denied') {
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return null;
        }

        const messaging = await getFirebaseMessaging();
        if (!messaging) return null;

        const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
        });

        if (currentToken) {
            await updateDoc(doc(db, 'users', userUid), {
                fcmToken: currentToken,
            });
            return currentToken;
        }
        return null;
    } catch {
        // Silent fallback to Web Audio API double chime and in-app toast banner
        return null;
    }
}

/**
 * Registers foreground listener for incoming FCM messages
 */
export async function listenToForegroundMessages(
    onMessageCallback: (payload: { title: string; body: string; data?: Record<string, string> }) => void
) {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};

    return onMessage(messaging, (payload) => {
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || '';
        trackNotificationDelivered('fcm', 'current_user');
        onMessageCallback({ title, body, data: payload.data });
    });
}
