// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDummyKeyForServiceWorker",
  authDomain: "mobilis-10f9a.firebaseapp.com",
  projectId: "mobilis-10f9a",
  storageBucket: "mobilis-10f9a.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'New Fare Received';
  const notificationOptions = {
    body: payload.notification?.body || 'A commuter has sent a fare payment via Stellar.',
    icon: '/icon.png',
    badge: '/badge.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
