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
  
  const type = payload.data?.type;
  let notificationTitle = payload.data?.title || payload.notification?.title || "New Notification";
  let notificationOptions = {
    body: payload.data?.body || payload.notification?.body || "You have a new message",
    icon: '/favicon.svg',
    vibrate: [200, 100, 200],
    tag: type === 'call' ? 'incoming-call' : 'new-msg',
    renotify: true,
    data: payload.data
  };

  if (type === 'call') {
    notificationTitle = "📞 Incoming Call";
    notificationOptions.body = `${payload.data.callerName || 'Someone'} is calling you...`;
    notificationOptions.actions = [
      { action: 'answer', title: 'Open App to Answer' }
    ];
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const chatId = event.notification.data?.chatId || event.notification.data?.from;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = chatId ? `/?chatId=${chatId}` : '/';
      for (const client of clientList) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
