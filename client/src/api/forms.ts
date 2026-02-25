import api from './axios';

export type QuestionType = 'SHORT_TEXT' | 'LONG_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'SCALE' | 'YES_NO';
export type FormStatus = 'DRAFT' | 'SENT' | 'SUBMITTED' | 'ARCHIVED';

export interface FormQuestion {
  id: string;
  formId: string;
  order: number;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[];
  scaleMin?: number;
  scaleMax?: number;
}

export interface FormAnswer {
  id: string;
  questionId: string;
  value: string;
  question?: FormQuestion;
}

export interface FormResponse {
  id: string;
  formId: string;
  submittedAt: string;
  answers: FormAnswer[];
}

export interface ClientForm {
  id: string;
  title: string;
  description?: string;
  status: FormStatus;
  senderId: string;
  recipientId: string;
  sentAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  questions?: FormQuestion[];
  responses?: FormResponse[];
  sender?: { id: string; firstName: string; lastName: string };
  recipient?: { id: string; firstName: string; lastName: string; email: string };
  _count?: { questions: number; responses: number };
}

export interface CreateFormPayload {
  title: string;
  description?: string;
  recipientId: string;
  questions: {
    order: number;
    type: QuestionType;
    label: string;
    required: boolean;
    options: string[];
    scaleMin?: number;
    scaleMax?: number;
  }[];
}

export interface PaginatedForms {
  data: ClientForm[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Therapist / Admin
export const createForm = async (payload: CreateFormPayload): Promise<ClientForm> => {
  const { data } = await api.post('/forms', payload);
  return data;
};

export const listSentForms = async (page = 1, status?: FormStatus): Promise<PaginatedForms> => {
  const { data } = await api.get('/forms/sent', { params: { page, limit: 20, status } });
  return data;
};

export const getFormWithResponses = async (id: string): Promise<ClientForm> => {
  const { data } = await api.get(`/forms/${id}/detail`);
  return data;
};

export const sendForm = async (id: string): Promise<ClientForm> => {
  const { data } = await api.patch(`/forms/${id}/send`);
  return data;
};

export const archiveForm = async (id: string): Promise<ClientForm> => {
  const { data } = await api.patch(`/forms/${id}/archive`);
  return data;
};

// Client
export const listReceivedForms = async (page = 1): Promise<PaginatedForms> => {
  const { data } = await api.get('/forms/received', { params: { page, limit: 20 } });
  return data;
};

export const getFormForClient = async (id: string): Promise<ClientForm> => {
  const { data } = await api.get(`/forms/${id}`);
  return data;
};

export const submitForm = async (
  id: string,
  answers: { questionId: string; value: string }[]
): Promise<FormResponse> => {
  const { data } = await api.post(`/forms/${id}/submit`, { answers });
  return data;
};
