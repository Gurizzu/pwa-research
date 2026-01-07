import { openDB, type DBSchema } from 'idb';

interface PWAResearchDB extends DBSchema {
    interactions: {
        key: string; // articleId
        value: {
            articleId: string;
            liked: boolean;
            bookmarked: boolean;
        };
    };
    books: {
        key: string; // bookId
        value: any; // Book object
    };
    cart: {
        key: string; // 'current-cart'
        value: any[]; // CartItem array
    };
    syncQueue: {
        key: number; // auto-increment
        value: {
            id?: number; // Injected by IDB
            url: string;
            method: string;
            body?: any;
            timestamp: number;
            idempotencyKey?: string; // Prevents duplicate submissions
        };
    };
}

const DB_NAME = 'pwa-research-db';
const DB_VERSION = 2;

export async function initDB() {
    return openDB<PWAResearchDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('interactions')) {
                db.createObjectStore('interactions', { keyPath: 'articleId' });
            }
            if (!db.objectStoreNames.contains('books')) {
                db.createObjectStore('books', { keyPath: '_id' });
            }
            if (!db.objectStoreNames.contains('cart')) {
                db.createObjectStore('cart');
            }
            if (!db.objectStoreNames.contains('syncQueue')) {
                db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
            }
        },
    });
}

// Interaction Helpers
export async function getInteraction(articleId: string) {
    const db = await initDB();
    return db.get('interactions', articleId);
}

export async function saveInteraction(articleId: string, data: { liked: boolean; bookmarked: boolean }) {
    const db = await initDB();
    return db.put('interactions', {
        articleId,
        ...data,
    });
}

// Book Helpers
export async function cacheBooks(books: any[]) {
    const db = await initDB();
    const tx = db.transaction('books', 'readwrite');
    await Promise.all(books.map(book => tx.store.put(book)));
    await tx.done;
}

export async function getCachedBooks() {
    const db = await initDB();
    return db.getAll('books');
}

// Cart Helpers
export async function setLocalCart(cart: any[]) {
    console.log('[DB] setLocalCart() - Saving cart with', cart?.length, 'items')
    const db = await initDB();
    const result = await db.put('cart', cart, 'current-cart');
    console.log('[DB] setLocalCart() - Save complete, key:', result)
    return result;
}

export async function getLocalCart() {
    console.log('[DB] getLocalCart() - Reading cart from IDB...')
    const db = await initDB();
    const cart = await db.get('cart', 'current-cart');
    console.log('[DB] getLocalCart() - Found cart:', cart?.length, 'items', cart)
    return cart;
}

// Sync Queue Helpers
export async function addToSyncQueue(request: { url: string; method: string; body?: any }) {
    const db = await initDB();
    return db.add('syncQueue', {
        ...request,
        timestamp: Date.now(),
    });
}

export async function getSyncQueue() {
    const db = await initDB();
    return db.getAll('syncQueue');
}

export async function clearSyncQueue() {
    const db = await initDB();
    return db.clear('syncQueue');
}

export async function removeSyncItem(key: number) {
    const db = await initDB();
    return db.delete('syncQueue', key);
}
