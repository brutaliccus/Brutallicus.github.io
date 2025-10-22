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
    'js/modules/userAdmin.js'
];

// Install the service worker and cache all the app's assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

// Intercept fetch requests and serve from cache first
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Not in cache - fetch from network
                return fetch(event.request);
            }
        )
    );
});

// Clean up old caches when a new service worker activates
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});