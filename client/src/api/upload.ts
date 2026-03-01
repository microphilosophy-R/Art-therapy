import api from './axios';

export const uploadFile = async (file: File, type?: string): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/upload', formData, {
        params: type ? { type } : undefined,
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
};
