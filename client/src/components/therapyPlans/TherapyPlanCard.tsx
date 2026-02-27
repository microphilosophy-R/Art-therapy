import { Link } from 'react-router-dom';
import { MapPin, Users, Calendar, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TherapyPlan } from '../../types';
import { getPosterUrl } from '../../utils/therapyPlanUtils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';

interface TherapyPlanCardProps {
  plan: TherapyPlan;
  perspective?: 'public' | 'therapist' | 'admin';
  /** When true, show glowing teal border + top-left edit mark */
  editable?: boolean;
}

const planTypeColors: Record<string, string> = {
  PERSONAL_CONSULT: 'bg-teal-100 text-teal-700',
  GROUP_CONSULT: 'bg-blue-100 text-blue-700',
  ART_SALON: 'bg-purple-100 text-purple-700',
  WELLNESS_RETREAT: 'bg-amber-100 text-amber-700',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'default',
};

export const TherapyPlanCard = ({ plan, perspective = 'public', editable = false }: TherapyPlanCardProps) => {
  const { t } = useTranslation();
  const posterUrl = getPosterUrl(plan);

  // Render logic based on type
  const isPersonal = plan.type === 'PERSONAL_CONSULT';
  const isGroup = plan.type === 'GROUP_CONSULT';
  const isSalon = plan.type === 'ART_SALON';
  const isRetreat = plan.type === 'WELLNESS_RETREAT';

  const showParticipantAvatars = isSalon || isRetreat;
  const enrolledCount = plan._count?.participants || 0;
  const participants = plan.participants || [];

  const sloganString = plan.slogan || t(`common.planSlogan.${plan.type}`);

  return (
    <Card
      className={[
        'group relative overflow-hidden h-[360px] flex flex-col hover:shadow-xl transition-all duration-300 rounded-2xl',
        editable
          ? 'ring-2 ring-teal-400 shadow-[0_0_14px_3px_rgba(45,212,191,0.45)] hover:shadow-[0_0_22px_6px_rgba(45,212,191,0.60)]'
          : '',
      ].join(' ')}
    >
      {/* Background Poster */}
      <div className="absolute inset-0 bg-stone-800">
        <img
          src={posterUrl}
          alt={plan.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-60"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = '/posters/default-1.jpg';
            }
          }}
        />
        {/* Gradients to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-teal-950/80 via-teal-900/30 to-transparent"></div>
      </div>

      {/* Top-left editable mark */}
      {editable && (
        <Link
          to={`/therapy-plans/${plan.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 left-3 z-30 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-teal-500/90 text-white backdrop-blur-sm shadow-md hover:bg-teal-400 transition-colors"
        >
          <Pencil className="h-3 w-3" />
          {t('common.edit', 'Edit')}
        </Link>
      )}

      <Link
        to={`/therapy-plans/${plan.id}`}
        className="absolute inset-0 z-20 flex flex-col justify-end p-5 text-white"
      >
        {/* Slogan - Always visible, pushed up on hover */}
        <div className="transform transition-transform duration-300 ease-in-out group-hover:-translate-y-4">
          <h2 className="text-2xl font-bold leading-tight mb-2 drop-shadow-md">
            {sloganString}
          </h2>

          <div className="flex flex-wrap items-center gap-1.5 opacity-90">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md ${planTypeColors[plan.type] ?? 'bg-white/20 text-white'}`}>
              {t(`common.planType.${plan.type}`)}
            </span>
            {perspective !== 'public' && (
              <Badge variant={statusVariant[plan.status] ?? 'default'} className="backdrop-blur-md bg-black/50 border-none text-white">
                {t(`common.planStatus.${plan.status}`)}
              </Badge>
            )}
          </div>
        </div>

        {/* Hidden Content - Reveals on Hover */}
        <div className="overflow-hidden">
          <div className="transform translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out space-y-3 mt-4">

            <h3 className="font-semibold text-teal-100 line-clamp-1">
              {plan.title}
            </h3>

            <div className="space-y-1.5 text-xs text-stone-300">
              <div className="flex items-start gap-1.5">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <div className="flex flex-col">
                  <span>{new Date(plan.startTime).toLocaleDateString()}</span>
                  {isRetreat && plan.endTime && (
                    <span className="opacity-75">to {new Date(plan.endTime).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-1">{plan.location}</span>
              </div>

              {/* Participant Info */}
              {isPersonal && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span>1-on-1 Session</span>
                </div>
              )}

              {isGroup && plan.maxParticipants != null && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span>Up to {plan.maxParticipants} participants</span>
                </div>
              )}
            </div>

            {/* Avatars for Salons & Retreats */}
            {showParticipantAvatars && (
              <div className="pt-2 border-t border-white/20 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2 overflow-hidden">
                    {participants.map((p) => p.user && (
                      <Avatar
                        key={p.user.id || p.planId}
                        firstName={p.user.firstName}
                        lastName={p.user.lastName}
                        src={p.user.avatarUrl || undefined}
                        size="sm"
                        className="ring-2 ring-stone-800 h-6 w-6"
                      />
                    ))}
                    {enrolledCount > participants.length && (
                      <div className="flex items-center justify-center h-6 w-6 rounded-full border-2 border-stone-800 bg-stone-700 text-[10px] font-medium text-white z-10">
                        +{enrolledCount - participants.length}
                      </div>
                    )}
                    {enrolledCount === 0 && (
                      <span className="text-xs text-stone-400">Be the first to join</span>
                    )}
                  </div>
                  {plan.maxParticipants && (
                    <span className="text-xs font-medium text-stone-300">
                      {enrolledCount} / {plan.maxParticipants}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
};
