import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getProductById, addToCart } from '../../api/shop';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { Loader2, ArrowLeft, ShoppingCart, Minus, Plus } from 'lucide-react';
import { pickLocalizedText } from '../../utils/i18nContent';
import { followUser, getFollowStatus, unfollowUser } from '../../api/follows';
import { getProductCoverUrl } from '../../utils/productMedia';

export const ProductDetailsPage = () => {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
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
    const sellerUser = product.userProfile?.user ?? product.artist?.user;
    const sellerName = sellerUser
        ? `${sellerUser.firstName} ${sellerUser.lastName}`.trim()
        : 'Unknown Seller';
    const sellerInitial = sellerUser?.firstName?.charAt(0) || '?';
    const sellerAvatar = sellerUser?.avatarUrl ?? null;
    const sellerUserId = sellerUser?.id;
    const canFollowSeller = !!(isAuthenticated && user?.role === 'MEMBER' && sellerUserId && sellerUserId !== user.id);
    const productTitle = pickLocalizedText(product.titleI18n, i18n.language, product.title);
    const productDescription = pickLocalizedText(product.descriptionI18n, i18n.language, product.description);
    const productMediaImages = useMemo(() => {
        const coverUrl = getProductCoverUrl(product);
        const gallery = product.images ?? [];
        if (!coverUrl) return gallery;
        return [{ id: 'cover', url: coverUrl }, ...gallery.filter((img) => img.url !== coverUrl)];
    }, [product]);
    const activeMedia = productMediaImages[activeImage] ?? productMediaImages[0];

    const { data: followStatus } = useQuery({
        queryKey: ['follow-status', sellerUserId],
        queryFn: () => getFollowStatus(sellerUserId!),
        enabled: canFollowSeller,
    });

    const followMutation = useMutation({
        mutationFn: () => followUser(sellerUserId!),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follow-status', sellerUserId] }),
    });
    const unfollowMutation = useMutation({
        mutationFn: () => unfollowUser(sellerUserId!),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follow-status', sellerUserId] }),
    });

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
                        {activeMedia ? (
                            <img
                                src={activeMedia.url}
                                alt={productTitle}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                {t('shop.product.noImage')}
                            </div>
                        )}
                    </div>
                    {productMediaImages.length > 1 && (
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {productMediaImages.map((img, idx) => (
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
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{productTitle}</h1>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            {sellerAvatar ? (
                                <img src={sellerAvatar} alt="Artist" className="w-6 h-6 rounded-full" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs text-bold">
                                    {sellerInitial}
                                </div>
                            )}
                            <span className="text-gray-600 text-sm">
                                {t('shop.product.by', { name: sellerName })}
                            </span>
                        </div>
                        {canFollowSeller && (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={followStatus?.isFollowing ? 'outline' : 'primary'}
                                    onClick={() => {
                                        if (followStatus?.isFollowing) {
                                            unfollowMutation.mutate();
                                        } else {
                                            followMutation.mutate();
                                        }
                                    }}
                                    loading={followMutation.isPending || unfollowMutation.isPending}
                                >
                                    {followStatus?.isFollowing ? 'Following' : 'Follow'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={!followStatus?.isFollowing}
                                    onClick={() => navigate(`/dashboard/member?tab=messages&conversation=${sellerUserId}`)}
                                >
                                    Message
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="text-3xl font-bold text-gray-900 mb-6">
                        楼{Number(product.price).toFixed(2)}
                    </div>

                    <div className="prose prose-teal max-w-none text-gray-600 mb-8 whitespace-pre-line">
                        {productDescription}
                    </div>

                    {product.videoUrl && (
                        <div className="mb-8 rounded-lg border border-stone-200 bg-stone-50 p-3">
                            <video
                                src={product.videoUrl}
                                controls
                                className="w-full max-h-72 rounded-md bg-black"
                            />
                        </div>
                    )}

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

