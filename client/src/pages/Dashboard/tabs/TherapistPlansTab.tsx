import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ExternalLink } from 'lucide-react';
import {
  listTherapyPlans,
  submitTherapyPlanForReview,
  archiveTherapyPlan,
  deleteTherapyPlan,
} from '../../../api/therapyPlans';
import type { TherapyPlan } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { getPosterUrl } from '../../../utils/therapyPlanUtils';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'default',
};

export const TherapistPlansTab = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['therapy-plans', 'my'],
    queryFn: () => listTherapyPlans({ limit: 50 }),
  });

  const submitMutation = useMutation({
    mutationFn: submitTherapyPlanForReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['therapy-plans', 'my'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveTherapyPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['therapy-plans', 'my'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTherapyPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['therapy-plans', 'my'] }),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  const plans = data?.data ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">{t('dashboard.therapist.plans')}</h2>
        <Link to="/therapy-plans/create">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t('dashboard.therapist.createPlan')}
          </Button>
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p>{t('dashboard.therapist.noPlans')}</p>
          <Link to="/therapy-plans/create" className="text-teal-600 text-sm mt-2 inline-block hover:underline">
            {t('dashboard.therapist.createPlan')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan: TherapyPlan) => (
            <div
              key={plan.id}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-stone-200 hover:border-stone-300 transition-colors"
            >
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
                <p className="text-xs text-stone-400">
                  {new Date(plan.startTime).toLocaleDateString()}
                </p>
                {plan.status === 'REJECTED' && plan.rejectionReason && (
                  <p className="text-xs text-rose-500 mt-0.5 line-clamp-1">{plan.rejectionReason}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link to={`/therapy-plans/${plan.id}`}>
                  <Button size="sm" variant="ghost" title={t('common.view')}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>

                {(plan.status === 'DRAFT' || plan.status === 'REJECTED') && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/therapy-plans/${plan.id}/edit`)}
                    >
                      {t('therapyPlans.detail.edit')}
                    </Button>
                    <Button
                      size="sm"
                      loading={submitMutation.isPending}
                      onClick={() => submitMutation.mutate(plan.id)}
                    >
                      {t('therapyPlans.detail.submitForReview')}
                    </Button>
                    {plan.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => {
                          if (window.confirm(t('common.confirmDelete', 'Delete this plan?'))) {
                            deleteMutation.mutate(plan.id);
                          }
                        }}
                      >
                        {t('common.delete')}
                      </Button>
                    )}
                  </>
                )}

                {plan.status === 'PUBLISHED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate(plan.id)}
                  >
                    {t('therapyPlans.detail.archive')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
