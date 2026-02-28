import api from './axios';

export interface WechatOrderResponse {
  codeUrl: string;
  paymentId: string;
}

export const createWechatOrder = async (appointmentId: string): Promise<WechatOrderResponse> => {
  const { data } = await api.post('/wechat/create-order', { appointmentId });
  return data;
};

export const createPlanWechatOrder = async (participantId: string): Promise<WechatOrderResponse> => {
  const { data } = await api.post('/wechat/create-plan-order', { participantId });
  return data;
};

export const getWechatOrder = async (id: string) => {
  const { data } = await api.get(`/wechat/order/${id}`);
  return data;
};
