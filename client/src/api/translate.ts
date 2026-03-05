import api from './axios';

export type TranslateLang = 'zh' | 'en';

export interface TranslateBatchItemInput {
  key: string;
  text: string;
  sourceLang: TranslateLang;
  targetLang: TranslateLang;
}

export interface TranslateBatchResult {
  key: string;
  status: 'ok' | 'failed';
  translatedText?: string;
  errorCode?: string;
}

export interface TranslateBatchResponse {
  mode: 'auto' | 'manual';
  provider: 'DEEPL';
  results: TranslateBatchResult[];
}

export const translateBatch = async (
  items: TranslateBatchItemInput[],
): Promise<TranslateBatchResponse> => {
  const { data } = await api.post('/translate/batch', { items });
  return data as TranslateBatchResponse;
};
