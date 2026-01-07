import { connectDB, closeDB } from './db.js';

const sampleBooks = [
    {
        "_id": "book-004",
        title: "The Angel Next Door Spoils Me Rotten Vol. 1",
        author: "Saekisan",
        price: 10.99,
        description: "Romantic slice-of-life antara Amane dan Mahiru yang mulai saling dekat.",
        imageUrl: "http://103.150.227.175:9000/kato/download/pwa/LN_V1_Cover.webp",
        stock: 50,
        category: "Light Novel"
    },
    {
        "_id": "book-005",
        title: "The Angel Next Door Spoils Me Rotten Vol. 2",
        author: "Saekisan",
        price: 10.99,
        description: "Lanjutan hubungan Amane & Mahiru dengan kejadian baru dan perasaan yang berkembang.",
        imageUrl: "http://103.150.227.175:9000/kato/download/pwa/LN_V2_Cover.webp",
        stock: 45,
        category: "Light Novel"
    },
    {
        "_id": "book-006",
        title: "The Angel Next Door Spoils Me Rotten Vol. 3",
        author: "Saekisan",
        price: 11.49,
        description: "Amane dan Mahiru makin sering berinteraksi di kehidupan sehari-hari mereka.",
        imageUrl: "http://103.150.227.175:9000/kato/download/pwa/3.01.webp",
        stock: 40,
        category: "Light Novel"
    }
];

async function seedDatabase() {
    try {
        const db = await connectDB();

        // Clear existing data
        // await db.collection('books').deleteMany({});
        // await db.collection('cart').deleteMany({});
        // await db.collection('orders').deleteMany({});

        console.log('🗑️  Cleared existing data');

        // Insert sample books
        const result = await db.collection('books').insertMany(sampleBooks);
        console.log(`✅ Inserted ${result.insertedCount} books`);

        console.log('🌱 Database seeded successfully!');

        await closeDB();
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
