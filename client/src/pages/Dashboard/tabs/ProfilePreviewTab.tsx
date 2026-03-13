import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ExternalLink, User, Briefcase, Image, ShoppingBag } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import api from '../../../api/axios';
import { useAuthStore } from '../../../store/authStore';

export const ProfilePreviewTab = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await api.get('/profile/me');
      return res.data;
    },
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const userProfile = profile?.userProfile;
  const isArtist = user?.approvedCertificates?.includes('ARTIFICER');
  const isProvider = user?.approvedCertificates?.some((cert) => cert === 'THERAPIST' || cert === 'COUNSELOR');
  const liveLink = isArtist ? '/shop' : isProvider ? `/therapists/${userProfile?.id}` : '/';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">{t('dashboard.profile.previewTitle')}</h2>
        <div className="flex gap-2">
          <Link to={liveLink} target="_blank">
            <Button size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              {t('dashboard.profile.viewLive')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Preview */}
      <div className="bg-white border border-stone-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-2xl font-bold overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.firstName} className="w-full h-full object-cover" />
            ) : (
              user?.firstName?.charAt(0) ?? '?'
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-stone-900">
              {user?.firstName} {user?.lastName}
            </h3>
            {userProfile?.bio && (
              <p className="text-stone-600 mt-2 text-sm">{userProfile.bio}</p>
            )}
            {userProfile?.specialties && userProfile.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {userProfile.specialties.map((s: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
        <p className="text-sm font-medium text-stone-700 mb-3">{t('dashboard.profile.quickNav')}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Link to="/profile">
            <Button size="sm" variant="outline" className="w-full">
              <User className="h-4 w-4 mr-1" />
              {t('dashboard.profile.personalInfo')}
            </Button>
          </Link>
          <Link to="/profile">
            <Button size="sm" variant="outline" className="w-full">
              <Briefcase className="h-4 w-4 mr-1" />
              {t('dashboard.profile.professional')}
            </Button>
          </Link>
          <Link to="/profile">
            <Button size="sm" variant="outline" className="w-full">
              <Image className="h-4 w-4 mr-1" />
              {t('dashboard.profile.exhibition')}
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="sm" variant="outline" className="w-full">
              <ShoppingBag className="h-4 w-4 mr-1" />
              {t('dashboard.profile.showcase')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
