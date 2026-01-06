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
}

const DB_NAME = 'pwa-research-db';
const DB_VERSION = 1;

export async function initDB() {
    return openDB<PWAResearchDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('interactions')) {
                db.createObjectStore('interactions', { keyPath: 'articleId' });
            }
        },
    });
}

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
