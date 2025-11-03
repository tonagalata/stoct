// Update this version number every time you deploy changes
const CACHE_VERSION = 'v2.1.0-dev';
const CACHE_NAME = `Stoct-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;

// Development mode detection
const IS_DEVELOPMENT = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Development cache clearing is now manual only via the DevClearCacheButton

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
  '/favicon.ico'
];

// Install event - cache static resources and skip waiting
self.addEventListener('install', (event) => {
  console.log('SW: Installing version', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('SW: Activating version', CACHE_VERSION);
  console.log('SW: Development mode:', IS_DEVELOPMENT);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('Stoct-') && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );

  // Development cache clearing is now manual only - no automatic clearing
});

// Manual development cache clearing function
async function clearDevelopmentCache() {
  console.log('SW: Manual development cache clear requested');
  
  try {
    // Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        console.log('SW: Clearing cache:', cacheName);
        return caches.delete(cacheName);
      })
    );
    
    // Notify all clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_CLEARED',
        message: 'Development cache cleared manually'
      });
    });
    
    console.log('SW: Development cache cleared successfully');
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    console.error('SW: Failed to clear cache:', error);
    return { success: false, message: 'Failed to clear cache: ' + error.message };
  }
}

// Fetch event - Network first for HTML, Cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // In development mode, always fetch from network (bypass cache)
  if (IS_DEVELOPMENT) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .catch(() => {
          // Only fallback to cache if network completely fails
          return caches.match(request);
        })
    );
    return;
  }

  // Production caching strategies below...

  // Network first strategy for HTML pages (ensures fresh content)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseClone = response.clone();
          
          // Cache successful responses
          if (response.status === 200) {
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first strategy for static assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If not in cache, fetch from network and cache it
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
            
            return response;
          });
      })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  
  // Manual cache clear for development
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearDevelopmentCache().then((result) => {
      event.ports[0].postMessage(result);
    });
  }
});
