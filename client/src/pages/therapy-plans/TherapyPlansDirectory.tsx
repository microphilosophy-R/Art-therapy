import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { listTherapyPlans } from '../../api/therapyPlans';
import type { TherapyPlanType } from '../../types';
import { TherapyPlanCard } from '../../components/therapyPlans/TherapyPlanCard';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const TYPES: (TherapyPlanType | '')[] = ['', 'PERSONAL_CONSULT', 'GROUP_CONSULT', 'ART_SALON', 'WELLNESS_RETREAT'];

const typeFilterKey: Record<TherapyPlanType | '', string> = {
  '':                'therapyPlans.directory.filterAll',
  PERSONAL_CONSULT:  'therapyPlans.directory.filterPersonal',
  GROUP_CONSULT:     'therapyPlans.directory.filterGroup',
  ART_SALON:         'therapyPlans.directory.filterSalon',
  WELLNESS_RETREAT:  'therapyPlans.directory.filterRetreat',
};

export const TherapyPlansDirectory = () => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<TherapyPlanType | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['therapy-plans', { type: selectedType, page }],
    queryFn: () => listTherapyPlans({ type: selectedType || undefined, page, limit: 12 }),
  });

  const handleTypeChange = (type: TherapyPlanType | '') => {
    setSelectedType(type);
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">{t('therapyPlans.directory.title')}</h1>
        <p className="mt-2 text-stone-500">{t('therapyPlans.directory.subtitle')}</p>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500',
              selectedType === type
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            )}
          >
            {t(typeFilterKey[type])}
          </button>
        ))}
      </div>

      {/* Plans grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16">
          <p className="text-stone-500">{t('therapyPlans.directory.noPlans')}</p>
          <p className="text-stone-400 text-sm mt-1">{t('therapyPlans.directory.noPlansHint')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.data.map((plan) => (
              <TherapyPlanCard key={plan.id} plan={plan} perspective="public" />
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
              >
                ←
              </Button>
              <span className="text-sm text-stone-500">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages}
              >
                →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
