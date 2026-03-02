import api from './axios';
import { Product } from './shop';
import { Order } from './shop';

export interface ArtistProfile {
    id: string;
    userId: string;
    bio: string | null;
    portfolioUrl: string | null;
    socialLinks: Record<string, string> | null;
    commissionStatus: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface PublicArtistProfile {
    id: string;
    userId: string;
    bio: string | null;
    portfolioUrl: string | null;
    socialMediaLink: string | null;
    commissionStatus: string | null;
    profileStatus: string;
    user: {
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    };
}

// Profile Endpoints
export const getMyArtistProfile = async () => {
    const { data } = await api.get('/artist/me');
    return data as ArtistProfile;
};

export const getPublicArtistProfile = async (artistId: string) => {
    const { data } = await api.get(`/artists/${artistId}`);
    return data as PublicArtistProfile;
};

export const updateArtistProfile = async (updates: Partial<ArtistProfile>) => {
    const { data } = await api.put('/artist/me', updates);
    return data as ArtistProfile;
};

export const submitArtistProfileForReview = async () => {
    const { data } = await api.post('/artist/me/submit');
    return data;
};

// Product Endpoints
export const getArtistProducts = async (artistId: string) => {
    const { data } = await api.get('/products', { params: { artistId } });
    return data.data as Product[];
};

export const createProduct = async (productData: any) => {
    const { data } = await api.post('/products', productData);
    return data as Product;
};

export const updateProduct = async (id: string, productData: any) => {
    const { data } = await api.put(`/products/${id}`, productData);
    return data as Product;
};

export const deleteProduct = async (id: string) => {
    await api.delete(`/products/${id}`);
};

// Order Endpoints
export const getArtistOrders = async () => {
    const { data } = await api.get('/orders/seller/orders');
    return data as Order[];
};

export const fulfillOrder = async (orderId: string, fulfillmentData: { carrierName: string, trackingNumber: string }) => {
    const { data } = await api.post(`/orders/seller/orders/${orderId}/fulfill`, fulfillmentData);
    return data as Order;
};
