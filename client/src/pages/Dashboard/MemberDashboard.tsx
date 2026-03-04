import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { TherapyPlansTab } from './tabs/TherapyPlansTabEnhanced';
import { ProductsTab } from './tabs/ProductsTab';
import { ShowcaseTabEnhanced } from './tabs/ShowcaseTabEnhanced';
import { CalendarTab } from './tabs/CalendarTab';
import { MemberReviewTab } from './tabs/MemberReviewTab';
import { ProfilePreviewTab } from './tabs/ProfilePreviewTab';
import { StatsDashboard } from '../../components/dashboard/StatsDashboard';
import { getProfile } from '../../api/profile';

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  REVOKED: 'bg-stone-100 text-stone-500 border-stone-200',
  DRAFT: 'bg-stone-50 text-stone-600 border-stone-200',
  PENDING_REVIEW: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

type TabKey = 'stats' | 'overview' | 'plans' | 'products' | 'showcase' | 'calendar' | 'review' | 'preview' | 'profile' | 'messages';

export const MemberDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('stats');

  useEffect(() => {
    const tab = searchParams.get('tab') as TabKey;
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey: TabKey) => {
    setActiveTab(tabKey);
    navigate(`/dashboard/member?tab=${tabKey}`, { replace: true });
  };

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const hasTherapistCert = user?.approvedCertificates?.includes('THERAPIST');
  const hasArtificerCert = user?.approvedCertificates?.includes('ARTIFICER');
  const profileStatus = profile?.userProfile?.profileStatus || 'DRAFT';

  const tabs = [
    { key: 'stats' as TabKey, label: t('dashboard.therapist.tabs.statistics') },
    { key: 'plans' as TabKey, label: t('dashboard.therapist.tabs.therapyPlans') },
    { key: 'products' as TabKey, label: t('dashboard.therapist.tabs.products') },
    { key: 'showcase' as TabKey, label: t('dashboard.therapist.tabs.showcase') },
    { key: 'calendar' as TabKey, label: t('dashboard.therapist.tabs.calendar') },
    { key: 'review' as TabKey, label: t('dashboard.therapist.tabs.reviewStatus') },
    { key: 'preview' as TabKey, label: t('dashboard.therapist.tabs.profilePreview') },
  ];

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">
          Welcome, {user?.firstName}
        </h1>
        <p className="text-stone-500 mb-6 text-sm">
          Manage your work and profile.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-stone-200 p-4">
            <p className="text-sm text-stone-500">Profile Status</p>
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded border ${STATUS_STYLE[profileStatus]}`}>
              {profileStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-stone-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'stats' && <StatsDashboard />}

        {activeTab === 'plans' && <TherapyPlansTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'showcase' && <ShowcaseTabEnhanced />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'review' && <MemberReviewTab />}
        {activeTab === 'preview' && <ProfilePreviewTab />}
      </div>
    </div>
  );
};
