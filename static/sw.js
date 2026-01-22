const CACHE_NAME = 'fraud-detection-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/model.html',
  '/visualizations.html',
  '/analysis.html',
  '/theory.html',
  '/feature.html',
  '/amount-trends.html',
  '/static/css/style.css',
  '/static/js/script.js',
  '/static/js/model.js',
  '/static/images/1.svg',
  '/static/images/1.ico',
  'https://cdn.plot.ly/plotly-2.32.0.min.js',
  'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', function(event) {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(function(error) {
        console.log('[SW] Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', function(event) {
  const requestURL = new URL(event.request.url);
  
  // Handle API requests
  if (requestURL.pathname.startsWith('/predict')) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Clone and cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(function() {
          // Return offline message for API calls when offline
          return new Response(JSON.stringify({
            error: 'Offline',
            message: 'Please check your internet connection'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Handle other requests
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(function(response) {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone and cache the response
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(function() {
            // Return offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// Background sync for offline predictions
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-prediction') {
    event.waitUntil(syncPredictions());
  }
});

function syncPredictions() {
  // Handle offline prediction queue when back online
  return self.registration.sync.register('background-prediction');
}

// Push notifications (optional)
self.addEventListener('push', function(event) {
  const options = {
    body: event.data ? event.data.text() : 'New fraud alert!',
    icon: '/static/images/icon-192.png',
    badge: '/static/images/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/static/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/static/images/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Fraud Detection Alert', options)
  );
});