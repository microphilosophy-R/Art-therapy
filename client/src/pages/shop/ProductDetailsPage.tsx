import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getProductById, addToCart } from '../../api/shop';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { Loader2, ArrowLeft, ShoppingCart, Minus, Plus } from 'lucide-react';

export const ProductDetailsPage = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const queryClient = useQueryClient();
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);

    const { data: product, isLoading } = useQuery({
        queryKey: ['product', id],
        queryFn: () => getProductById(id!),
        enabled: !!id,
    });

    const { mutate: handleAddToCart, isPending: isAdding } = useMutation({
        mutationFn: () => addToCart(product!.id, quantity),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            // We could use a toast notification here
            navigate('/cart');
        },
    });

    if (isLoading) {
        return (
            <div className="flex justify-center flex-col items-center py-32 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
                <p className="text-gray-500">{t('shop.product.loading')}</p>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('shop.product.notFound')}</h2>
                <Link to="/shop">
                    <Button variant="outline">{t('shop.product.backToShop')}</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <Link to="/shop" className="inline-flex items-center text-gray-500 hover:text-teal-600 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('shop.product.backToShop')}
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Image Gallery */}
                <div className="space-y-4">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                        {product.images.length > 0 ? (
                            <img
                                src={product.images[activeImage].url}
                                alt={product.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                {t('shop.product.noImage')}
                            </div>
                        )}
                    </div>
                    {product.images.length > 1 && (
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {product.images.map((img, idx) => (
                                <button
                                    key={img.id}
                                    onClick={() => setActiveImage(idx)}
                                    className={`w-20 h-20 rounded-md overflow-hidden border-2 flex-shrink-0 transition-colors ${activeImage === idx ? 'border-teal-600' : 'border-transparent hover:border-gray-300'
                                        }`}
                                >
                                    <img src={img.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="flex flex-col">
                    <div className="mb-2">
                        <span className="text-sm font-semibold tracking-wider text-teal-600 uppercase">
                            {t(`shop.categories.${product.category}`)}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{product.title}</h1>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            {product.artist.user.avatarUrl ? (
                                <img src={product.artist.user.avatarUrl} alt="Artist" className="w-6 h-6 rounded-full" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs text-bold">
                                    {product.artist.user.firstName.charAt(0)}
                                </div>
                            )}
                            <span className="text-gray-600 text-sm">
                                {t('shop.product.by', { name: `${product.artist.user.firstName} ${product.artist.user.lastName}` })}
                            </span>
                        </div>
                    </div>

                    <div className="text-3xl font-bold text-gray-900 mb-6">
                        ¥{Number(product.price).toFixed(2)}
                    </div>

                    <div className="prose prose-teal max-w-none text-gray-600 mb-8 whitespace-pre-line">
                        {product.description}
                    </div>

                    <div className="mt-auto border-t pt-6 space-y-6">
                        {product.stock > 0 ? (
                            <>
                                <div className="flex items-center gap-4">
                                    <span className="font-medium text-gray-700">{t('shop.product.quantity')}</span>
                                    <div className="flex items-center border rounded-md">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-50 transition-colors"
                                            disabled={quantity <= 1}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="w-12 text-center font-medium">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                                            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-50 transition-colors"
                                            disabled={quantity >= product.stock}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <span className="text-sm text-gray-500">{t('shop.product.available', { count: product.stock })}</span>
                                </div>

                                {isAuthenticated ? (
                                    <Button
                                        size="lg"
                                        className="w-full text-lg h-14 bg-teal-600 hover:bg-teal-700"
                                        onClick={() => handleAddToCart()}
                                        disabled={isAdding}
                                    >
                                        {isAdding ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShoppingCart className="w-5 h-5 mr-2" />}
                                        {t('shop.product.addToCart')}
                                    </Button>
                                ) : (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-full text-lg h-14 border-teal-600 text-teal-600 hover:bg-teal-50"
                                        onClick={() => navigate('/login?redirect=/shop/' + product.id)}
                                    >
                                        {t('shop.product.loginToAddToCart')}
                                    </Button>
                                )}
                            </>
                        ) : (
                            <Button size="lg" disabled className="w-full text-lg h-14 bg-gray-300">
                                {t('shop.product.outOfStock')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
