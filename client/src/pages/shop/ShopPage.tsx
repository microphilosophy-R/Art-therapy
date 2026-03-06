import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProducts, Product } from '../../api/shop';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { pickLocalizedText } from '../../utils/i18nContent';
import { getProductCoverUrl } from '../../utils/productMedia';

export const ShopPage = () => {
    const { t, i18n } = useTranslation();
    const [category, setCategory] = useState<string>('');
    const [search, setSearch] = useState<string>('');

    const { data, isLoading } = useQuery<Product[]>({
        queryKey: ['products', category, search],
        queryFn: () => getProducts({ category, search }),
    });

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('shop.title')}</h1>
                    <p className="text-gray-600">{t('shop.subtitle')}</p>
                </div>
            </div>

            <div className="flex gap-4 mb-8">
                <input
                    type="text"
                    placeholder={t('shop.searchPlaceholder')}
                    className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="px-4 py-2 border rounded-md bg-white"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="">{t('shop.allCategories')}</option>
                    <option value="PAINTING">{t('shop.categories.PAINTING')}</option>
                    <option value="SCULPTURE">{t('shop.categories.SCULPTURE')}</option>
                    <option value="CRAFTS">{t('shop.categories.CRAFTS')}</option>
                    <option value="DIGITAL_ART">{t('shop.categories.DIGITAL_ART')}</option>
                    <option value="MERCHANDISE">{t('shop.categories.MERCHANDISE')}</option>
                    <option value="OTHER">{t('shop.categories.OTHER')}</option>
                </select>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {data?.map((product) => {
                        const sellerUser = product.userProfile?.user ?? product.artist?.user;
                        const sellerName = sellerUser?.firstName || 'Unknown Seller';
                        const title = pickLocalizedText(product.titleI18n, i18n.language, product.title);
                        const coverUrl = getProductCoverUrl(product);
                        return (
                        <Link key={product.id} to={`/shop/${product.id}`} className="group">
                            <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow duration-300">
                                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                                    {coverUrl ? (
                                        <img
                                            src={coverUrl}
                                            alt={title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <ShoppingBag className="w-12 h-12" />
                                        </div>
                                    )}
                                    {product.stock === 0 && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                            {t('shop.product.soldOut')}
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4">
                                    <div className="text-xs text-teal-600 font-medium mb-1">
                                        {t(`shop.categories.${product.category}`)}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{title}</h3>
                                    <p className="text-sm text-gray-500 mb-3 truncate">
                                        {t('shop.product.by', { name: sellerName })}
                                    </p>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg text-gray-900">¥{Number(product.price).toFixed(2)}</span>
                                        <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            {t('shop.product.viewDetails')}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                        );
                    })}
                    {data?.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-500">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>{t('shop.product.noProducts')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
