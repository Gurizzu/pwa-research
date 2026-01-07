# PWA Book Store - Backend API

Simple CRUD API for book store with MongoDB.

## MongoDB Configuration
- **URI**: `mongodb://user:pass@localhost:27017/?authSource=admin`
- **Database**: `pwa`
- **Collections**:
  - `books` - Book catalog
  - `cart` - Shopping cart items
  - `orders` - Order history

## Setup

1. Install dependencies:
```bash
npm install
```

2. Seed the database (first time only):
```bash
npm run seed
```

3. Start the server:
```bash
npm start
```

## API Endpoints

### Books
- `GET /api/books` - Get all books

### Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add item to cart
  ```json
  { "bookId": "xxx", "quantity": 1 }
  ```
- `PUT /api/cart/:id` - Update cart item quantity
  ```json
  { "quantity": 2 }
  ```
- `DELETE /api/cart/:id` - Remove item from cart

### Checkout
- `POST /api/checkout` - Checkout cart (auto-success)
- `GET /api/orders` - Get order history

## Port
Server runs on `http://localhost:3001`
