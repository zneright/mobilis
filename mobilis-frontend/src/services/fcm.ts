import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, getFirebaseMessaging } from '../firebase';
import { trackNotificationDelivered } from './analytics';

/**
 * Requests FCM notification permission and registers FCM Token in Firestore user document
 */
export async function setupFcmNotifications(userUid: string): Promise<string | null> {
    try {
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notification');
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        const messaging = await getFirebaseMessaging();
        if (!messaging) return null;

        // Get registration token
        const currentToken = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined,
        });

        if (currentToken) {
            // Save token to user doc in Firestore
            await updateDoc(doc(db, 'users', userUid), {
                fcmToken: currentToken,
            });
            return currentToken;
        } else {
            console.log('No registration token available. Request permission to generate one.');
            return null;
        }
    } catch (err) {
        console.warn('An error occurred while retrieving token:', err);
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
