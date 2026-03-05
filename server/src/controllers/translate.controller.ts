import { Request, Response } from 'express';
import type { TranslateBatchInput } from '../schemas/translate.schemas';

type LangCode = 'zh' | 'en';
type DeepLLang = 'ZH' | 'EN';

type TranslationResult = {
  key: string;
  status: 'ok' | 'failed';
  translatedText?: string;
  errorCode?: string;
};

const mapToDeepLLang = (lang: LangCode): DeepLLang => (lang === 'zh' ? 'ZH' : 'EN');
const timeoutMs = Number(process.env.TRANSLATE_TIMEOUT_MS ?? '8000');
const baseUrl = (process.env.DEEPL_API_BASE_URL ?? 'https://api-free.deepl.com').replace(/\/+$/, '');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const classifyError = (status: number | null, code?: string): string => {
  if (status === 429) return 'UPSTREAM_RATE_LIMITED';
  if (status === 400) return 'UPSTREAM_BAD_REQUEST';
  if (status === 401 || status === 403) return 'UPSTREAM_AUTH_FAILED';
  if (status && status >= 500) return 'UPSTREAM_SERVER_ERROR';
  if (code === 'TIMEOUT') return 'UPSTREAM_TIMEOUT';
  return 'UPSTREAM_ERROR';
};

const translateGroupWithRetry = async (
  sourceLang: DeepLLang,
  targetLang: DeepLLang,
  texts: string[],
): Promise<{ ok: true; translations: string[] } | { ok: false; errorCode: string }> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/v2/translate`, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: texts,
          source_lang: sourceLang,
          target_lang: targetLang,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const errorCode = classifyError(response.status);
        const canRetry = (response.status === 429 || response.status >= 500) && attempt === 0;
        if (canRetry) {
          await sleep(250);
          continue;
        }
        return { ok: false, errorCode };
      }

      const data = (await response.json()) as { translations?: Array<{ text?: string }> };
      const translations = data.translations?.map((entry) => entry.text ?? '') ?? [];
      if (translations.length !== texts.length) {
        return { ok: false, errorCode: 'UPSTREAM_INVALID_RESPONSE' };
      }
      return { ok: true, translations };
    } catch (error: unknown) {
      clearTimeout(timer);
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      const errorCode = isAbortError ? 'UPSTREAM_TIMEOUT' : classifyError(null);
      if (attempt === 0) {
        await sleep(250);
        continue;
      }
      return { ok: false, errorCode };
    }
  }

  return { ok: false, errorCode: 'UPSTREAM_ERROR' };
};

export const translateBatch = async (req: Request, res: Response) => {
  const body = req.body as TranslateBatchInput;
  const items = body.items;

  if (!process.env.DEEPL_API_KEY) {
    return res.json({
      mode: 'manual',
      provider: 'DEEPL',
      results: items.map((item): TranslationResult => ({
        key: item.key,
        status: 'failed',
        errorCode: 'CONFIG_MISSING',
      })),
    });
  }

  const grouped = new Map<string, Array<{ index: number; key: string; text: string }>>();
  items.forEach((item, index) => {
    const groupKey = `${item.sourceLang}->${item.targetLang}`;
    const group = grouped.get(groupKey) ?? [];
    group.push({ index, key: item.key, text: item.text });
    grouped.set(groupKey, group);
  });

  const resultByIndex = new Map<number, TranslationResult>();

  for (const [groupKey, groupItems] of grouped.entries()) {
    const [sourceLangRaw, targetLangRaw] = groupKey.split('->') as [LangCode, LangCode];
    const sourceLang = mapToDeepLLang(sourceLangRaw);
    const targetLang = mapToDeepLLang(targetLangRaw);
    const texts = groupItems.map((entry) => entry.text);

    const translated = await translateGroupWithRetry(sourceLang, targetLang, texts);
    if (!translated.ok) {
      console.warn('[Translate] group failed', {
        count: groupItems.length,
        keys: groupItems.map((entry) => entry.key),
        sourceLang,
        targetLang,
        errorCode: translated.errorCode,
      });
      groupItems.forEach((entry) => {
        resultByIndex.set(entry.index, {
          key: entry.key,
          status: 'failed',
          errorCode: translated.errorCode,
        });
      });
      continue;
    }

    translated.translations.forEach((translatedText, idx) => {
      const entry = groupItems[idx];
      resultByIndex.set(entry.index, {
        key: entry.key,
        status: 'ok',
        translatedText,
      });
    });
  }

  const orderedResults: TranslationResult[] = items.map((_, index) => {
    return (
      resultByIndex.get(index) ?? {
        key: items[index].key,
        status: 'failed',
        errorCode: 'UNKNOWN_MAPPING_ERROR',
      }
    );
  });

  const hasSuccess = orderedResults.some((result) => result.status === 'ok');

  return res.json({
    mode: hasSuccess ? 'auto' : 'manual',
    provider: 'DEEPL',
    results: orderedResults,
  });
};
