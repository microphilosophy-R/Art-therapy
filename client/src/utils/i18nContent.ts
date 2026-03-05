import type { LocalizedText } from '../types';

export const pickLocalizedText = (
  i18nObj: LocalizedText | null | undefined,
  lang: string,
  legacy?: string | null,
): string => {
  const isZh = lang.startsWith('zh');
  const primary = isZh ? i18nObj?.zh : i18nObj?.en;
  const secondary = isZh ? i18nObj?.en : i18nObj?.zh;
  return primary || secondary || legacy || '';
};
