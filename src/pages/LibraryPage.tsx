import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Loader2, CheckCircle } from "lucide-react"
import { useNavigate } from 'react-router-dom'
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

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

    // Fetch books
    useEffect(() => {
        fetchBooks()
        fetchCart()
    }, [])

    const fetchBooks = async () => {
        try {
            const response = await fetch(`${API_URL}/books`)
            const data = await response.json()
            setBooks(data)
        } catch (error) {
            console.error('Error fetching books:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCart = async () => {
        try {
            const response = await fetch(`${API_URL}/cart`)
            const data = await response.json()
            setCart(data)
        } catch (error) {
            console.error('Error fetching cart:', error)
        }
    }

    const addToCart = async (bookId: string) => {
        try {
            await fetch(`${API_URL}/cart`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, quantity: 1 })
            })
            fetchCart()
        } catch (error) {
            console.error('Error adding to cart:', error)
        }
    }

    const updateQuantity = async (cartItemId: string, quantity: number) => {
        try {
            await fetch(`${API_URL}/cart/${cartItemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity })
            })
            fetchCart()
        } catch (error) {
            console.error('Error updating cart:', error)
        }
    }

    const removeFromCart = async (cartItemId: string) => {
        try {
            await fetch(`${API_URL}/cart/${cartItemId}`, {
                method: 'DELETE'
            })
            fetchCart()
        } catch (error) {
            console.error('Error removing from cart:', error)
        }
    }

    const checkout = async () => {
        try {
            const response = await fetch(`${API_URL}/checkout`, {
                method: 'POST'
            })
            if (response.ok) {
                setCart([])
                setCheckoutSuccess(true)
                setTimeout(() => {
                    setCheckoutSuccess(false)
                    setCartOpen(false)
                }, 2000)
            }
        } catch (error) {
            console.error('Error during checkout:', error)
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
