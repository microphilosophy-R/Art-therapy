import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock, XCircle, AlertCircle, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitProfile } from '../../../../api/therapists';
import { Button } from '../../../../components/ui/Button';
import type { TherapistProfile } from '../../../../types';

interface Props {
  profile: TherapistProfile;
}

const STATUS_CONFIG = {
  DRAFT: { icon: AlertCircle, color: 'text-stone-500', bg: 'bg-stone-50 border-stone-200' },
  PENDING_REVIEW: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  APPROVED: { icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
  REJECTED: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
};

export const Step4Preview = ({ profile }: Props) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const status = profile.profileStatus ?? 'DRAFT';
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  const submitMutation = useMutation({
    mutationFn: () => submitProfile(profile.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['therapist', 'me'] });
    },
  });

  const canSubmit = status === 'DRAFT' || status === 'REJECTED';

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg}`}>
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${cfg.color}`} />
        <div>
          <p className={`text-sm font-semibold ${cfg.color}`}>
            {t(`profile.status.${status}`)}
          </p>
          {status === 'REJECTED' && profile.rejectionReason && (
            <p className="text-sm text-rose-700 mt-1">{profile.rejectionReason}</p>
          )}
          {status === 'PENDING_REVIEW' && (
            <p className="text-xs text-amber-700 mt-0.5">{t('profile.wizard.pendingDesc')}</p>
          )}
          {status === 'APPROVED' && (
            <p className="text-xs text-teal-700 mt-0.5">{t('profile.wizard.approvedDesc')}</p>
          )}
        </div>
      </div>

      {/* Profile summary */}
      <div className="rounded-xl border border-stone-200 divide-y divide-stone-100">
        <Row label={t('profile.wizard.locationCity')} value={profile.locationCity} />
        <Row label={t('profile.wizard.sessionPrice')} value={`¥${Number(profile.sessionPrice).toFixed(0)}`} />
        <Row label={t('profile.wizard.sessionLength')} value={`${profile.sessionLength} min`} />
        <Row
          label={t('profile.wizard.specialties')}
          value={profile.specialties.length > 0 ? profile.specialties.join(', ') : '—'}
        />
        <Row
          label={t('profile.wizard.enableConsult')}
          value={profile.consultEnabled ? t('common.yes') : t('common.no')}
        />
        {profile.consultEnabled && (
          <Row
            label={t('profile.wizard.hourlyConsultFee')}
            value={profile.hourlyConsultFee ? `¥${Number(profile.hourlyConsultFee).toFixed(0)}/hr` : '—'}
          />
        )}
        {profile.consultEnabled && (
          <Row
            label={t('profile.wizard.certificate')}
            value={
              profile.certificateUrl ? (
                <a href={profile.certificateUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-teal-600 underline text-sm">
                  <FileText className="h-3.5 w-3.5" />
                  {t('profile.wizard.certificateUploaded')}
                </a>
              ) : '—'
            }
          />
        )}
        <Row
          label={t('therapists.profile.featuredImage')}
          value={profile.featuredImageUrl
            ? <img src={profile.featuredImageUrl} alt="" className="h-16 w-24 object-cover rounded-lg" />
            : '—'
          }
        />
        <Row
          label={t('profile.gallery.title')}
          value={`${(profile.galleryImages ?? []).length} ${t('profile.gallery.images')}`}
        />
      </div>

      {/* Bio preview */}
      {profile.bio && (
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs font-medium text-stone-500 mb-2">{t('profile.wizard.bio')}</p>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{profile.bio}</p>
        </div>
      )}

      {/* Submit */}
      {canSubmit && (
        <div className="pt-2">
          <Button
            onClick={() => submitMutation.mutate()}
            loading={submitMutation.isPending}
            size="lg"
            className="w-full"
          >
            {t('profile.wizard.submitForReview')}
          </Button>
          {submitMutation.isError && (
            <p className="text-xs text-rose-500 mt-2 text-center">{t('common.errors.tryAgain')}</p>
          )}
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-4 px-4 py-3">
    <span className="text-xs font-medium text-stone-500 w-36 shrink-0 pt-0.5">{label}</span>
    <span className="text-sm text-stone-800 flex-1">{value ?? '—'}</span>
  </div>
);
