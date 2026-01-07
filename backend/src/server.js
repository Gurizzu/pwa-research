import express from 'express';
import cors from 'cors';
import { connectDB, getDB, isConnected } from './db.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection Check Middleware
app.use((req, res, next) => {
    if (!isConnected()) {
        // Try to reconnect? Or just fail fast.
        // Failing fast allows the frontend to immediately switch to offline mode.
        return res.status(503).json({ error: 'Database unavailable' });
    }
    next();
});

// Initialize DB
await connectDB();

// Helper function to generate unique string ID
function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== BOOKS API ====================

// Get all books
app.get('/api/books', async (req, res) => {
    try {
        const books = await getDB().collection('books').find().toArray();
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CART API ====================

// Get cart items
app.get('/api/cart', async (req, res) => {
    try {
        const cartItems = await getDB().collection('cart').find().toArray();
        res.json(cartItems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add item to cart (with idempotency support for offline sync)
// Uses atomic upsert to prevent race condition duplicates
app.post('/api/cart', async (req, res) => {
    try {
        const { bookId, quantity = 1 } = req.body;
        // Idempotency key can come from header (SW sync) or body (direct call)
        const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotencyKey;

        // If idempotency key provided, check if this exact request was already processed
        if (idempotencyKey) {
            const existingByKey = await getDB().collection('cart').findOne({ idempotencyKey });
            if (existingByKey) {
                console.log(`[Idempotency] Duplicate request detected: ${idempotencyKey}`);
                return res.json(existingByKey); // Return existing, don't duplicate
            }
        }

        // Check if book exists
        const book = await getDB().collection('books').findOne({ _id: bookId });
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Use atomic findOneAndUpdate with upsert to prevent race condition duplicates
        // Using $max for quantity so if multiple syncs happen, we keep the highest value
        // (client sends total quantity, not delta)
        const result = await getDB().collection('cart').findOneAndUpdate(
            { bookId }, // filter by bookId
            {
                $max: { quantity: quantity }, // Keep the higher quantity
                $setOnInsert: {
                    _id: generateId('cart'),
                    bookId,
                    bookTitle: book.title,
                    bookPrice: book.price,
                    bookImage: book.imageUrl,
                    addedAt: new Date(),
                    ...(idempotencyKey && { idempotencyKey })
                }
            },
            {
                upsert: true,
                returnDocument: 'after' // Return the updated/inserted document
            }
        );

        console.log(`[Cart] ${result.lastErrorObject?.updatedExisting ? 'Updated' : 'Created'} item for bookId: ${bookId}`);
        res.status(result.lastErrorObject?.updatedExisting ? 200 : 201).json(result.value);
    } catch (error) {
        console.error('[Cart] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update cart item quantity
app.put('/api/cart/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }

        const result = await getDB().collection('cart').updateOne(
            { _id: id },
            { $set: { quantity } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        const updated = await getDB().collection('cart').findOne({ _id: id });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove item from cart
app.delete('/api/cart/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await getDB().collection('cart').deleteOne({ _id: id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CHECKOUT API ====================

// Checkout cart
app.post('/api/checkout', async (req, res) => {
    try {
        const cartItems = await getDB().collection('cart').find().toArray();

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.bookPrice * item.quantity), 0);

        // Create order with string ID
        const order = {
            _id: generateId('order'),
            items: cartItems,
            total,
            status: 'completed',
            createdAt: new Date()
        };

        await getDB().collection('orders').insertOne(order);

        // Clear cart
        await getDB().collection('cart').deleteMany({});

        res.status(201).json({
            orderId: order._id,
            message: 'Checkout successful',
            order
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get order history
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await getDB().collection('orders').find().sort({ createdAt: -1 }).toArray();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
