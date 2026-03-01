import React, { useState } from 'react';
import { ShoppingBag, Package, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { ArtistProfileTab } from '@/pages/Dashboard/tabs/ArtistProfileTab';
import { ArtistProductsTab } from '@/pages/Dashboard/tabs/ArtistProductsTab';
import { ArtistOrdersTab } from '@/pages/Dashboard/tabs/ArtistOrdersTab';
import { ShowcaseTab } from '@/pages/Dashboard/tabs/ShowcaseTab';

type Tab = 'showcase' | 'profile' | 'products' | 'orders';

export const ArtistDashboard = () => {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [tab, setTab] = useState<Tab>('showcase');

    return (
        <div className="bg-stone-50 min-h-screen">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-stone-900">
                        {t('dashboard.client.welcome', { name: user?.firstName })}
                    </h1>
                    <p className="text-stone-500 mt-1">{t('shop.artist.dashboard.subtitle')}</p>
                </div>

                {/* Quick stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                        { icon: ShoppingBag, label: t('shop.artist.dashboard.activeProducts'), value: '—', color: 'text-teal-600 bg-teal-50' },
                        { icon: Package, label: t('shop.artist.dashboard.pendingOrders'), value: '—', color: 'text-blue-600 bg-blue-50' },
                        { icon: User, label: t('shop.artist.dashboard.profileStatus'), value: '—', color: 'text-purple-600 bg-purple-50' },
                    ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="bg-white rounded-xl border border-stone-200 p-5 flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-stone-900">{value}</p>
                                <p className="text-xs text-stone-500">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs + content */}
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden min-h-[500px]">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-wrap gap-3">
                        <div className="flex gap-1 flex-wrap">
                            {(['showcase', 'products', 'orders', 'profile'] as Tab[]).map((tabKey) => (
                                <button
                                    key={tabKey}
                                    onClick={() => setTab(tabKey)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === tabKey
                                        ? 'bg-teal-50 text-teal-700'
                                        : 'text-stone-500 hover:bg-stone-50'
                                        }`}
                                >
                                    {t(`shop.artist.dashboard.tabs.${tabKey}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6">
                        {tab === 'showcase' && <ShowcaseTab onEditProfile={() => setTab('profile')} />}
                        {tab === 'profile' && <ArtistProfileTab />}
                        {tab === 'products' && <ArtistProductsTab />}
                        {tab === 'orders' && <ArtistOrdersTab />}
                    </div>
                </div>
            </div>
        </div>
    );
};
