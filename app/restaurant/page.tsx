"use client";

import * as React from 'react';
import App from './components/app';

export default function RestaurantPage() {
  React.useEffect(() => {
    // Unregister any active service worker and clear browser cache
    // to prevent aggressive caching of old JS/CSS layout files.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister().then(() => {
            console.log('Resto ServiceWorker unregistered');
          });
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => {
          caches.delete(key).then(() => {
            console.log('Resto Cache cleared:', key);
          });
        });
      });
    }
  }, []);

  return <App />;
}
