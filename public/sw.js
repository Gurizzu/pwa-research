const CACHE_NAME = "pwa-article-v3";
const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/vite.svg",
    "/manifest.json"
];

// Install Event: Cache App Shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Opened cache");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Activate worker immediately
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    event.waitUntil(self.clients.claim()); // Become available to all clients
});

// Fetch Event: Network First for Data, Cache First for Assets
self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);

    // Handle API requests (Network First)
    if (requestUrl.host === "dummyjson.com" || requestUrl.host === "images.unsplash.com") {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                try {
                    const response = await fetch(event.request);
                    cache.put(event.request, response.clone());
                    return response;
                } catch (error) {
                    const cachedResponse = await cache.match(event.request);
                    if (cachedResponse) return cachedResponse;
                    throw error;
                }
            })
        );
        return;
    }

    // Handle App Shell & Assets (Stale-While-Revalidate or Cache First)
    // Here we use Stale-While-Revalidate for better freshness
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Update cache with new version
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            });

            // Return cached response immediately if available, otherwise wait for network
            return cachedResponse || fetchPromise;
        })
    );
});
