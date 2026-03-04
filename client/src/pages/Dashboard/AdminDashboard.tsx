import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import {
  Users, DollarSign, Calendar, TrendingUp, Shield,
  RotateCcw, ChevronLeft, ChevronRight, XCircle, CheckCircle, UserCheck,
} from 'lucide-react';

import { listAdminUsers, updateUserRole, getAdminPlatformStats, listPendingCertificates, reviewCertificate } from '../../api/admin';
import { getAdminPaymentStats } from '../../api/payments';
import { getAppointments, updateAppointmentStatus } from '../../api/appointments';
import { getUnreadCount } from '../../api/messages';
import { getPendingProfiles, reviewProfile } from '../../api/therapists';
import { AdminPlansTab } from './tabs/AdminPlansTab';
import { AdminReviewTab } from './tabs/AdminReviewTab';
import { MessagesTab } from './tabs/MessagesTab';

import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { DatePicker } from '../../components/ui/DatePicker';
import { PageLoader } from '../../components/ui/Spinner';
import { formatCurrency, formatDateTime, formatRelative } from '../../utils/formatters';
import type { UserRole, AppointmentStatus } from '../../types';

type Tab = 'overview' | 'users' | 'appointments' | 'revenue' | 'plans' | 'review' | 'messages';

const ROLE_OPTION_VALUES: UserRole[] = ['MEMBER', 'ADMIN'];

const roleBadgeVariant = (role: UserRole) => {
  if (role === 'ADMIN') return 'danger' as const;
  if (role === 'MEMBER') return 'info' as const;
  return 'default' as const;
};

const statusBadgeVariant = (status: AppointmentStatus) => {
  if (status === 'CONFIRMED') return 'success' as const;
  if (status === 'PENDING') return 'warning' as const;
  if (status === 'CANCELLED') return 'danger' as const;
  return 'default' as const;
};

// ─── Overview Tab ────────────────────────────────────────────────────────────

const OverviewTab = () => {
  const { t } = useTranslation();
  const { data: platformStats } = useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn: getAdminPlatformStats,
  });
  const { data: revenueStats } = useQuery({
    queryKey: ['admin-payment-stats', '', ''],
    queryFn: () => getAdminPaymentStats(),
  });

  const cards = [
    { icon: Users, label: t('dashboard.admin.totalUsers'), value: platformStats?.userCount ?? '—', color: 'text-purple-600 bg-purple-50' },
    { icon: Shield, label: t('dashboard.admin.therapists'), value: platformStats?.therapistCount ?? '—', color: 'text-teal-600 bg-teal-50' },
    { icon: Calendar, label: t('dashboard.admin.appointmentsCount'), value: platformStats?.appointmentCount ?? '—', color: 'text-blue-600 bg-blue-50' },
    { icon: DollarSign, label: t('dashboard.admin.grossRevenue'), value: revenueStats ? formatCurrency(revenueStats.totalGrossRevenue) : '—', color: 'text-green-600 bg-green-50' },
    { icon: TrendingUp, label: t('dashboard.admin.platformFees'), value: revenueStats ? formatCurrency(revenueStats.totalPlatformFees) : '—', color: 'text-amber-600 bg-amber-50' },
    { icon: RotateCcw, label: t('dashboard.admin.totalRefunds'), value: revenueStats ? formatCurrency(revenueStats.totalRefunds) : '—', color: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map(({ icon: Icon, label, value, color }) => (
        <Card key={label}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{String(value)}</p>
              <p className="text-xs text-stone-500 mt-0.5">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ─── Users Tab ────────────────────────────────────────────────────────────────

const UsersTab = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => listAdminUsers(page, 20),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const tableHeaders = [
    t('dashboard.admin.tableHeaders.name'),
    t('dashboard.admin.tableHeaders.email'),
    t('dashboard.admin.tableHeaders.role'),
    t('dashboard.admin.tableHeaders.joined'),
    t('dashboard.admin.tableHeaders.changeRole'),
  ];

  return (
    <Card>
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <h2 className="font-semibold text-stone-900">{t('dashboard.admin.users')}</h2>
        <span className="text-xs text-stone-400">{t('dashboard.admin.usersTotal', { total: data?.total ?? 0 })}</span>
      </div>

      {isLoading ? (
        <div className="p-10"><PageLoader /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  {tableHeaders.map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(data?.data ?? []).map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar firstName={user.firstName} lastName={user.lastName} src={user.avatarUrl} size="sm" />
                        <span className="font-medium text-stone-900">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-stone-500">{user.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant={roleBadgeVariant(user.role)}>{t(`common.role.${user.role}`)}</Badge>
                    </td>
                    <td className="px-6 py-3 text-stone-400 text-xs">
                      {formatRelative(user.createdAt)}
                    </td>
                    <td className="px-6 py-3">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          roleMutation.mutate({ id: user.id, role: e.target.value as UserRole })
                        }
                        className="text-xs rounded-lg border border-stone-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {ROLE_OPTION_VALUES.map((v) => (
                          <option key={v} value={v}>{t(`common.role.${v}`)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {!data?.data?.length && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-stone-400">{t('dashboard.admin.noUsers')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data?.totalPages ?? 1) > 1 && (
            <div className="px-6 py-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                {t('dashboard.admin.page', { page: data?.page, total: data?.totalPages })}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page === (data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

// ─── Appointments Tab ─────────────────────────────────────────────────────────

const AppointmentsTab = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [page, setPage] = useState(1);

  const STATUS_FILTERS: { label: string; value: AppointmentStatus | '' }[] = [
    { label: t('dashboard.admin.filterAll'), value: '' },
    { label: t('dashboard.admin.filterPending'), value: 'PENDING' },
    { label: t('dashboard.admin.filterConfirmed'), value: 'CONFIRMED' },
    { label: t('dashboard.admin.filterCancelled'), value: 'CANCELLED' },
    { label: t('dashboard.admin.filterCompleted'), value: 'COMPLETED' },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-appointments', statusFilter, page],
    queryFn: () =>
      getAppointments({
        status: statusFilter ? [statusFilter] : undefined,
        page,
        limit: 15,
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => updateAppointmentStatus(id, 'CANCELLED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-appointments'] }),
  });

  const tableHeaders = [
    t('dashboard.admin.tableHeaders.name'),
    t('dashboard.admin.tableHeaders.name'),
    t('dashboard.admin.tableHeaders.dateTime'),
    t('dashboard.admin.tableHeaders.format'),
    t('dashboard.admin.tableHeaders.status'),
    t('dashboard.admin.tableHeaders.actions'),
  ];

  return (
    <Card>
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === f.value
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-stone-500 hover:bg-stone-50'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-stone-400">{t('dashboard.admin.appointmentsTotal', { total: data?.total ?? 0 })}</span>
      </div>

      {isLoading ? (
        <div className="p-10"><PageLoader /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  {tableHeaders.map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(data?.data ?? []).map((appt) => (
                  <tr key={appt.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-stone-900">
                      {appt.client ? `${appt.client.firstName} ${appt.client.lastName}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-stone-600">
                      {appt.therapist?.user
                        ? `${appt.therapist.user.firstName} ${appt.therapist.user.lastName}`
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-stone-500 text-xs whitespace-nowrap">
                      {formatDateTime(appt.startTime)}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={appt.medium === 'VIDEO' ? 'info' : 'default'}>
                        {appt.medium === 'VIDEO' ? t('common.medium.VIDEO') : t('common.medium.IN_PERSON')}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={statusBadgeVariant(appt.status)}>
                        {t(`common.status.${appt.status}`)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate(appt.id)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {t('dashboard.admin.cancelBtn')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {!data?.data?.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-stone-400">
                      {t('dashboard.admin.noAppointments')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {(data?.totalPages ?? 1) > 1 && (
            <div className="px-6 py-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                {t('dashboard.admin.page', { page: data?.page, total: data?.totalPages })}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page === (data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

// ─── Revenue Tab ──────────────────────────────────────────────────────────────

const RevenueTab = () => {
  const { t } = useTranslation();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payment-stats', from, to],
    queryFn: () => getAdminPaymentStats(from || undefined, to || undefined),
  });

  const revenueCards = [
    { label: t('dashboard.admin.grossRevenue'), value: data ? formatCurrency(data.totalGrossRevenue) : '—', color: 'text-green-600 bg-green-50' },
    { label: t('dashboard.admin.platformFeesCard'), value: data ? formatCurrency(data.totalPlatformFees) : '—', color: 'text-teal-600 bg-teal-50' },
    { label: t('dashboard.admin.therapistPayouts'), value: data ? formatCurrency(data.totalTherapistPayouts) : '—', color: 'text-blue-600 bg-blue-50' },
    { label: t('dashboard.admin.totalRefunds'), value: data ? formatCurrency(data.totalRefunds) : '—', color: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium text-stone-700 mb-3">{t('dashboard.admin.revenueFilter')}</p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500 w-8">{t('dashboard.admin.from')}</label>
              <DatePicker
                value={from}
                onChange={(val) => setFrom(val.split('T')[0])}
                showTime={false}
                className="h-8 !px-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500 w-8">{t('dashboard.admin.to')}</label>
              <DatePicker
                value={to}
                onChange={(val) => setTo(val.split('T')[0])}
                showTime={false}
                className="h-8 !px-2"
              />
            </div>
            {(from || to) && (
              <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); }}>
                {t('common.clear')}
              </Button>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-2">
            {from || to
              ? t('dashboard.admin.period', { from: from || '…', to: to || '…' })
              : t('dashboard.admin.allTime')}
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <PageLoader />
      ) : (
        <>
          {/* Revenue stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {revenueCards.map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="text-2xl font-bold text-stone-900">{value}</p>
                  <p className="text-xs text-stone-500 mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Count stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{data?.paymentCount ?? '—'}</p>
                  <p className="text-xs text-stone-500">{t('dashboard.admin.paidBookings')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{data?.refundCount ?? '—'}</p>
                  <p className="text-xs text-stone-500">{t('dashboard.admin.refundsIssued')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Profiles Tab ─────────────────────────────────────────────────────────────

const AdminProfilesTab = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-pending-profiles'],
    queryFn: getPendingProfiles,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, rejectionReason }: { id: string; action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) =>
      reviewProfile(id, { action, rejectionReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-profiles'] });
      setRejectId(null);
      setRejectReason('');
    },
  });

  if (isLoading) return <div className="p-10"><PageLoader /></div>;

  const list = profiles ?? [];

  return (
    <Card>
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <h2 className="font-semibold text-stone-900">{t('admin.profiles.title')}</h2>
        <span className="text-xs text-stone-400">{list.length} {t('admin.profiles.pending')}</span>
      </div>

      {list.length === 0 ? (
        <div className="px-6 py-12 text-center text-stone-400">
          <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{t('admin.profiles.empty')}</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {list.map((profile) => (
            <div key={profile.id} className="px-6 py-5">
              <div className="flex items-start gap-4">
                {profile.featuredImageUrl ? (
                  <img src={profile.featuredImageUrl} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                    <UserCheck className="h-6 w-6 text-stone-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-900">
                    {profile.user?.firstName} {profile.user?.lastName}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">{profile.user?.email}</p>
                  <p className="text-sm text-stone-600 mt-1 line-clamp-2">{profile.bio}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(profile.specialties ?? []).slice(0, 5).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-stone-100 text-xs text-stone-600">{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
                    <span>{profile.locationCity}</span>
                    <span>¥{Number(profile.sessionPrice).toFixed(0)}/{t('therapists.card.perSession')}</span>
                    {profile.consultEnabled && (
                      <span className="text-teal-600 font-medium">{t('admin.profiles.consultEnabled')}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => reviewMutation.mutate({ id: profile.id, action: 'APPROVE' })}
                    loading={reviewMutation.isPending && reviewMutation.variables?.id === profile.id && reviewMutation.variables?.action === 'APPROVE'}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t('admin.profiles.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => { setRejectId(profile.id); setRejectReason(''); }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {t('admin.profiles.reject')}
                  </Button>
                </div>
              </div>

              {/* Reject reason input */}
              {rejectId === profile.id && (
                <div className="mt-4 pl-18 space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t('admin.profiles.rejectReasonPlaceholder')}
                    rows={2}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-rose-400 focus:ring-rose-400 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={!rejectReason.trim()}
                      loading={reviewMutation.isPending && reviewMutation.variables?.action === 'REJECT'}
                      onClick={() => reviewMutation.mutate({ id: profile.id, action: 'REJECT', rejectionReason: rejectReason })}
                    >
                      {t('admin.profiles.confirmReject')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectId(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ─── Certificates Tab ─────────────────────────────────────────────────────────

const AdminCertificatesTab = () => {
  const qc = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: certs, isLoading } = useQuery({
    queryKey: ['admin-pending-certificates'],
    queryFn: listPendingCertificates,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, rejectionReason }: { id: string; action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) =>
      reviewCertificate(id, { action, rejectionReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pending-certificates'] });
      setRejectId(null);
      setRejectReason('');
    },
  });

  if (isLoading) return <div className="p-10"><PageLoader /></div>;
  const list = certs ?? [];

  return (
    <Card>
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <h2 className="font-semibold text-stone-900">Certificate Applications</h2>
        <span className="text-xs text-stone-400">{list.length} pending</span>
      </div>
      {list.length === 0 ? (
        <div className="px-6 py-12 text-center text-stone-400">
          <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No pending certificate applications</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {list.map((cert) => (
            <div key={cert.id} className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-900">
                    {cert.profile.user.firstName} {cert.profile.user.lastName}
                    <span className="ml-2 text-xs text-stone-400">{cert.profile.user.email}</span>
                  </p>
                  <p className="text-sm text-stone-500 mt-0.5">
                    Certificate: <span className="font-medium">{cert.type}</span>
                  </p>
                </div>
                {rejectId !== cert.id && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setRejectId(cert.id)}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => reviewMutation.mutate({ id: cert.id, action: 'APPROVE' })}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  </div>
                )}
              </div>
              {rejectId === cert.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    className="w-full border border-stone-200 rounded-lg p-2 text-sm"
                    rows={2}
                    placeholder="Rejection reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" onClick={() => reviewMutation.mutate({ id: cert.id, action: 'REJECT', rejectionReason: rejectReason })}>
                      Confirm Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
    enabled: !!user,
  });
  const unreadCount = unreadData?.count ?? 0;

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: t('dashboard.admin.overview') },
    { id: 'users', label: t('dashboard.admin.users') },
    { id: 'appointments', label: t('dashboard.admin.appointments') },
    { id: 'revenue', label: t('dashboard.admin.revenue') },
    { id: 'plans', label: t('dashboard.admin.plans') },
    { id: 'review', label: t('dashboard.admin.reviewQueue') },
    { id: 'messages', label: t('dashboard.admin.messages'), badge: unreadCount },
  ];

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-teal-600" />
            <h1 className="text-2xl font-bold text-stone-900">{t('dashboard.admin.title')}</h1>
          </div>
          <p className="text-stone-500 text-sm">{t('dashboard.admin.subtitle')}</p>
        </div>

        {/* Tab bar */}
        <div className="border-b border-stone-200 mb-7">
          <nav className="flex gap-1 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium transition-colors relative inline-flex items-center gap-1.5 ${activeTab === tab.id
                    ? 'text-teal-700'
                    : 'text-stone-500 hover:text-stone-700'
                  }`}
              >
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <Badge variant="danger" className="text-xs">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </Badge>
                )}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'appointments' && <AppointmentsTab />}
        {activeTab === 'revenue' && <RevenueTab />}
        {activeTab === 'plans' && <AdminPlansTab />}
        {activeTab === 'review' && <AdminReviewTab />}
        {activeTab === 'messages' && <MessagesTab />}
      </div>
    </div>
  );
};
