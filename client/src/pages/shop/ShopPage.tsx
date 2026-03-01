import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts, Product } from '../../lib/api/shop';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';
import { ShoppingBag, Loader2 } from 'lucide-react';

export const ShopPage = () => {
    const [category, setCategory] = useState<string>('');
    const [search, setSearch] = useState<string>('');

    const { data, isLoading } = useQuery<{ data: Product[], pagination: any }>({
        queryKey: ['products', category, search],
        queryFn: () => getProducts({ category, search }),
    });

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Creative Art Shop</h1>
                    <p className="text-gray-600">Discover unique creative products by our therapists and artists.</p>
                </div>
            </div>

            <div className="flex gap-4 mb-8">
                <input
                    type="text"
                    placeholder="Search items..."
                    className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="px-4 py-2 border rounded-md bg-white"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="">All Categories</option>
                    <option value="PAINTING">Painting</option>
                    <option value="SCULPTURE">Sculpture</option>
                    <option value="CRAFTS">Crafts</option>
                    <option value="DIGITAL_ART">Digital Art</option>
                    <option value="MERCHANDISE">Merchandise</option>
                    <option value="OTHER">Other</option>
                </select>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {data?.data.map((product) => (
                        <Link key={product.id} to={`/shop/${product.id}`} className="group">
                            <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow duration-300">
                                <div className="aspect-square bg-gray-100 overflow-hidden relative">
                                    {product.images[0] ? (
                                        <img
                                            src={product.images[0].url}
                                            alt={product.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <ShoppingBag className="w-12 h-12" />
                                        </div>
                                    )}
                                    {product.stock === 0 && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                            Sold Out
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4">
                                    <div className="text-xs text-teal-600 font-medium mb-1">{product.category}</div>
                                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{product.title}</h3>
                                    <p className="text-sm text-gray-500 mb-3 truncate">By {product.artist.user.firstName}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg text-gray-900">¥{Number(product.price).toFixed(2)}</span>
                                        <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            View details
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                    {data?.data.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-500">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No products found matching your criteria.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
