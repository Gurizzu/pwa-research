import express from 'express';
import cors from 'cors';
import { connectDB, getDB } from './db.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Add item to cart
app.post('/api/cart', async (req, res) => {
    try {
        const { bookId, quantity = 1 } = req.body;

        // Check if book exists
        const book = await getDB().collection('books').findOne({ _id: bookId });
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Check if already in cart
        const existingItem = await getDB().collection('cart').findOne({ bookId });

        if (existingItem) {
            // Update quantity
            const result = await getDB().collection('cart').updateOne(
                { bookId },
                { $inc: { quantity: quantity } }
            );
            const updated = await getDB().collection('cart').findOne({ bookId });
            res.json(updated);
        } else {
            // Add new item with string ID
            const cartItem = {
                _id: generateId('cart'),
                bookId,
                bookTitle: book.title,
                bookPrice: book.price,
                bookImage: book.imageUrl,
                quantity,
                addedAt: new Date()
            };
            await getDB().collection('cart').insertOne(cartItem);
            res.status(201).json(cartItem);
        }
    } catch (error) {
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
