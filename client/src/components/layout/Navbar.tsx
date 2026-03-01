import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, LayoutDashboard, Heart, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../api/auth';
import { getUnreadCount } from '../../api/messages';
import { getCart } from '../../api/shop';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { ShoppingCart } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    clearAuth();
    // Clear all cached query data so the next user (or re-login) starts fresh
    // and never sees another user's cached appointments / plans.
    queryClient.clear();
    navigate('/login');
  };

  const dashboardPath =
    user?.role === 'THERAPIST' ? '/dashboard/therapist'
      : user?.role === 'ADMIN' ? '/dashboard/admin'
        : user?.role === 'ARTIST' ? '/dashboard/artist'
          : '/dashboard/client';

  const isActive = (path: string) => location.pathname === path;

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });
  const unreadCount = unreadData?.count ?? 0;

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: getCart,
    enabled: isAuthenticated,
  });
  const cartItemCount = cartData?.reduce((acc, item) => acc + item.quantity, 0) ?? 0;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-semibold text-stone-900">
            <Heart className="h-5 w-5 text-teal-600 fill-teal-600" />
            <span className="text-lg">ArtTherapy</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${isActive('/') || isActive('/home')
                ? 'bg-teal-50 text-teal-700 font-medium'
                : 'text-stone-600 hover:bg-stone-100'
                }`}
            >
              {t('nav.home', 'Home')}
            </Link>
            <Link
              to="/therapists"
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${isActive('/therapists')
                ? 'bg-teal-50 text-teal-700 font-medium'
                : 'text-stone-600 hover:bg-stone-100'
                }`}
            >
              {t('nav.findTherapist')}
            </Link>
            <Link
              to="/shop"
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${location.pathname.startsWith('/shop')
                ? 'bg-teal-50 text-teal-700 font-medium'
                : 'text-stone-600 hover:bg-stone-100'
                }`}
            >
              {t('nav.shop')}
            </Link>
            <Link
              to="/therapy-plans"
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${location.pathname.startsWith('/therapy-plans')
                ? 'bg-teal-50 text-teal-700 font-medium'
                : 'text-stone-600 hover:bg-stone-100'
                }`}
            >
              {t('nav.therapyPlans')}
            </Link>
            <Link
              to="/gallery"
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${isActive('/gallery')
                ? 'bg-teal-50 text-teal-700 font-medium'
                : 'text-stone-600 hover:bg-stone-100'
                }`}
            >
              {t('nav.gallery', 'Gallery')}
            </Link>

            <LanguageSwitcher />

            {isAuthenticated && user ? (
              <>
                <Link
                  to="/cart"
                  className="relative p-2 rounded-lg hover:bg-stone-100 transition-colors"
                  title={t('nav.cart')}
                >
                  <ShoppingCart className="h-5 w-5 text-stone-600" />
                  {cartItemCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white leading-none">
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </Link>
                <Link
                  to={dashboardPath}
                  className="relative p-2 rounded-lg hover:bg-stone-100 transition-colors"
                  title={t('messages.inbox')}
                >
                  <Bell className="h-5 w-5 text-stone-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative ml-1">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-100 transition-colors"
                  >
                    <Avatar
                      firstName={user.firstName}
                      lastName={user.lastName}
                      src={user.avatarUrl}
                      size="sm"
                    />
                    <span className="text-sm font-medium text-stone-700 hidden sm:block">
                      {user.firstName}
                    </span>
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 mt-1 w-48 rounded-xl border border-stone-200 bg-white shadow-lg py-1 z-20">
                        <Link
                          to={dashboardPath}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                        >
                          <LayoutDashboard className="h-4 w-4" /> {t('nav.dashboard')}
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                        >
                          <User className="h-4 w-4" /> {t('nav.profile')}
                        </Link>
                        <Link
                          to="/orders"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                        >
                          <ShoppingCart className="h-4 w-4" /> {t('nav.myOrders')}
                        </Link>
                        <hr className="my-1 border-stone-100" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                        >
                          <LogOut className="h-4 w-4" /> {t('nav.signOut')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  {t('nav.signIn')}
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  {t('nav.getStarted')}
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-stone-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-stone-100 mt-2 pt-4 flex flex-col gap-1">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
            >
              {t('nav.home', 'Home')}
            </Link>
            <Link
              to="/therapists"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
            >
              {t('nav.findTherapist')}
            </Link>
            <Link
              to="/therapy-plans"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
            >
              {t('nav.therapyPlans')}
            </Link>
            <Link
              to="/gallery"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
            >
              {t('nav.gallery', 'Gallery')}
            </Link>
            <div className="px-1">
              <LanguageSwitcher />
            </div>
            {isAuthenticated && user ? (
              <>
                <Link
                  to={dashboardPath}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
                >
                  <span>{t('nav.dashboard')}</span>
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
                >
                  {t('nav.profile')}
                </Link>
                {user?.role === 'CLIENT' && (
                  <Link
                    to="/forms"
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
                  >
                    {t('nav.myForms')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
                >
                  {t('nav.getStarted')}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
