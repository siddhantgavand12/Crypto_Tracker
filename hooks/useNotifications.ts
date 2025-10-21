import { useState, useEffect, useCallback } from 'react';

const SERVICE_WORKER_PATH = '/service-worker.js';
// This is a placeholder VAPID public key.
// In a real application, you would generate your own VAPID key pair
// and store the public key here and the private key on your server.
const VAPID_PUBLIC_KEY = 'BKRf4BqTxG-d2nKxkx0ifzzijnc9E435uHiKZYqdi3r2Yo0MYczkyMV8cfIRPoOUqtyW1ahMQ7s1CZnKE_CNRz0';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setPermission(Notification.permission);
      navigator.serviceWorker.register(SERVICE_WORKER_PATH)
        .then(reg => {
          console.log('Service Worker registered', reg.scope);
          // Check for existing push subscription
          reg.pushManager.getSubscription().then(subscription => {
            if (subscription) {
              setIsSubscribed(true);
            }
          });
        })
        .catch(err => console.error('Service Worker registration failed', err));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  }, []);

  const sendNotification = useCallback((title: string, body: string, symbol?: string) => {
    if (permission === 'granted' && 'serviceWorker' in navigator && navigator.serviceWorker.ready) {
        const getBaseAsset = (s: string) => s.replace(/USDT$/, '').toLowerCase();
        const icon = symbol ? `https://assets.coincap.io/assets/icons/${getBaseAsset(symbol)}@2x.png` : '/icon.png';
        
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, { body, icon });
        });
    }
  }, [permission]);

  const subscribeToPush = useCallback(async () => {
    if (permission !== 'granted') {
        alert("Please enable notifications first.");
        return;
    }
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        
        console.log('Push subscription successful:', subscription);
        // In a real app, you would send this 'subscription' object to your server
        // and store it to send push notifications later.
        // e.g., await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify(subscription), ... });
        setIsSubscribed(true);
        alert("Successfully subscribed to push alerts!");
    } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
        alert("Failed to subscribe to push alerts. See console for details.");
    }
  }, [permission]);

  return { permission, requestPermission, sendNotification, subscribeToPush, isSubscribed };
};