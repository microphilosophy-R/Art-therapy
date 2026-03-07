import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-stone-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 font-semibold text-stone-900 mb-3">
              <img src="/logo_new.jpg" alt="ArtTherapy" className="h-5 w-5 object-contain rounded-sm" />
              ArtTherapy
            </div>
            <p className="text-sm text-stone-500 max-w-xs">
              {t('nav.footer.tagline')}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900 mb-3">{t('nav.footer.platform')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/therapists" className="text-sm text-stone-500 hover:text-teal-600 transition-colors">
                  {t('nav.footer.findTherapist')}
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm text-stone-500 hover:text-teal-600 transition-colors">
                  {t('nav.footer.joinAsTherapist')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-stone-900 mb-3">{t('nav.footer.legal')}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-sm text-stone-500 hover:text-teal-600 transition-colors">
                  {t('nav.footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-stone-500 hover:text-teal-600 transition-colors">
                  {t('nav.footer.termsOfService')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-stone-100 mt-8 pt-6 text-center text-xs text-stone-400">
          {t('nav.footer.rights', { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
};
