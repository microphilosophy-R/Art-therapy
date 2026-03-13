import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { listTherapyPlans } from '../api/therapyPlans';
import { TherapyPlanCard } from '../components/therapyPlans/TherapyPlanCard';
import { PageLoader } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';

export const MyPlansPage = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['my-plans'],
    queryFn: () => listTherapyPlans({ role: 'participant' }),
  });

  if (isLoading) return <PageLoader />;

  const plans = data?.data ?? [];

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">{t('nav.myPlans', 'My Plans')}</h1>
        {plans.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-stone-300" />
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              {t('myPlans.empty.title', 'No enrolled plans yet')}
            </h3>
            <p className="text-stone-500 mb-6">
              {t('myPlans.empty.description', 'Browse therapy plans and join one to get started')}
            </p>
            <Link to="/therapy-plans">
              <Button>{t('myPlans.empty.browse', 'Browse Therapy Plans')}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {plans.map((plan) => (
              <TherapyPlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
