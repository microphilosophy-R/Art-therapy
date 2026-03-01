import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getCart, updateCartItem, removeFromCart } from '../../lib/api/shop';
import { Button } from '../../components/ui/button';
import { Loader2, Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';

export const CartPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: cartItems, isLoading } = useQuery({
        queryKey: ['cart'],
        queryFn: getCart,
    });

    const { mutate: handleUpdateQuantity } = useMutation({
        mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
            updateCartItem(id, quantity),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
        },
    });

    const { mutate: handleRemoveItem } = useMutation({
        mutationFn: (id: string) => removeFromCart(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
        },
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-32">
                <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
            </div>
        );
    }

    const subtotal = cartItems?.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0) || 0;

    if (!cartItems || cartItems.length === 0) {
        return (
            <div className="container mx-auto px-4 py-20 max-w-4xl text-center">
                <div className="bg-gray-50 rounded-2xl p-12 py-24 flex flex-col items-center justify-center">
                    <ShoppingBag className="w-20 h-20 text-gray-300 mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                    <p className="text-gray-500 mb-8 max-w-sm">Looks like you haven't added any creative items to your cart yet.</p>
                    <Link to="/shop">
                        <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                            Start Shopping
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Cart Items List */}
                <div className="lg:col-span-2 space-y-6">
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-6 border-b pb-6">
                            <Link to={`/shop/${item.productId}`} className="flex-shrink-0 w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border">
                                {item.product.images[0] ? (
                                    <img
                                        src={item.product.images[0].url}
                                        alt={item.product.title}
                                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <ShoppingBag className="w-8 h-8" />
                                    </div>
                                )}
                            </Link>

                            <div className="flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1 block">
                                            {item.product.category}
                                        </span>
                                        <Link to={`/shop/${item.productId}`} className="text-lg font-semibold text-gray-900 hover:text-teal-600 transition-colors">
                                            {item.product.title}
                                        </Link>
                                        <p className="text-sm text-gray-500 mt-1">By {item.product.artist.user.firstName}</p>
                                    </div>
                                    <div className="text-lg font-bold text-gray-900">
                                        ¥{Number(item.product.price).toFixed(2)}
                                    </div>
                                </div>

                                <div className="mt-auto flex justify-between items-end">
                                    <div className="flex items-center border rounded-md">
                                        <button
                                            onClick={() => handleUpdateQuantity({ id: item.id, quantity: item.quantity - 1 })}
                                            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-50 transition-colors"
                                            disabled={item.quantity <= 1}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="w-12 text-center font-medium text-sm">{item.quantity}</span>
                                        <button
                                            onClick={() => handleUpdateQuantity({ id: item.id, quantity: item.quantity + 1 })}
                                            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-50 transition-colors"
                                            disabled={item.quantity >= item.product.stock}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors flex items-center text-sm font-medium"
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-xl p-6 sticky top-24 border">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal ({cartItems.length} items)</span>
                                <span>¥{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Shipping</span>
                                <span className="text-teal-600 text-sm font-medium">Calculated at checkout</span>
                            </div>
                        </div>

                        <div className="border-t pt-4 mb-8">
                            <div className="flex justify-between items-end">
                                <span className="font-semibold text-gray-900">Total</span>
                                <div className="text-right">
                                    <span className="text-2xl font-bold text-gray-900 block">¥{subtotal.toFixed(2)}</span>
                                    <span className="text-xs text-gray-500">Includes VAT</span>
                                </div>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="w-full bg-teal-600 hover:bg-teal-700 h-14 text-lg"
                            onClick={() => navigate('/checkout')}
                        >
                            Proceed to Checkout
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>

                        <div className="mt-4 text-center">
                            <Link to="/shop" className="text-sm text-gray-500 hover:text-teal-600 transition-colors">
                                or Continue Shopping
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
