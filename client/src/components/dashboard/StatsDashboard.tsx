import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, Package, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';

interface DashboardStats {
  revenue: number;
  platformFees: number;
  profits: number;
  visitors: number;
  paidCustomers: { week: number; today: number; month: number };
  plansCount: {
    draft: number;
    pending: number;
    published: number;
    inProgress: number;
    finished: number;
    archived: number;
    participated: number;
    initiated: number;
    total: number;
  };
  productsCount: {
    active: number;
    soldOut: number;
    draft: number;
    pending: number;
    all: number;
  };
  totalSold: number;
  productsBought: number;
  trends: {
    revenue: Array<{ date: string; value: number }>;
    visitors: Array<{ date: string; value: number }>;
    paidCustomers: Array<{ date: string; value: number }>;
    orders: Array<{ date: string; value: number }>;
  };
}

type ChartVariable = 'visitors' | 'revenue' | 'paidCustomers' | 'orders';

export function StatsDashboard() {
  const { t } = useTranslation();
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'all'>('week');
  const [plansFilter, setPlansFilter] = useState<'active' | 'history' | 'all'>('all');
  const [productFilter, setProductFilter] = useState<'active' | 'history' | 'all'>('active');
  const [chart1Variable, setChart1Variable] = useState<ChartVariable>('visitors');
  const [chart2Variable, setChart2Variable] = useState<ChartVariable>('revenue');

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats', timePeriod, productFilter],
    queryFn: async () => {
      const res = await api.get(`/stats/dashboard?period=${timePeriod}&productFilter=${productFilter}`);
      return res.data;
    }
  });

  if (isLoading) return <div className="p-6">{t('common.loading')}</div>;

  const chartVariables: { value: ChartVariable; label: string }[] = [
    { value: 'visitors', label: t('dashboard.therapist.stats.charts.visitorsTrend') },
    { value: 'revenue', label: t('dashboard.therapist.stats.charts.revenueTrend') },
    { value: 'paidCustomers', label: t('dashboard.therapist.stats.charts.paidCustomersTrend') },
    { value: 'orders', label: t('dashboard.therapist.stats.charts.ordersTrend') }
  ];

  const getInitiatedPlansCount = () => {
    if (!stats) return 0;
    if (plansFilter === 'active') {
      return stats.plansCount.draft + stats.plansCount.pending + stats.plansCount.published + stats.plansCount.inProgress;
    }
    if (plansFilter === 'history') {
      return stats.plansCount.finished + stats.plansCount.archived;
    }
    return stats.plansCount.initiated;
  };

  const getPlansCount = () => {
    if (!stats) return 0;
    if (plansFilter === 'active') {
      return stats.plansCount.draft + stats.plansCount.pending + stats.plansCount.published + stats.plansCount.inProgress;
    }
    if (plansFilter === 'history') {
      return stats.plansCount.finished + stats.plansCount.archived;
    }
    return stats.plansCount.total;
  };

  const getProductsCount = () => {
    if (!stats) return 0;
    if (productFilter === 'active') return stats.productsCount.active;
    if (productFilter === 'history') return stats.productsCount.soldOut;
    return stats.productsCount.all;
  };

  const statCards = [
    { label: t('dashboard.therapist.stats.revenue'), value: `¥${stats?.revenue || 0}`, icon: DollarSign, color: 'bg-green-100 text-green-600' },
    { label: t('dashboard.therapist.stats.consumption'), value: `¥${stats?.platformFees || 0}`, icon: TrendingUp, color: 'bg-blue-100 text-blue-600' },
    { label: t('dashboard.therapist.stats.visitors'), value: stats?.visitors || 0, icon: Users, color: 'bg-purple-100 text-purple-600' },
    {
      label: t('dashboard.therapist.stats.paidCustomers'),
      value: timePeriod === 'all' ? (stats?.paidCustomers.month || 0) : (stats?.paidCustomers[timePeriod] || 0),
      icon: Users,
      color: 'bg-teal-100 text-teal-600'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Global Time Period Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setTimePeriod('week')}
          className={`px-4 py-2 text-sm rounded-lg font-medium ${timePeriod === 'week' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600'}`}
        >
          {t('dashboard.therapist.stats.period.week')}
        </button>
        <button
          onClick={() => setTimePeriod('month')}
          className={`px-4 py-2 text-sm rounded-lg font-medium ${timePeriod === 'month' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600'}`}
        >
          {t('dashboard.therapist.stats.period.month')}
        </button>
        <button
          onClick={() => setTimePeriod('all')}
          className={`px-4 py-2 text-sm rounded-lg font-medium ${timePeriod === 'all' ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600'}`}
        >
          {t('dashboard.therapist.stats.period.all')}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white border border-stone-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-600">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-stone-900">{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Plans & Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-900">{t('dashboard.therapist.stats.plans')}</h3>
            <div className="flex gap-1">
              {(['active', 'history', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPlansFilter(filter)}
                  className={`text-xs px-2 py-1 rounded capitalize ${plansFilter === filter ? 'bg-teal-100 text-teal-700' : 'text-stone-500'}`}
                >
                  {t(`dashboard.therapist.stats.filter.${filter}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-600">{t('dashboard.therapist.stats.initiated')}</span>
              <span className="text-xl font-bold text-stone-900">{getInitiatedPlansCount()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-600">{t('dashboard.therapist.stats.participated')}</span>
              <span className="text-xl font-bold text-stone-900">{stats?.plansCount.participated || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-900">{t('dashboard.therapist.stats.products')}</h3>
            <div className="flex gap-1">
              {(['active', 'history', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setProductFilter(filter)}
                  className={`text-xs px-2 py-1 rounded capitalize ${productFilter === filter ? 'bg-teal-100 text-teal-700' : 'text-stone-500'}`}
                >
                  {t(`dashboard.therapist.stats.filter.${filter}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-600">{t('dashboard.therapist.stats.bought')}</span>
              <span className="text-xl font-bold text-stone-900">{stats?.productsBought || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-600">{t('dashboard.therapist.stats.sold')}</span>
              <span className="text-xl font-bold text-stone-900">{stats?.totalSold || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Trend Charts */}
      {timePeriod !== 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chart 1 */}
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">{t('dashboard.therapist.stats.charts.selectVariable')}</h3>
              <select
                value={chart1Variable}
                onChange={(e) => setChart1Variable(e.target.value as ChartVariable)}
                className="text-sm border border-stone-300 rounded px-2 py-1"
              >
                {chartVariables.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats?.trends[chart1Variable] || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2 */}
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">{t('dashboard.therapist.stats.charts.selectVariable')}</h3>
              <select
                value={chart2Variable}
                onChange={(e) => setChart2Variable(e.target.value as ChartVariable)}
                className="text-sm border border-stone-300 rounded px-2 py-1"
              >
                {chartVariables.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats?.trends[chart2Variable] || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
