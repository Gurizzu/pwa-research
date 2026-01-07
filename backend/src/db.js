import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 2000, // Fail fast after 2 seconds
    connectTimeoutMS: 2000,
});

let db = null;

export async function connectDB() {
    try {
        await client.connect();
        db = client.db(process.env.DB_NAME || 'pwa');
        console.log('✅ Connected to MongoDB');
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        // Don't exit process, allow server to run and return errors to client
        // process.exit(1); 
        db = null;
    }
}

export function getDB() {
    if (!db) {
        throw new Error('Database connection lost or not initialized.');
    }
    return db;
}

export async function closeDB() {
    await client.close();
}

export function isConnected() {
    return !!db;
}
