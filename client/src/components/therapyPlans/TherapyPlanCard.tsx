import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Users, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TherapyPlan } from '../../types';
import { getPosterUrl } from '../../utils/therapyPlanUtils';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';

interface TherapyPlanCardProps {
  plan: TherapyPlan;
  perspective?: 'public' | 'therapist' | 'admin';
}

const planTypeColors: Record<string, string> = {
  PERSONAL_CONSULT: 'bg-teal-100 text-teal-700',
  GROUP_CONSULT:    'bg-blue-100 text-blue-700',
  ART_SALON:        'bg-purple-100 text-purple-700',
  WELLNESS_RETREAT: 'bg-amber-100 text-amber-700',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  DRAFT:          'outline',
  PENDING_REVIEW: 'warning',
  PUBLISHED:      'success',
  REJECTED:       'danger',
  ARCHIVED:       'default',
};

export const TherapyPlanCard = ({ plan, perspective = 'public' }: TherapyPlanCardProps) => {
  const { t } = useTranslation();
  const posterUrl = getPosterUrl(plan);
  const therapist = plan.therapist;
  const user = therapist?.user;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 overflow-hidden h-full flex flex-col">
      {/* Poster */}
      <Link to={`/therapy-plans/${plan.id}`} className="block">
        <div className="aspect-[16/9] overflow-hidden bg-stone-100">
          <img
            src={posterUrl}
            alt={plan.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).src = '/posters/default-1.jpg'; }}
          />
        </div>
      </Link>

      <CardContent className="flex flex-col flex-1 p-4">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${planTypeColors[plan.type] ?? 'bg-stone-100 text-stone-700'}`}>
            {t(`common.planType.${plan.type}`)}
          </span>
          {perspective !== 'public' && (
            <Badge variant={statusVariant[plan.status] ?? 'default'}>
              {t(`common.planStatus.${plan.status}`)}
            </Badge>
          )}
        </div>

        {/* Title */}
        <Link to={`/therapy-plans/${plan.id}`} className="block group">
          <h3 className="font-semibold text-stone-900 group-hover:text-teal-700 transition-colors line-clamp-2 mb-2">
            {plan.title}
          </h3>
        </Link>

        {/* Introduction preview */}
        <p className="text-sm text-stone-500 line-clamp-2 mb-3 flex-1">{plan.introduction}</p>

        {/* Meta info */}
        <div className="space-y-1 text-xs text-stone-500 mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{new Date(plan.startTime).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{plan.location}</span>
          </div>
          {plan.maxParticipants != null && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{t('therapyPlans.directory.participants_other', { count: plan.maxParticipants })}</span>
            </div>
          )}
        </div>

        {/* Therapist footer */}
        {user && (
          <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
            <Avatar
              firstName={user.firstName}
              lastName={user.lastName}
              src={user.avatarUrl}
              size="sm"
            />
            <span className="text-xs text-stone-600 font-medium">
              {user.firstName} {user.lastName}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
