
const CACHE_NAME = 'irangram-cache-v2.3';
const DYNAMIC_CACHE = 'irangram-dynamic-v2.3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;300;400;500;700;900&display=swap',
  'https://cdn-icons-png.flaticon.com/512/2111/2111615.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignore Firestore/Firebase API requests (Handled by SDK)
  // We explicitly allow fonts.googleapis.com to pass through to cache logic
  if ((url.hostname.includes('googleapis.com') && !url.hostname.includes('fonts.googleapis.com')) || url.hostname.includes('firebase')) {
    return;
  }

  // 2. Cache Images & Avatars (Runtime Caching)
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((response) => {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            if (response.ok) {
                cache.put(event.request.url, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // 3. Network First, Fallback to Cache (For Documents/JS/Fonts)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Cache successful responses for next offline load
          if (event.request.method === 'GET' && response.ok) {
             cache.put(event.request, response.clone());
          }
          return response;
        });
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
            if (response) return response;
            // Fallback for HTML
            if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        });
      })
  );
});
