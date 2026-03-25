importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyCPBbo23eDw34k-_dMzxQ2ZEJUGOoOyL-U",
  authDomain: "dev-chat-85ed5.firebaseapp.com",
  projectId: "dev-chat-85ed5",
  storageBucket: "dev-chat-85ed5.firebasestorage.app",
  messagingSenderId: "388773569345",
  appId: "1:388773569345:web:83559235fa66377dedb7c0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg', // Default icon for notifications
    vibrate: [200, 100, 200]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
