import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, RotateCcw, Ban } from 'lucide-react';
import api from '../../../api/axios';
import {
  listAdminCertificates,
  manageCertificate,
  getAdminReviewTimeline,
  getAdminScheduleTimeline,
  type AdminCertificate,
  type ReviewTimelineItem,
  type ScheduleTimelineItem,
} from '../../../api/admin';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';

type GanttMode = 'review' | 'schedule';
type CertAction = 'APPROVE' | 'REJECT' | 'REVOKE' | 'RESET_TO_PENDING';

const timelineColor = (item: ReviewTimelineItem | ScheduleTimelineItem) => {
  if (item.entityType === 'certificate') return 'bg-amber-500';
  if (item.entityType === 'product') return 'bg-indigo-500';
  if (item.entityType === 'appointment') return 'bg-teal-500';
  return 'bg-sky-500';
};

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const defaultDateRange = () => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const to = new Date(now);
  to.setDate(to.getDate() + 30);
  return { from: toDateInput(from), to: toDateInput(to) };
};

type PendingItem = {
  id: string;
  type: 'profile' | 'plan' | 'product';
  title: string;
  ownerName: string;
  submittedAt?: string | null;
};

export const AdminReviewOpsTab = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [ganttMode, setGanttMode] = useState<GanttMode>('review');
  const [range, setRange] = useState(defaultDateRange);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<{ id: string; type: 'profile' | 'plan' | 'product' } | null>(null);
  const [certReasonTarget, setCertReasonTarget] = useState<{ id: string; action: Extract<CertAction, 'REJECT' | 'REVOKE'> } | null>(null);
  const [certReason, setCertReason] = useState('');
  const [certStatusFilter, setCertStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'>('PENDING');

  const reviewTimelineQuery = useQuery({
    queryKey: ['admin-review-timeline', range.from, range.to],
    queryFn: () =>
      getAdminReviewTimeline({
        from: range.from,
        to: range.to,
        types: ['plans', 'products', 'certificates'],
      }),
    enabled: ganttMode === 'review',
  });

  const scheduleTimelineQuery = useQuery({
    queryKey: ['admin-schedule-timeline', range.from, range.to],
    queryFn: () => getAdminScheduleTimeline({ from: range.from, to: range.to }),
    enabled: ganttMode === 'schedule',
  });

  const profilesQuery = useQuery({
    queryKey: ['admin-ops-profiles'],
    queryFn: async () => (await api.get('/admin/profiles/pending')).data.data as any[],
  });

  const plansQuery = useQuery({
    queryKey: ['admin-ops-plans'],
    queryFn: async () => (await api.get('/admin/therapy-plans/pending')).data.data as any[],
  });

  const productsQuery = useQuery({
    queryKey: ['admin-ops-products'],
    queryFn: async () => (await api.get('/admin/products/pending')).data.data as any[],
  });

  const certsQuery = useQuery({
    queryKey: ['admin-ops-certificates', certStatusFilter],
    queryFn: () => listAdminCertificates({ status: certStatusFilter }),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      type,
      action,
      reason,
    }: {
      id: string;
      type: 'profile' | 'plan' | 'product';
      action: 'APPROVE' | 'REJECT';
      reason?: string;
    }) => {
      if (type === 'profile') return api.post(`/admin/profiles/${id}/review`, { action, reason });
      if (type === 'plan') return api.post(`/admin/therapy-plans/${id}/review`, { action, reason });
      return api.post(`/admin/products/${id}/review`, { action, reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ops-profiles'] });
      qc.invalidateQueries({ queryKey: ['admin-ops-plans'] });
      qc.invalidateQueries({ queryKey: ['admin-ops-products'] });
      qc.invalidateQueries({ queryKey: ['admin-review-timeline'] });
      setRejectTarget(null);
      setRejectReason('');
    },
  });

  const certMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: CertAction; reason?: string }) =>
      manageCertificate(id, {
        action,
        rejectionReason: reason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ops-certificates'] });
      qc.invalidateQueries({ queryKey: ['admin-review-timeline'] });
      setCertReasonTarget(null);
      setCertReason('');
    },
  });

  const pendingItems = useMemo<PendingItem[]>(() => {
    const profiles = (profilesQuery.data ?? []).map((item) => ({
      id: item.id,
      type: 'profile' as const,
      title: t('admin.profiles.title', 'Profile'),
      ownerName: `${item.user?.firstName ?? ''} ${item.user?.lastName ?? ''}`.trim(),
      submittedAt: item.submittedAt ?? null,
    }));

    const plans = (plansQuery.data ?? []).map((item) => ({
      id: item.id,
      type: 'plan' as const,
      title: item.title ?? item.titleI18n?.zh ?? item.titleI18n?.en ?? 'Untitled Plan',
      ownerName: `${item.therapist?.user?.firstName ?? ''} ${item.therapist?.user?.lastName ?? ''}`.trim(),
      submittedAt: item.submittedAt ?? null,
    }));

    const products = (productsQuery.data ?? []).map((item) => ({
      id: item.id,
      type: 'product' as const,
      title: item.title ?? item.titleI18n?.zh ?? item.titleI18n?.en ?? 'Untitled Product',
      ownerName: `${item.userProfile?.user?.firstName ?? ''} ${item.userProfile?.user?.lastName ?? ''}`.trim(),
      submittedAt: item.submittedAt ?? null,
    }));

    const merged = [...profiles, ...plans, ...products];
    const query = search.trim().toLowerCase();
    const filtered = query
      ? merged.filter((item) =>
          `${item.title} ${item.ownerName}`.toLowerCase().includes(query),
        )
      : merged;
    return filtered.sort((a, b) => {
      const aTs = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTs = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return aTs - bTs;
    });
  }, [plansQuery.data, productsQuery.data, profilesQuery.data, search, t]);

  const timelineItems = useMemo<Array<ReviewTimelineItem | ScheduleTimelineItem>>(
    () => (ganttMode === 'review' ? reviewTimelineQuery.data ?? [] : scheduleTimelineQuery.data ?? []),
    [ganttMode, reviewTimelineQuery.data, scheduleTimelineQuery.data],
  );

  const timelineBounds = useMemo(() => {
    const start = new Date(range.from).getTime();
    const end = new Date(range.to).getTime();
    const span = Math.max(end - start, 24 * 60 * 60 * 1000);
    return { start, end, span };
  }, [range.from, range.to]);

  const isLoadingQueues =
    profilesQuery.isLoading || plansQuery.isLoading || productsQuery.isLoading || certsQuery.isLoading;
  const isLoadingTimeline =
    (ganttMode === 'review' && reviewTimelineQuery.isLoading) ||
    (ganttMode === 'schedule' && scheduleTimelineQuery.isLoading);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-stone-500 mb-1">{t('dashboard.admin.filterFrom', 'From')}</label>
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
              className="h-9 rounded-lg border border-stone-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">{t('dashboard.admin.filterTo', 'To')}</label>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
              className="h-9 rounded-lg border border-stone-300 px-3 text-sm"
            />
          </div>
          <div className="ml-auto flex rounded-lg border border-stone-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setGanttMode('review')}
              className={`px-3 py-2 text-sm ${ganttMode === 'review' ? 'bg-teal-600 text-white' : 'bg-white text-stone-600'}`}
            >
              {t('dashboard.admin.reviewPipeline', 'Review Pipeline')}
            </button>
            <button
              type="button"
              onClick={() => setGanttMode('schedule')}
              className={`px-3 py-2 text-sm ${ganttMode === 'schedule' ? 'bg-teal-600 text-white' : 'bg-white text-stone-600'}`}
            >
              {t('dashboard.admin.serviceSchedule', 'Service Schedule')}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 p-3 bg-stone-50">
          {isLoadingTimeline ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : timelineItems.length === 0 ? (
            <p className="text-sm text-stone-500 py-4 text-center">{t('common.noData', 'No data in selected range')}</p>
          ) : (
            <div className="space-y-2">
              {timelineItems.map((item) => {
                const startValue = ganttMode === 'review' ? new Date((item as ReviewTimelineItem).startAt).getTime() : new Date((item as ScheduleTimelineItem).startTime).getTime();
                const endValue = ganttMode === 'review' ? new Date((item as ReviewTimelineItem).endAt).getTime() : new Date((item as ScheduleTimelineItem).endTime).getTime();
                const left = Math.max(0, ((startValue - timelineBounds.start) / timelineBounds.span) * 100);
                const width = Math.max(1, ((endValue - startValue) / timelineBounds.span) * 100);
                return (
                  <div key={`${item.entityType}-${item.id}`} className="grid grid-cols-[220px_1fr] gap-3 items-center">
                    <div className="text-xs text-stone-700 truncate">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-stone-500"> · {item.ownerName}</span>
                    </div>
                    <div className="h-7 rounded bg-white border border-stone-200 relative overflow-hidden">
                      <div
                        className={`absolute top-1 bottom-1 rounded ${timelineColor(item)}`}
                        style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                        title={`${item.status}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <h3 className="text-sm font-semibold text-stone-900">{t('dashboard.admin.reviewQueue')}</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('dashboard.admin.searchQueue', 'Search title or owner')}
            className="ml-auto h-9 w-full sm:w-72 rounded-lg border border-stone-300 px-3 text-sm"
          />
        </div>

        {isLoadingQueues ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="space-y-2">
            {pendingItems.length === 0 && (
              <p className="text-sm text-stone-500 py-3">{t('dashboard.admin.noPendingItems', 'No pending items')}</p>
            )}
            {pendingItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="rounded-lg border border-stone-200 p-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-900 truncate">{item.title}</p>
                    <p className="text-xs text-stone-500">
                      {item.type.toUpperCase()} · {item.ownerName || '—'}
                      {item.submittedAt ? ` · ${new Date(item.submittedAt).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => reviewMutation.mutate({ id: item.id, type: item.type, action: 'APPROVE' })}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {t('dashboard.review.approve')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRejectTarget({ id: item.id, type: item.type })}>
                    <XCircle className="h-4 w-4 mr-1" />
                    {t('dashboard.review.reject')}
                  </Button>
                </div>

                {rejectTarget?.id === item.id && rejectTarget.type === item.type && (
                  <div className="mt-2 flex gap-2">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t('dashboard.review.rejectionReasonPlaceholder')}
                      className="h-9 flex-1 rounded-lg border border-stone-300 px-3 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => reviewMutation.mutate({ id: item.id, type: item.type, action: 'REJECT', reason: rejectReason })}
                      disabled={!rejectReason.trim()}
                    >
                      {t('dashboard.review.confirm')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-stone-900">{t('dashboard.admin.certificates', 'Certificates')}</h3>
          <select
            value={certStatusFilter}
            onChange={(e) => setCertStatusFilter(e.target.value as any)}
            className="ml-auto h-9 rounded-lg border border-stone-300 px-3 text-sm"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>

        <div className="space-y-2">
          {(certsQuery.data ?? []).map((cert: AdminCertificate) => {
            const reasonAction = certReasonTarget && certReasonTarget.id === cert.id ? certReasonTarget.action : null;
            return (
              <div key={cert.id} className="rounded-lg border border-stone-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-900">{cert.type}</p>
                    <p className="text-xs text-stone-500">
                      {cert.profile.user.firstName} {cert.profile.user.lastName} · {cert.status}
                    </p>
                  </div>

                  {cert.status === 'PENDING' && (
                    <>
                      <Button size="sm" onClick={() => certMutation.mutate({ id: cert.id, action: 'APPROVE' })}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('dashboard.review.approve')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCertReasonTarget({ id: cert.id, action: 'REJECT' })}>
                        <XCircle className="h-4 w-4 mr-1" />
                        {t('dashboard.review.reject')}
                      </Button>
                    </>
                  )}

                  {cert.status === 'APPROVED' && (
                    <Button size="sm" variant="outline" onClick={() => setCertReasonTarget({ id: cert.id, action: 'REVOKE' })}>
                      <Ban className="h-4 w-4 mr-1" />
                      {t('dashboard.admin.revoke', 'Revoke')}
                    </Button>
                  )}

                  {(cert.status === 'REJECTED' || cert.status === 'REVOKED') && (
                    <Button size="sm" variant="outline" onClick={() => certMutation.mutate({ id: cert.id, action: 'RESET_TO_PENDING' })}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {t('dashboard.admin.setPending', 'Set Pending')}
                    </Button>
                  )}
                </div>

                {reasonAction && (
                  <div className="mt-2 flex gap-2">
                    <input
                      value={certReason}
                      onChange={(e) => setCertReason(e.target.value)}
                      placeholder={t('dashboard.review.rejectionReasonPlaceholder')}
                      className="h-9 flex-1 rounded-lg border border-stone-300 px-3 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => certMutation.mutate({ id: cert.id, action: reasonAction, reason: certReason })}
                      disabled={reasonAction === 'REJECT' && !certReason.trim()}
                    >
                      {t('dashboard.review.confirm')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setCertReason(''); setCertReasonTarget(null); }}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
