import React, { useState, useEffect } from 'react';
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
import { Avatar } from '../../components/ui/Avatar';

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
        <div className="flex items-center gap-3 mb-6">
          <Avatar
            firstName={user?.firstName ?? ''}
            lastName={user?.lastName ?? ''}
            src={user?.avatarUrl}
            size="lg"
          />
          <h1 className="text-2xl font-bold text-stone-900">
            {user?.firstName} {user?.lastName}
          </h1>
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
