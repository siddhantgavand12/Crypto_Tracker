// This service worker is the foundation for push notifications,
// allowing the app to send alerts even when the browser tab is closed.

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

// This event handles clicks on notifications.
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

// This event listens for push messages from the server.
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push message received.');
  const data = event.data ? event.data.json() : { title: 'CrypTrack Alert', body: 'Something happened!' };
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon.png', // Use icon from payload, with fallback
    badge: data.icon || '/icon.png'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});