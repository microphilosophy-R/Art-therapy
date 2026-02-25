import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, DollarSign, Calendar, TrendingUp, Shield } from 'lucide-react';
import { getAdminPaymentStats } from '../../api/payments';
import { getTherapists } from '../../api/therapists';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { formatCurrency } from '../../utils/formatters';

export const AdminDashboard = () => {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => getAdminPaymentStats(),
  });

  const { data: therapistsData, isLoading: loadingTherapists } = useQuery({
    queryKey: ['therapists', 'admin'],
    queryFn: () => getTherapists({ limit: 10 }),
  });

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-teal-600" />
            <h1 className="text-2xl font-bold text-stone-900">Admin Dashboard</h1>
          </div>
          <p className="text-stone-500">Platform overview and management.</p>
        </div>

        {/* Revenue stats */}
        {loadingStats ? (
          <PageLoader />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                icon: DollarSign,
                label: 'Total revenue',
                value: stats ? formatCurrency(stats.totalGrossRevenue) : '—',
                color: 'text-green-600 bg-green-50',
              },
              {
                icon: TrendingUp,
                label: 'Platform fees',
                value: stats ? formatCurrency(stats.totalPlatformFees) : '—',
                color: 'text-teal-600 bg-teal-50',
              },
              {
                icon: Calendar,
                label: 'Total bookings',
                value: stats?.paymentCount ?? '—',
                color: 'text-blue-600 bg-blue-50',
              },
              {
                icon: Users,
                label: 'Active therapists',
                value: therapistsData?.total ?? '—',
                color: 'text-purple-600 bg-purple-50',
              },
            ].map(({ icon: Icon, label, value, color }) => (
              <Card key={label}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-stone-900">{String(value)}</p>
                    <p className="text-xs text-stone-500">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Therapist table */}
        <Card>
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">Therapists</h2>
            <span className="text-xs text-stone-400">{therapistsData?.total ?? 0} total</span>
          </div>
          {loadingTherapists ? (
            <div className="p-8">
              <PageLoader />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">City</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">Stripe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(therapistsData?.data ?? []).map((t) => (
                    <tr key={t.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4 font-medium text-stone-900">
                        {t.user.firstName} {t.user.lastName}
                      </td>
                      <td className="px-6 py-4 text-stone-500">{t.locationCity}</td>
                      <td className="px-6 py-4 text-stone-700">${t.sessionPrice}</td>
                      <td className="px-6 py-4">
                        <Badge variant={t.isAccepting ? 'success' : 'warning'}>
                          {t.isAccepting ? 'Accepting' : 'Closed'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            t.stripeAccountStatus === 'ACTIVE'
                              ? 'success'
                              : t.stripeAccountStatus === 'ONBOARDING_IN_PROGRESS'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {t.stripeAccountStatus ?? 'NOT_CONNECTED'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {!therapistsData?.data?.length && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-stone-400">
                        No therapists found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
