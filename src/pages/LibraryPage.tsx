import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Loader2, CheckCircle } from "lucide-react"
import { useNavigate } from 'react-router-dom'
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    initDB,
    cacheBooks,
    getCachedBooks,
    setLocalCart,
    getLocalCart,
    addToSyncQueue,
    getSyncQueue,
    removeSyncItem
} from '../lib/db'

const API_URL = 'http://localhost:3001/api'

interface Book {
    _id: string
    title: string
    author: string
    price: number
    description: string
    imageUrl: string
    stock: number
    category: string
}

interface CartItem {
    _id: string
    bookId: string
    bookTitle: string
    bookPrice: number
    bookImage: string
    quantity: number
}

function LibraryPage() {
    const navigate = useNavigate()
    const [books, setBooks] = useState<Book[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(true)
    const [cartOpen, setCartOpen] = useState(false)
    const [checkoutSuccess, setCheckoutSuccess] = useState(false)

    // Fetch books & Cart with Sync logic
    useEffect(() => {
        const init = async () => {
            console.log('[DEBUG] init() - navigator.onLine:', navigator.onLine)

            // CRITICAL: Load local cart from IDB FIRST before anything else
            const localCart = await getLocalCart()
            console.log('[DEBUG] init() - localCart from IDB:', localCart)
            if (localCart && localCart.length > 0) {
                console.log('[DEBUG] init() - Setting cart from IDB:', localCart.length, 'items')
                setCart(localCart)
            }

            // Register Background Sync - let SW handle syncing to avoid race condition
            if (navigator.onLine && 'serviceWorker' in navigator && 'SyncManager' in window) {
                try {
                    const registration = await navigator.serviceWorker.ready
                    // @ts-ignore
                    await registration.sync.register('sync-queue')
                    console.log('[DEBUG] init() - Background Sync registered')
                } catch (err) {
                    console.log('[DEBUG] init() - Background Sync registration failed:', err)
                }
            }

            // Fetch latest data (fetchCart will merge with local unsynced items)
            fetchBooks()
            fetchCart()
        }
        init()

        // Sync listener for subsequent online events
        const handleOnline = async () => {
            console.log('[DEBUG] Back online! Triggering Background Sync...')
            // Trigger Background Sync instead of UI-level sync to avoid race condition
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                try {
                    const registration = await navigator.serviceWorker.ready
                    // @ts-ignore
                    await registration.sync.register('sync-queue')
                } catch (err) {
                    console.log('[DEBUG] Background Sync registration failed:', err)
                }
            }
            // fetchCart will be called after SW notifies us via postMessage
        }
        window.addEventListener('online', handleOnline)

        // Listen for Service Worker sync completion messages
        const handleSWMessage = (event: MessageEvent) => {
            if (event.data?.type === 'SYNC_COMPLETE') {
                console.log(`[DEBUG] SW synced ${event.data.syncedCount} items, refreshing cart...`)
                fetchCart()
            }
        }
        navigator.serviceWorker?.addEventListener('message', handleSWMessage)

        return () => {
            window.removeEventListener('online', handleOnline)
            navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
        }
    }, [])

    const fetchBooks = async () => {
        try {
            console.log('Fetching books...')
            const response = await fetch(`${API_URL}/books`)
            if (!response.ok) throw new Error('Network error')
            const data = await response.json()
            setBooks(data)
            await cacheBooks(data)
        } catch (error) {
            console.error('Error fetching books:', error)
            const cached = await getCachedBooks()
            if (cached && cached.length > 0) {
                setBooks(cached)
            }
            console.log('Using cached books')
            console.log(cached)
        } finally {
            setLoading(false)
        }
    }

    const fetchCart = async () => {
        console.log('[DEBUG] fetchCart() - Starting, navigator.onLine:', navigator.onLine)

        try {
            console.log('[DEBUG] fetchCart() - Attempting fetch...')
            const response = await fetch(`${API_URL}/cart`)
            console.log('[DEBUG] fetchCart() - Response status:', response.status)
            if (!response.ok) throw new Error('Network error')

            // Server data
            const serverData: CartItem[] = await response.json()
            console.log('[DEBUG] fetchCart() - Server has', serverData.length, 'items')

            // Get current local cart to check for items not yet synced
            const localCart = await getLocalCart() || []
            console.log('[DEBUG] fetchCart() - Local IDB has', localCart.length, 'items')

            // Find local items with temp IDs that are NOT in server data
            // These are items that were added locally but not yet synced
            const localOnlyItems: CartItem[] = []
            const allBooks = books.length > 0 ? books : (await getCachedBooks() || [])

            for (const localItem of localCart) {
                // If it's a temp item (not synced)
                if (localItem._id && localItem._id.startsWith('temp-')) {
                    // Check if this bookId exists in server data
                    const existsOnServer = serverData.find(s => s.bookId === localItem.bookId)
                    if (!existsOnServer) {
                        console.log('[DEBUG] fetchCart() - Found unsynced local item:', localItem.bookId)
                        localOnlyItems.push(localItem)

                        // Also add to sync queue if not already there
                        const queue = await getSyncQueue()
                        const alreadyQueued = queue.find(q =>
                            q.method === 'POST' &&
                            q.url.endsWith('/cart') &&
                            q.body?.bookId === localItem.bookId
                        )
                        if (!alreadyQueued) {
                            console.log('[DEBUG] fetchCart() - Adding orphaned item to sync queue:', localItem.bookId)
                            await addToSyncQueue({
                                url: `${API_URL}/cart`,
                                method: 'POST',
                                body: { bookId: localItem.bookId, quantity: localItem.quantity }
                            })
                        }
                    }
                }
            }

            // Also check for pending adds in syncQueue (items that haven't been synced yet)
            const queue = await getSyncQueue()
            const pendingAdds = queue.filter(q => q.method === 'POST' && q.url.endsWith('/cart'))

            for (const pending of pendingAdds) {
                const bookId = pending.body.bookId
                // Check if this bookId is already in serverData or localOnlyItems
                const existsOnServer = serverData.find(i => i.bookId === bookId)
                const existsInLocal = localOnlyItems.find(i => i.bookId === bookId)

                if (!existsOnServer && !existsInLocal) {
                    const book = allBooks.find(b => b._id === bookId)
                    if (book) {
                        localOnlyItems.push({
                            _id: `temp-pending-${bookId}`,
                            bookId: book._id,
                            bookTitle: book.title,
                            bookPrice: book.price,
                            bookImage: book.imageUrl,
                            quantity: pending.body.quantity || 1
                        })
                    }
                }
            }

            // Merge: server data + local-only items (preserving unsynced items)
            const mergedCart = [...serverData, ...localOnlyItems]
            console.log('[DEBUG] fetchCart() - Merged cart:', mergedCart.length, 'items (server:', serverData.length, '+ local:', localOnlyItems.length, ')')

            setCart(mergedCart)
            await setLocalCart(mergedCart)

        } catch (error) {
            console.log('[DEBUG] fetchCart() - OFFLINE/ERROR, loading from IDB')
            console.error('Error fetching cart:', error)
            const cached = await getLocalCart()
            console.log('[DEBUG] fetchCart() - Cached cart from IDB:', cached)
            if (cached && cached.length > 0) {
                console.log('[DEBUG] fetchCart() - Setting cart from cache:', cached.length, 'items')
                setCart(cached)
            } else {
                console.log('[DEBUG] fetchCart() - No cached cart found!')
            }
        }
    }

    const addToCart = async (bookId: string) => {
        console.log('[DEBUG] addToCart() - bookId:', bookId)
        const book = books.find(b => b._id === bookId)
        if (!book) {
            console.log('[DEBUG] addToCart() - Book not found!')
            return
        }

        const existingItem = cart.find(item => item.bookId === bookId)
        let newCart: CartItem[] = []
        let isNewTempItem = false

        if (existingItem) {
            // Item exists - increment quantity locally
            newCart = cart.map(item =>
                item.bookId === bookId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )

            // If existing item is TEMP (not yet synced), update the pending queue entry
            if (existingItem._id.startsWith('temp-')) {
                const db = await initDB()
                const queue = await getSyncQueue()
                const queueItem = queue.find(q =>
                    q.method === 'POST' &&
                    q.url.endsWith('/cart') &&
                    q.body.bookId === bookId
                )
                if (queueItem) {
                    queueItem.body.quantity += 1
                    await db.put('syncQueue', queueItem)
                    console.log('[DEBUG] addToCart() - Updated queue entry, new quantity:', queueItem.body.quantity)
                }
            }
            // If existing item is already SYNCED (real server ID), we'll POST to server below
        } else {
            // New item - create temp item
            isNewTempItem = true
            newCart = [...cart, {
                _id: `temp-${bookId}`,
                bookId: book._id,
                bookTitle: book.title,
                bookPrice: book.price,
                bookImage: book.imageUrl,
                quantity: 1
            }]
        }

        // 1. Update UI immediately
        console.log('[DEBUG] addToCart() - Setting new cart:', newCart.length, 'items')
        setCart(newCart)

        // 2. ALWAYS persist to IDB
        await setLocalCart(newCart)
        console.log('[DEBUG] addToCart() - IDB persist complete')

        // 3. Handle sync based on item type
        if (isNewTempItem) {
            // NEW TEMP ITEM: Use queue-first pattern for offline support
            const idempotencyKey = `add-${bookId}-${Date.now()}`
            const queueId = await addToSyncQueue({
                url: `${API_URL}/cart`,
                method: 'POST',
                body: { bookId, quantity: 1, idempotencyKey }
            }) as number

            if (navigator.onLine) {
                try {
                    const response = await fetch(`${API_URL}/cart`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookId, quantity: 1, idempotencyKey })
                    })
                    if (response.ok) {
                        await removeSyncItem(queueId)
                        fetchCart() // Get real server ID
                    }
                } catch (error) {
                    console.log('[DEBUG] addToCart() - Network failed, queued for sync')
                }
            }
        } else if (existingItem && !existingItem._id.startsWith('temp-')) {
            // EXISTING SYNCED ITEM: Direct POST to increment on server
            if (navigator.onLine) {
                try {
                    console.log('[DEBUG] addToCart() - Incrementing synced item on server')
                    const response = await fetch(`${API_URL}/cart`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookId, quantity: 1 }) // increment by 1
                    })
                    if (response.ok) {
                        fetchCart() // Refresh cart with server data
                    }
                } catch (error) {
                    console.log('[DEBUG] addToCart() - Network failed for synced item increment')
                    // TODO: Could add to queue for retry
                }
            }
        }
        // For existing TEMP items, we already updated the queue entry above
    }

    const updateQuantity = async (cartItemId: string, quantity: number) => {
        const itemToUpdate = cart.find(i => i._id === cartItemId)
        if (!itemToUpdate) return

        const newCart = cart.map(item =>
            item._id === cartItemId
                ? { ...item, quantity }
                : item
        )
        setCart(newCart)
        await setLocalCart(newCart)

        if (cartItemId.startsWith('temp-')) {
            const db = await initDB()
            const queue = await getSyncQueue()
            const queueItem = queue.find(q =>
                q.method === 'POST' &&
                q.url.endsWith('/cart') &&
                q.body.bookId === itemToUpdate.bookId
            )
            if (queueItem) {
                queueItem.body.quantity = quantity
                await db.put('syncQueue', queueItem)
            }
            return
        }

        try {
            await fetch(`${API_URL}/cart/${cartItemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity })
            })
        } catch (error) {
            console.error('Error updating cart:', error)
            await addToSyncQueue({
                url: `${API_URL}/cart/${cartItemId}`,
                method: 'PUT',
                body: { quantity }
            })
        }
    }

    const removeFromCart = async (cartItemId: string) => {
        const itemToRemove = cart.find(i => i._id === cartItemId)
        if (!itemToRemove) return

        const newCart = cart.filter(item => item._id !== cartItemId)
        setCart(newCart)
        await setLocalCart(newCart)

        if (cartItemId.startsWith('temp-')) {
            const queue = await getSyncQueue()
            const queueItem = queue.find(q =>
                q.method === 'POST' &&
                q.url.endsWith('/cart') &&
                q.body.bookId === itemToRemove.bookId
            )
            if (queueItem) {
                // @ts-ignore
                await removeSyncItem(queueItem.id) // TS might complain about 'id' if not casted, but 'getSyncQueue' returns stored objects
            }
            return
        }

        try {
            await fetch(`${API_URL}/cart/${cartItemId}`, {
                method: 'DELETE'
            })
            fetchCart()
        } catch (error) {
            console.error('Error removing from cart:', error)
            await addToSyncQueue({
                url: `${API_URL}/cart/${cartItemId}`,
                method: 'DELETE'
            })
        }
    }

    const checkout = async () => {
        try {
            const response = await fetch(`${API_URL}/checkout`, {
                method: 'POST'
            })
            if (response.ok) {
                setCart([])
                setLocalCart([])
                setCheckoutSuccess(true)
                setTimeout(() => {
                    setCheckoutSuccess(false)
                    setCartOpen(false)
                }, 2000)
            }
        } catch (error) {
            console.error('Error during checkout:', error)
            // Offline checkout is tricky. 
            // We could queue it, empty cart, and hope it succeeds?
            // User requested offline cart support.
            // Let's optimistic success + queue.
            setCart([])
            setLocalCart([])
            setCheckoutSuccess(true)
            setTimeout(() => {
                setCheckoutSuccess(false)
                setCartOpen(false)
            }, 2000)

            await addToSyncQueue({
                url: `${API_URL}/checkout`,
                method: 'POST'
            })
        }
    }

    const cartTotal = cart.reduce((sum, item) => sum + (item.bookPrice * item.quantity), 0)
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
                <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
                    <Button variant="ghost" size="icon" className="-ml-2" onClick={() => navigate('/')}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Back</span>
                    </Button>
                    <h1 className="text-xl font-bold">Book Library</h1>
                    <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(!cartOpen)}>
                        <ShoppingCart className="h-5 w-5" />
                        {cartItemCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                {cartItemCount}
                            </Badge>
                        )}
                    </Button>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Books Grid */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2">Available Books</h2>
                    <p className="text-neutral-500 dark:text-neutral-400">Browse our collection of {books.length} books</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {books.map(book => (
                        <Card key={book._id} className="overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow">
                            <div className="aspect-[3/4] w-full bg-neutral-100 dark:bg-neutral-800 relative">
                                <img
                                    src={book.imageUrl}
                                    alt={book.title}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            </div>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <CardTitle className="text-lg leading-tight line-clamp-2">{book.title}</CardTitle>
                                    <Badge variant="secondary" className="shrink-0">{book.category}</Badge>
                                </div>
                                <CardDescription className="text-sm">{book.author}</CardDescription>
                            </CardHeader>
                            <CardContent className="pb-3 flex-1">
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
                                    {book.description}
                                </p>
                            </CardContent>
                            <CardFooter className="flex items-center justify-between pt-3 border-t">
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    ${book.price.toFixed(2)}
                                </span>
                                <Button onClick={() => addToCart(book._id)} size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add to Cart
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Cart Sidebar */}
            {cartOpen && (
                <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setCartOpen(false)}>
                    <div
                        className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">Shopping Cart</h2>
                                <Button variant="ghost" size="icon" onClick={() => setCartOpen(false)}>
                                    ×
                                </Button>
                            </div>

                            {checkoutSuccess ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                                    <h3 className="text-xl font-bold mb-2">Order Successful!</h3>
                                    <p className="text-neutral-500">Thank you for your purchase</p>
                                </div>
                            ) : cart.length === 0 ? (
                                <div className="text-center py-12">
                                    <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-neutral-300 dark:text-neutral-700" />
                                    <p className="text-neutral-500">Your cart is empty</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4 mb-6">
                                        {cart.map(item => (
                                            <Card key={item._id}>
                                                <CardContent className="p-4">
                                                    <div className="flex gap-3">
                                                        <img
                                                            src={item.bookImage}
                                                            alt={item.bookTitle}
                                                            className="w-16 h-20 object-cover rounded"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-sm line-clamp-1 mb-1">{item.bookTitle}</h3>
                                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                                                                ${item.bookPrice.toFixed(2)}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-7 w-7"
                                                                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                                                    disabled={item.quantity <= 1}
                                                                >
                                                                    <Minus className="h-3 w-3" />
                                                                </Button>
                                                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-7 w-7"
                                                                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                                                >
                                                                    <Plus className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 ml-auto text-red-500 hover:text-red-600"
                                                                    onClick={() => removeFromCart(item._id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="space-y-2 mb-6">
                                        <div className="flex justify-between text-sm">
                                            <span>Subtotal</span>
                                            <span>${cartTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg">
                                            <span>Total</span>
                                            <span className="text-blue-600 dark:text-blue-400">${cartTotal.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <Button onClick={checkout} className="w-full" size="lg">
                                        <ShoppingCart className="mr-2 h-5 w-5" />
                                        Checkout Now
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LibraryPage
