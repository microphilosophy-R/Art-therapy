import api from './index';

export interface Product {
    id: string;
    artistId: string;
    title: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    images: { id: string; url: string; order: number }[];
    artist: {
        user: {
            firstName: string;
            lastName: string;
            avatarUrl: string | null;
        }
    };
}

export const getProducts = async (params?: {
    category?: string;
    artistId?: string;
    search?: string;
    page?: number;
    limit?: number;
}) => {
    const { data } = await api.get('/products', { params });
    return data;
};

export const getProductById = async (id: string) => {
    const { data } = await api.get(`/products/${id}`);
    return data as Product;
};

// Cart APIs

export interface CartItem {
    id: string;
    productId: string;
    quantity: number;
    product: Product;
}

export const getCart = async () => {
    const { data } = await api.get('/cart');
    return data as CartItem[];
};

export const addToCart = async (productId: string, quantity: number) => {
    const { data } = await api.post('/cart', { productId, quantity });
    return data;
};

export const updateCartItem = async (id: string, quantity: number) => {
    const { data } = await api.put(`/cart/${id}`, { quantity });
    return data;
};

export const removeFromCart = async (id: string) => {
    await api.delete(`/cart/${id}`);
};

export const clearCart = async () => {
    await api.delete('/cart');
};
