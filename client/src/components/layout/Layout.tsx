import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const Layout = () => {
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      <main className="flex-1">
        <div key={location.pathname} className="route-enter-from-top">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};
