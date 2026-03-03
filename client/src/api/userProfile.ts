import api from './axios';

export const getMyProfile = async () => {
  const { data } = await api.get('/user-profile/me');
  return data;
};

export const getPublicProfile = async (id: string) => {
  const { data } = await api.get(`/user-profile/${id}`);
  return data;
};

export const updateProfileStep = async (stepNumber: number, stepData: any) => {
  const { data } = await api.put(`/user-profile/step/${stepNumber}`, stepData);
  return data;
};

export const submitProfile = async () => {
  const { data } = await api.post('/user-profile/submit');
  return data;
};

export const previewPublicProfile = async () => {
  const { data } = await api.get('/user-profile/preview');
  return data;
};

export const applyCertificate = async (type: string) => {
  const { data } = await api.post('/user-profile/certificates/apply', { type });
  return data;
};

export const uploadCertificateFiles = async (id: string, certificateUrls: string[]) => {
  const { data } = await api.put(`/user-profile/certificates/${id}/upload`, { certificateUrls });
  return data;
};

export const getMyCertificates = async () => {
  const { data } = await api.get('/user-profile/certificates/my-applications');
  return data;
};
