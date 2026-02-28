import api from './axios';

export interface AlipayOrderResponse {
  payUrl: string;
  paymentId: string;
}

export const createAlipayOrder = async (appointmentId: string): Promise<AlipayOrderResponse> => {
  const { data } = await api.post('/alipay/create-order', { appointmentId });
  return data;
};

export const createPlanAlipayOrder = async (participantId: string): Promise<AlipayOrderResponse> => {
  const { data } = await api.post('/alipay/create-plan-order', { participantId });
  return data;
};

export const getAlipayOrder = async (id: string) => {
  const { data } = await api.get(`/alipay/order/${id}`);
  return data;
};
