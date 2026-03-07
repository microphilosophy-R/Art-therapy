import api from './axios';
import type { LocalizedText } from '../types';

export interface Product {
    id: string;
    artistId?: string;
    userProfileId?: string;
    title: string;
    titleI18n?: LocalizedText | null;
    description: string;
    descriptionI18n?: LocalizedText | null;
    defaultPosterId?: number | null;
    posterUrl?: string | null;
    videoUrl?: string | null;
    price: number;
    stock: number;
    category: string;
    images: { id: string; url: string; order: number }[];
    artist?: {
        user?: {
            id: string;
            firstName: string;
            lastName: string;
            avatarUrl: string | null;
        };
    };
    userProfile?: {
        user?: {
            id: string;
            firstName: string;
            lastName: string;
            avatarUrl: string | null;
        };
    };
}

export const getProducts = async (params?: {
    category?: string;
    artistId?: string;
    sellerId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}) => {
    const normalized = {
        ...params,
        sellerId: params?.sellerId ?? params?.artistId,
    };
    const { data } = await api.get('/products', { params: normalized });
    return data.data as Product[];
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

// Order APIs

export interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    product: Product;
}

export interface Order {
    id: string;
    userId: string;
    memberAddressId?: string | null;
    totalAmount: number;
    status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    shippingAddress: {
        province: string;
        city: string;
        district: string;
        addressDetail: string;
        details?: string;
        recipientName: string;
        phone: string;
        mobile?: string;
        postalCode?: string | null;
        tag?: 'HOME' | 'COMPANY' | 'SCHOOL' | 'PARENTS' | 'OTHER' | null;
    };
    carrierName: string | null;
    trackingNumber: string | null;
    items: OrderItem[];
    payment?: {
        id: string;
        amount: number;
        status: string;
        provider: string;
    };
    createdAt: string;
}

export type CreateOrderPayload =
    | { addressId: string }
    | {
        shippingAddress: {
            province: string;
            city: string;
            district: string;
            addressDetail?: string;
            details?: string;
            recipientName: string;
            phone?: string;
            mobile?: string;
            postalCode?: string | null;
            tag?: 'HOME' | 'COMPANY' | 'SCHOOL' | 'PARENTS' | 'OTHER';
        };
    };

export const createOrder = async (payload: CreateOrderPayload) => {
    const { data } = await api.post('/orders', payload);
    return data as Order;
};

export const getMyOrders = async () => {
    const { data } = await api.get('/orders/my-orders');
    return data as Order[];
};

export const getOrder = async (id: string) => {
    const { data } = await api.get(`/orders/${id}`);
    return data as Order;
};

// payment
export const createAlipayProductOrder = async (orderId: string) => {
    const { data } = await api.post('/alipay/create-product-order', { orderId });
    return data; // { payUrl: string, paymentId: string }
};

export const createWechatProductOrder = async (orderId: string) => {
    const { data } = await api.post('/wechat/create-product-order', { orderId });
    return data; // { codeUrl: string, paymentId: string }
};

export const submitProductForReview = async (id: string) => {
    await api.post(`/shop/products/${id}/submit`);
};

export const deleteProduct = async (id: string) => {
    await api.delete(`/shop/products/${id}`);
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
    const { data: result } = await api.put(`/shop/products/${id}`, data);
    return result;
};
