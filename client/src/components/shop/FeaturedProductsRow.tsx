import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getProducts } from '../../api/shop';
import { Button } from '../ui/Button';
import { Loader2, ArrowRight, ShoppingBag } from 'lucide-react';

export const FeaturedProductsRow = () => {
    const { t } = useTranslation();
    const { data: products, isLoading } = useQuery({
        queryKey: ['featured-products'],
        queryFn: () => getProducts({ limit: 4 }),
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!products || products.length === 0) {
        return null; // Don't show the section if no products
    }

    return (
        <section className="py-16 bg-white">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('shop.title')}</h2>
                        <p className="text-gray-600">{t('shop.subtitle')}</p>
                    </div>
                    <Link to="/shop">
                        <Button variant="ghost" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                            {t('shop.product.viewDetails')}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.map((product: any) => {
                        const sellerUser = product.userProfile?.user ?? product.artist?.user;
                        const sellerName = sellerUser
                            ? `${sellerUser.firstName} ${sellerUser.lastName}`.trim()
                            : 'Unknown Seller';

                        return (
                            <Link
                                key={product.id}
                                to={`/shop/${product.id}`}
                                className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                            >
                            <div className="aspect-square relative overflow-hidden bg-gray-100">
                                {product.images?.[0] ? (
                                    <img
                                        src={product.images[0].url}
                                        alt={product.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <ShoppingBag className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-teal-700 text-xs font-bold rounded-full shadow-sm uppercase tracking-wider">
                                        {t(`shop.categories.${product.category}`)}
                                    </span>
                                </div>
                                {product.stock === 0 && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                        <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold shadow-lg">
                                            {t('shop.product.soldOut')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-teal-600 transition-colors line-clamp-1">
                                    {product.title}
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">
                                    {t('shop.product.by', { name: sellerName })}
                                </p>
                                <div className="mt-auto flex items-center justify-between">
                                    <span className="text-xl font-bold text-gray-900">¥{Number(product.price).toFixed(2)}</span>
                                    <div className="p-2 rounded-full bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                                        <ShoppingBag className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
