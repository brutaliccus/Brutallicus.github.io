const CACHE_NAME = 'freilifts-cache-v1';
const URLS_TO_CACHE = [
    '/',
    'index.html',
    'style.css',
    'predefined-exercises.js',
    'js/app.js',
    'js/modules/workout.js',
    'js/modules/exercises.js',
    'js/modules/food.js',
    'js/modules/profile.js',
    'js/modules/progress.js',
    'js/modules/userAdmin.js',
    'icons/icon-192x192.png',
    'icons/icon-512x512.png'
];

// --- INSTALL: Cache the application shell ---
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching app shell');
                // Note: We are using the flattened structure now
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

// --- FETCH: Serve from cache first (Cache-First Strategy) ---
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // If the request is in the cache, return it
                if (response) {
                    return response;
                }
                // Otherwise, fetch it from the network
                return fetch(event.request);
            })
    );
});

// --- ACTIVATE: Clean up old caches ---
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});


