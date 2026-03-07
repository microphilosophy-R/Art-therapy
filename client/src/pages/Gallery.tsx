import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { listTherapyPlans } from '../api/therapyPlans';
import { TherapyPlanCard } from '../components/therapyPlans/TherapyPlanCard';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';

export const Gallery = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['gallery', page],
    queryFn: () => listTherapyPlans({ timeFilter: 'past', page, limit: 12 }),
  });

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900">{t('gallery.title')}</h1>
        <p className="text-stone-500 mt-1">{t('gallery.subtitle')}</p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">{t('therapyPlans.directory.empty', 'No plans found.')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.data.map((plan) => (
              <TherapyPlanCard key={plan.id} plan={plan} />
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-10">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('common.previous', 'Previous')}
              </Button>
              <span className="text-sm text-stone-500">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common.next', 'Next')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
