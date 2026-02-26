import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TherapistProfile } from '../../types';
import { getSpecialtyColor } from '../../utils/formatters';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { StarRating } from '../ui/StarRating';
import { PriceDisplay } from '../ui/PriceDisplay';

interface TherapistCardProps {
  therapist: TherapistProfile;
}

export const TherapistCard = ({ therapist }: TherapistCardProps) => {
  const { t } = useTranslation();
  const { user, bio, specialties, sessionPrice, sessionLength, locationCity, rating, reviewCount, isAccepting } = therapist;

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <CardContent className="flex flex-col h-full p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar firstName={user.firstName} lastName={user.lastName} src={user.avatarUrl} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-stone-900">
                  {user.firstName} {user.lastName}
                </h3>
                {rating !== undefined && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StarRating rating={rating} />
                    <span className="text-xs text-stone-500">
                      {rating.toFixed(1)} ({reviewCount ?? 0})
                    </span>
                  </div>
                )}
              </div>
              {!isAccepting && <Badge variant="warning">{t('therapists.card.full')}</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-stone-500">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{locationCity}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{sessionLength} min</span>
              <span className="flex items-center gap-1"><Video className="h-3 w-3" />{t('therapists.card.videoAvailable')}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-sm text-stone-600 line-clamp-2 mb-4 flex-1">{bio}</p>

        {/* Specialties */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {specialties.slice(0, 4).map((s) => (
            <span
              key={s}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSpecialtyColor(s)}`}
            >
              {s}
            </span>
          ))}
          {specialties.length > 4 && (
            <span className="text-xs text-stone-400">{t('therapists.card.moreSpecialties', { n: specialties.length - 4 })}</span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          <div>
            <PriceDisplay cnyAmount={sessionPrice} className="text-lg font-semibold text-stone-900" />
            <span className="text-xs text-stone-500"> {t('therapists.card.perSession')}</span>
          </div>
          <Link to={`/therapists/${therapist.id}`}>
            <Button size="sm" disabled={!isAccepting}>
              {isAccepting ? t('therapists.card.viewProfile') : t('therapists.card.notAvailable')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
