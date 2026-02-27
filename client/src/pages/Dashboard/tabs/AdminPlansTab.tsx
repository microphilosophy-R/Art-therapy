import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { listTherapyPlans, reviewTherapyPlan } from '../../../api/therapyPlans';
import type { TherapyPlan, TherapyPlanStatus } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { getPosterUrl } from '../../../utils/therapyPlanUtils';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'default',
};

const STATUS_FILTER_OPTIONS: { value: TherapyPlanStatus | ''; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: '', label: 'All' },
];

export const AdminPlansTab = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TherapyPlanStatus | ''>('PENDING_REVIEW');
  const [rejectingPlanId, setRejectingPlanId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['therapy-plans', 'admin', statusFilter],
    queryFn: () => listTherapyPlans({ status: statusFilter || undefined, limit: 50 }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'APPROVE' | 'REJECT'; reason?: string }) =>
      reviewTherapyPlan(id, { action, rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapy-plans', 'admin'] });
      setRejectingPlanId(null);
      setRejectionReason('');
    },
  });

  const handleApprove = (id: string) => reviewMutation.mutate({ id, action: 'APPROVE' });

  const handleRejectSubmit = (id: string) => {
    if (!rejectionReason.trim()) {
      setRejectError(t('common.errors.required'));
      return;
    }
    setRejectError(null);
    reviewMutation.mutate({ id, action: 'REJECT', reason: rejectionReason });
  };

  const plans = data?.data ?? [];

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">{t('dashboard.admin.plans')}</h2>
        <div className="w-44">
          <Select
            options={STATUS_FILTER_OPTIONS.map(o => ({
              value: o.value,
              label: t(`common.planStatus.${o.value}` as any, o.label),
            }))}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TherapyPlanStatus | '')}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p>{t('dashboard.admin.noPlansInQueue')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan: TherapyPlan) => (
            <div key={plan.id} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* Poster thumbnail */}
                <div className="h-14 w-20 flex-shrink-0 rounded-md overflow-hidden bg-stone-100">
                  <img
                    src={getPosterUrl(plan)}
                    alt={plan.title}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/posters/default-1.jpg'; }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-stone-400">{t(`common.planType.${plan.type}`)}</span>
                    <Badge variant={statusVariant[plan.status] ?? 'default'}>
                      {t(`common.planStatus.${plan.status}`)}
                    </Badge>
                  </div>
                  <p className="font-medium text-stone-800 truncate">{plan.title}</p>
                  {plan.therapist?.user && (
                    <p className="text-xs text-stone-500">
                      {plan.therapist.user.firstName} {plan.therapist.user.lastName}
                    </p>
                  )}
                  {plan.submittedAt && (
                    <p className="text-xs text-stone-400">
                      {t('common.submitted')}: {new Date(plan.submittedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link to={`/therapy-plans/${plan.id}`}>
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Link to={`/therapy-plans/${plan.id}/edit`}>
                    <Button size="sm" variant="outline">{t('therapyPlans.detail.edit')}</Button>
                  </Link>
                  {plan.status === 'PENDING_REVIEW' && (
                    <>
                      <Button
                        size="sm"
                        loading={reviewMutation.isPending && rejectingPlanId === plan.id}
                        onClick={() => handleApprove(plan.id)}
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        {t('dashboard.admin.approvePlan')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => {
                          setRejectingPlanId(plan.id === rejectingPlanId ? null : plan.id);
                          setRejectionReason('');
                          setRejectError(null);
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        {t('dashboard.admin.rejectPlan')}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline rejection form */}
              {rejectingPlanId === plan.id && (
                <div className="border-t border-stone-100 bg-rose-50 p-4">
                  <Textarea
                    label={t('dashboard.admin.rejectionReason')}
                    placeholder={t('dashboard.admin.rejectionReasonPlaceholder')}
                    value={rejectionReason}
                    onChange={(e) => { setRejectionReason(e.target.value); setRejectError(null); }}
                    rows={3}
                    error={rejectError ?? undefined}
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-rose-700 border-rose-200 hover:bg-rose-50"
                      loading={reviewMutation.isPending && rejectingPlanId === plan.id && reviewMutation.variables?.action === 'REJECT'}
                      onClick={() => handleRejectSubmit(plan.id)}
                    >
                      {t('dashboard.admin.confirmReject')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setRejectingPlanId(null); setRejectionReason(''); setRejectError(null); }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
