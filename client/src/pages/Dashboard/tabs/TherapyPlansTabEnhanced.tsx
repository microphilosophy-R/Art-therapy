import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar } from 'lucide-react';
import { listTherapyPlans, submitTherapyPlanForReview, archiveTherapyPlan, deleteTherapyPlan, cancelTherapyPlan } from '../../../api/therapyPlans';
import type { TherapyPlan, TherapyPlanStatus } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { getPosterUrl } from '../../../utils/therapyPlanUtils';
import { getFallbackPosterUrl } from '../../../utils/defaultPosters';
import { useAuthStore } from '../../../store/authStore';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  IN_PROGRESS: 'info',
  FINISHED: 'default',
  ARCHIVED: 'default',
};

export const TherapyPlansTab = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<TherapyPlanStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<'creator' | 'participant'>('creator');

  const hasTherapistCert = user?.approvedCertificates?.includes('THERAPIST');

  const { data, isLoading } = useQuery({
    queryKey: ['therapy-plans', roleFilter, statusFilter],
    queryFn: () => listTherapyPlans({ role: roleFilter, status: statusFilter !== 'all' ? statusFilter : undefined, sortBy: 'startTime', order: 'asc' }),
  });

  const submitMutation = useMutation({
    mutationFn: submitTherapyPlanForReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['therapy-plans'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveTherapyPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['therapy-plans'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTherapyPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['therapy-plans'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelTherapyPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['therapy-plans'] }),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const plans = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">{t('dashboard.plans.title')}</h2>
        {hasTherapistCert ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-600 font-medium">{t('dashboard.plans.certified')}</span>
            <Link to="/therapy-plans/create">
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('dashboard.plans.createPlan')}</Button>
            </Link>
          </div>
        ) : (
          <Link to="/dashboard/member?tab=review">
            <Button size="sm">{t('dashboard.plans.getCertified')}</Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="flex gap-2">
          <button onClick={() => setRoleFilter('creator')} className={`px-3 py-1 text-sm rounded ${roleFilter === 'creator' ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-600'}`}>
            {t('dashboard.plans.filterMyPlans')}
          </button>
          <button onClick={() => setRoleFilter('participant')} className={`px-3 py-1 text-sm rounded ${roleFilter === 'participant' ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-600'}`}>
            {t('dashboard.plans.filterEnrolled')}
          </button>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TherapyPlanStatus | 'all')} className="px-3 py-1 text-sm border border-stone-300 rounded">
          <option value="all">{t('dashboard.plans.statusFilter.all')}</option>
          <option value="DRAFT">{t('dashboard.plans.statusFilter.draft')}</option>
          <option value="PENDING_REVIEW">{t('dashboard.plans.statusFilter.pendingReview')}</option>
          <option value="PUBLISHED">{t('dashboard.plans.statusFilter.published')}</option>
          <option value="IN_PROGRESS">{t('dashboard.plans.statusFilter.inProgress')}</option>
          <option value="FINISHED">{t('dashboard.plans.statusFilter.finished')}</option>
        </select>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p>{t('dashboard.plans.noPlans')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan: TherapyPlan) => (
            <div key={plan.id} className="border border-stone-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex gap-4">
                <div className="w-24 h-16 shrink-0 overflow-hidden rounded bg-stone-100">
                  <img
                    src={getPosterUrl(plan)}
                    alt={plan.title}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = getFallbackPosterUrl(); }}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-stone-900">{plan.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-stone-500">
                        <Calendar className="h-4 w-4" />
                        {plan.startTime && new Date(plan.startTime).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={statusVariant[plan.status]}>{plan.status}</Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link to={`/therapy-plans/${plan.id}`}>
                      <Button size="sm" variant="outline">{t('dashboard.plans.view')}</Button>
                    </Link>
                    {plan.status === 'DRAFT' && roleFilter === 'creator' && (
                      <>
                        <Link to={`/therapy-plans/${plan.id}/edit`}>
                          <Button size="sm" variant="outline">{t('dashboard.plans.edit')}</Button>
                        </Link>
                        <Button size="sm" onClick={() => submitMutation.mutate(plan.id)}>{t('dashboard.plans.submit')}</Button>
                        <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(plan.id)}>{t('dashboard.plans.delete')}</Button>
                      </>
                    )}
                    {plan.status === 'REJECTED' && roleFilter === 'creator' && (
                      <Link to={`/therapy-plans/${plan.id}/edit`}>
                        <Button size="sm">{t('dashboard.plans.edit')}</Button>
                      </Link>
                    )}
                    {['PUBLISHED', 'SIGN_UP_CLOSED', 'IN_PROGRESS'].includes(plan.status) && roleFilter === 'creator' && (
                      <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => {
                        if (window.confirm(t('dashboard.plans.confirmCancel', 'Cancel this plan? All participants will be notified and refunded.'))) {
                          cancelMutation.mutate(plan.id);
                        }
                      }}>{t('dashboard.plans.cancel', 'Cancel')}</Button>
                    )}
                  </div>
                  {plan.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-50 text-red-800 text-sm rounded">
                      <strong>{t('dashboard.plans.rejectionLabel')}</strong> {plan.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
