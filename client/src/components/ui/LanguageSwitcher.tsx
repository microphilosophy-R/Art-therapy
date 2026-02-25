import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  return (
    <button
      onClick={() => i18n.changeLanguage(isZh ? 'en' : 'zh')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 transition-colors"
      aria-label="Switch language"
    >
      <Globe className="h-4 w-4" />
      {isZh ? 'EN' : '中文'}
    </button>
  );
};
