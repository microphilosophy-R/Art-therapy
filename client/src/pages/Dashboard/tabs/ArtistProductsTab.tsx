import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyArtistProfile, getArtistProducts, deleteProduct, createProduct, updateProduct } from '../../../api/artist';
import { Button } from '../../../components/ui/Button';
import { PageLoader } from '../../../components/ui/Spinner';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const ArtistProductsTab = () => {
    const qc = useQueryClient();
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const { data: profile } = useQuery({
        queryKey: ['artist-profile', 'me'],
        queryFn: getMyArtistProfile,
    });

    const { data: products, isLoading } = useQuery({
        queryKey: ['artist-products', profile?.id],
        queryFn: () => getArtistProducts(profile!.id),
        enabled: !!profile?.id,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['artist-products'] });
        },
    });

    const saveMutation = useMutation({
        mutationFn: (data: any) => editingProduct ? updateProduct(editingProduct.id, data) : createProduct(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['artist-products'] });
            setIsFormOpen(false);
            setEditingProduct(null);
        },
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this product?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleEdit = (product: any) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const imagesStr = formData.get('images') as string;
        const images = imagesStr ? imagesStr.split(',').map(s => s.trim()) : [];

        saveMutation.mutate({
            title: formData.get('title'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price') as string),
            stock: parseInt(formData.get('stock') as string, 10),
            category: formData.get('category'),
            images,
        });
    };

    if (isLoading) return <PageLoader />;
    if (profile?.status !== 'APPROVED') {
        return (
            <div className="text-center py-12 text-stone-500">
                <p>Your artist profile must be approved before you can manage products.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-stone-900">Your Products</h2>
                {!isFormOpen && (
                    <Button onClick={() => setIsFormOpen(true)} size="sm">
                        <Plus className="h-4 w-4 mr-2" /> Add Product
                    </Button>
                )}
            </div>

            {isFormOpen && (
                <form onSubmit={handleSubmit} className="mb-8 bg-stone-50 p-6 rounded-xl border border-stone-200 space-y-4">
                    <h3 className="font-semibold text-lg">{editingProduct ? 'Edit Product' : 'New Product'}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700">Title</label>
                            <input required name="title" defaultValue={editingProduct?.title} className="mt-1 block w-full rounded-md border-stone-300 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">Category</label>
                            <select required name="category" defaultValue={editingProduct?.category || 'ARTWORK'} className="mt-1 block w-full rounded-md border-stone-300 shadow-sm">
                                <option value="ARTWORK">Artwork</option>
                                <option value="MERCHANDISE">Merchandise</option>
                                <option value="THERAPY_TOOL">Therapy Tool</option>
                                <option value="BOOK">Book</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">Price (CNY)</label>
                            <input required type="number" step="0.01" min="0" name="price" defaultValue={editingProduct?.price} className="mt-1 block w-full rounded-md border-stone-300 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">Stock</label>
                            <input required type="number" min="0" name="stock" defaultValue={editingProduct?.stock} className="mt-1 block w-full rounded-md border-stone-300 shadow-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700">Description</label>
                        <textarea required name="description" rows={3} defaultValue={editingProduct?.description} className="mt-1 block w-full rounded-md border-stone-300 shadow-sm" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700">Image URLs (comma separated)</label>
                        <input
                            required
                            name="images"
                            defaultValue={editingProduct?.images?.map((img: { url: string }) => img.url).join(', ')}
                            className="mt-1 block w-full rounded-md border-stone-300 shadow-sm"
                            placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
                        />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setEditingProduct(null); }}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={saveMutation.isPending}>
                            Save Product
                        </Button>
                    </div>
                </form>
            )}

            {(!products || products.length === 0) && !isFormOpen ? (
                <div className="text-center py-12 text-stone-500 border-2 border-dashed border-stone-200 rounded-xl">
                    <p>No products selling yet. Add your first creative product!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products?.map((product) => (
                        <div key={product.id} className="bg-white border text-left border-stone-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                            <div className="h-48 bg-stone-100 overflow-hidden relative">
                                {product.images && product.images.length > 0 ? (
                                    <img src={product.images[0].url} alt={product.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                                        No Image
                                    </div>
                                )}
                                {product.stock <= 0 && (
                                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                                        OUT OF STOCK
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-stone-900 truncate flex-1">{product.title}</h3>
                                    <span className="text-teal-700 font-bold shrink-0 ml-2">¥{product.price.toFixed(2)}</span>
                                </div>
                                <p className="text-sm text-stone-500 line-clamp-2">{product.description}</p>
                                <div className="mt-4 flex justify-between items-center text-sm border-t border-stone-100 pt-3">
                                    <span className="text-stone-600">Stock: {product.stock}</span>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleEdit(product)}
                                            className="p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
