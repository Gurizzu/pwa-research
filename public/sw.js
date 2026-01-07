const CACHE_NAME = "pwa-article-v5";
const CACHE_NAME_BOOK = "pwa-book-v2";
const cacheWhitelist = [CACHE_NAME, CACHE_NAME_BOOK];

const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/vite.svg",
    "/manifest.json"
];

// Install Event: Cache App Shell
self.addEventListener("install", (event) => {
    console.log("Opened cache");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
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
    event.waitUntil(self.clients.claim());
});

// Fetch Event
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    // Navigation: Return App Shell
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match("/index.html").then(response => {
                    if (response) return response;
                    // If index.html is missing, we can't show anything.
                    throw new Error("Offline and index.html not cached");
                });
            })
        );
        return;
    }

    // External API & Images (Network First)
    if (
        url.hostname === "dummyjson.com" ||
        url.hostname === "images.unsplash.com"
    ) {
        event.respondWith(networkFirst(event.request, CACHE_NAME));
        return;
    }

    // Internal API / Minio (Network First)
    if (
        (url.hostname === "localhost" && url.port === "3001") ||
        (url.hostname === "103.150.227.175" && url.port === "9000")
    ) {
        event.respondWith(networkFirst(event.request, CACHE_NAME_BOOK));
        return;
    }

    // App Shell & Assets (Stale While Revalidate / Cache First fallback)
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetchPromise = fetch(event.request).then((response) => {
                if (response && response.status === 200) {
                    // Clone BEFORE using the response
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) =>
                        cache.put(event.request, responseClone)
                    );
                }
                return response;
            }).catch(() => {
                // Network failed, return cached if available
                return cached;
            });
            return cached || fetchPromise;
        })
    );
});

// Helper function for Network First strategy
// Supports opaque responses (for images) and proper offline fallback
function networkFirst(request, cacheName) {
    return caches.open(cacheName).then((cache) => {
        return fetch(request)
            .then((response) => {
                // Cache successful responses OR opaque responses (type 'opaque', status 0)
                // Opaque responses are common for CORS-restricted images
                if (response.status === 200 || response.type === 'opaque') {
                    cache.put(request, response.clone());
                }
                return response;
            })
            .catch(async (error) => {
                console.warn(`[SW] Network request failed for ${request.url}, trying cache...`);
                const cachedResponse = await cache.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                // If not in cache, throw error so the client can handle it (e.g. try IDB)
                throw error;
            });
    });
}

// Background Sync Event
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-queue') {
        console.log('[SW] Background Sync triggered');
        event.waitUntil(processSyncQueue());
    }
});

// Minimal IDB Helper for SW
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("pwa-research-db", 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function processSyncQueue() {
    try {
        const db = await openDB();
        const tx = db.transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');
        const getAllReq = store.getAll();

        const queue = await new Promise((resolve, reject) => {
            getAllReq.onsuccess = () => resolve(getAllReq.result);
            getAllReq.onerror = () => reject(getAllReq.error);
        });

        if (!queue || queue.length === 0) return;

        console.log(`[SW] Processing ${queue.length} items from syncQueue...`);

        let syncedCount = 0;
        for (const item of queue) {
            try {
                // Build headers with idempotency key if present
                const headers = { 'Content-Type': 'application/json' };
                if (item.idempotencyKey) {
                    headers['X-Idempotency-Key'] = item.idempotencyKey;
                }

                await fetch(item.url, {
                    method: item.method,
                    headers,
                    body: item.body ? JSON.stringify(item.body) : undefined
                });

                // Remove from IDB
                const delTx = db.transaction('syncQueue', 'readwrite');
                delTx.objectStore('syncQueue').delete(item.id);
                syncedCount++;
                console.log(`[SW] Synced: ${item.method} ${item.url}`);
            } catch (err) {
                console.error('[SW] Sync failed for item', item, err);
                // Leave in queue for retry on next sync
            }
        }

        // Notify all open clients that sync completed
        if (syncedCount > 0) {
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach(client => {
                client.postMessage({ type: 'SYNC_COMPLETE', syncedCount });
            });
            console.log(`[SW] Notified ${clients.length} clients of sync completion`);
        }
    } catch (err) {
        console.error('[SW] Error processing sync queue:', err);
    }
}
