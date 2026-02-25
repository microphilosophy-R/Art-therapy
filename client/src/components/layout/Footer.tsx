import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export const Footer = () => (
  <footer className="border-t border-stone-200 bg-white mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 font-semibold text-stone-900 mb-3">
            <Heart className="h-4 w-4 text-teal-600 fill-teal-600" />
            ArtTherapy
          </div>
          <p className="text-sm text-stone-500 max-w-xs">
            Connecting people with certified art therapists for healing through creative expression.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-stone-900 mb-3">Platform</h4>
          <ul className="space-y-2">
            <li>
              <Link to="/therapists" className="text-sm text-stone-500 hover:text-teal-600 transition-colors">
                Find a Therapist
              </Link>
            </li>
            <li>
              <Link to="/register" className="text-sm text-stone-500 hover:text-teal-600 transition-colors">
                Join as Therapist
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-stone-900 mb-3">Legal</h4>
          <ul className="space-y-2">
            <li>
              <Link to="/privacy" className="text-sm text-stone-500 hover:text-teal-600 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="text-sm text-stone-500 hover:text-teal-600 transition-colors">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-100 mt-8 pt-6 text-center text-xs text-stone-400">
        &copy; {new Date().getFullYear()} ArtTherapy. All rights reserved.
      </div>
    </div>
  </footer>
);
