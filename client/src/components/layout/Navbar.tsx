import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, LayoutDashboard, Heart } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../api/auth';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';

export const Navbar = () => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    clearAuth();
    navigate('/login');
  };

  const dashboardPath =
    user?.role === 'THERAPIST' ? '/dashboard/therapist'
    : user?.role === 'ADMIN'   ? '/dashboard/admin'
    : '/dashboard/client';

  const isActive = (path: string) => location.pathname === path;

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
              to="/therapists"
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive('/therapists')
                  ? 'bg-teal-50 text-teal-700 font-medium'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Find a Therapist
            </Link>

            {isAuthenticated ? (
              <div className="relative ml-2">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-100 transition-colors"
                >
                  <Avatar
                    firstName={user!.firstName}
                    lastName={user!.lastName}
                    src={user!.avatarUrl}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-stone-700 hidden sm:block">
                    {user!.firstName}
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
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                      >
                        <User className="h-4 w-4" /> Profile
                      </Link>
                      <hr className="my-1 border-stone-100" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Get started
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
              to="/therapists"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
            >
              Find a Therapist
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to={dashboardPath}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
                >
                  Profile
                </Link>
                {user?.role === 'CLIENT' && (
                  <Link
                    to="/forms"
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
                  >
                    My Forms
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
