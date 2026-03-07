import { Link } from 'react-router-dom';
import { MapPin, Users, Calendar, Pencil, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TherapyPlan } from '../../types';
import { getPosterUrl } from '../../utils/therapyPlanUtils';
import { pickLocalizedText } from '../../utils/i18nContent';
import { getFallbackPosterUrl } from '../../utils/defaultPosters';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface TherapyPlanCardProps {
  plan: TherapyPlan;
  perspective?: 'public' | 'therapist' | 'admin';
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
  const { t, i18n } = useTranslation();
  const posterUrl = getPosterUrl(plan);
  const planTitle = pickLocalizedText(plan.titleI18n, i18n.language, plan.title);
  const planSlogan = pickLocalizedText(plan.sloganI18n, i18n.language, plan.slogan);
  const isPersonal = plan.type === 'PERSONAL_CONSULT';
  const enrolledCount = plan._count?.participants || 0;
  const sloganString = planSlogan || t(`common.planSlogan.${plan.type}`, plan.type);

  const linkTo = isPersonal && perspective === 'public'
    ? `/therapists/${plan.therapistId}`
    : `/therapy-plans/${plan.id}`;

  const hasParticipants = plan.maxParticipants != null;
  const hasPrice = plan.price != null;
  const formattedPrice = hasPrice ? `CNY ${Number(plan.price).toFixed(2)}` : null;
  const startDate = new Date(plan.startTime).toLocaleDateString(i18n.language);
  const endDate = plan.endTime ? new Date(plan.endTime).toLocaleDateString(i18n.language) : null;

  return (
    <Card
      className={[
        'group relative overflow-hidden h-full transition-shadow duration-300 hover:shadow-lg',
        editable ? 'ring-2 ring-teal-400/80' : '',
      ].join(' ')}
    >
      {editable && (
        <Link
          to={`/therapy-plans/${plan.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 z-10"
        >
          <Button size="sm" variant="outline" className="h-7 px-2.5">
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {t('common.edit', 'Edit')}
          </Button>
        </Link>
      )}

      <Link to={linkTo} className="block h-full">
        <div className="aspect-poster bg-ivory-300 overflow-hidden relative">
          <img
            src={posterUrl}
            alt={planTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getFallbackPosterUrl();
            }}
          />
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${planTypeColors[plan.type] ?? 'bg-white text-stone-700'}`}
            >
              {t(`common.planType.${plan.type}`)}
            </span>
            {perspective !== 'public' && (
              <Badge variant={statusVariant[plan.status] ?? 'default'} className="bg-white/95 border-0">
                {t(`common.planStatus.${plan.status}`)}
              </Badge>
            )}
            {plan.sessionMedium === 'VIDEO' && (
              <Badge variant="outline" className="bg-white/95 border-0">
                <Video className="h-3 w-3 mr-1" />
                {t('common.medium.VIDEO')}
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4 flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-celadon-600 transition-colors">
              {planTitle}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-1 mt-1">{sloganString}</p>
          </div>

          <div className="space-y-1.5 text-xs text-gray-500">
            <div className="flex items-start gap-1.5">
              <Calendar className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="line-clamp-2">
                {isPersonal && perspective === 'public' ? (
                  <span className="font-medium text-celadon-700">{t('common.bookNow', 'Book now')}</span>
                ) : (
                  <>
                    {startDate}
                    {endDate ? ` - ${endDate}` : ''}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{plan.location}</span>
            </div>

            {hasParticipants && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>
                  {enrolledCount} / {plan.maxParticipants}
                </span>
              </div>
            )}

            {!hasParticipants && isPersonal && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>1-on-1 Session</span>
              </div>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between">
            <span className="text-xs text-celadon-700 font-semibold">{t('shop.product.viewDetails')}</span>
            {formattedPrice ? (
              <span className="text-sm font-semibold text-gray-900">{formattedPrice}</span>
            ) : (
              <span className="text-xs text-gray-400">{t(`common.planType.${plan.type}`)}</span>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};
