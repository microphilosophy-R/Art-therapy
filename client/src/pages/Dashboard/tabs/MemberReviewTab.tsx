import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, Award, Briefcase, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { CertificateWizard } from '../CertificateWizard';
import api from '../../../api/axios';

interface ReviewStatus {
  profile?: { status: string; submittedAt?: string; rejectionReason?: string };
  plans: Array<{ id: string; title: string; status: string; submittedAt?: string; rejectionReason?: string }>;
  products: Array<{ id: string; title: string; status: string; submittedAt?: string; rejectionReason?: string }>;
  certificates: Array<{ type: string; status: string; appliedAt?: string; rejectionReason?: string }>;
}

const featureCards = [
  {
    type: 'THERAPIST',
    icon: Briefcase,
  },
  {
    type: 'COUNSELOR',
    icon: Award,
  },
  {
    type: 'ARTIFICER',
    icon: FileText,
  }
];

export function MemberReviewTab() {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState<string | null>(null);

  const { data: reviewStatus, isLoading } = useQuery<ReviewStatus>({
    queryKey: ['memberReviewStatus'],
    queryFn: async () => {
      const res = await api.get('/member/review-status');
      return res.data;
    }
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      PUBLISHED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      DRAFT: 'bg-gray-100 text-gray-800'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'PENDING' || status === 'PENDING_REVIEW') return <Clock className="h-4 w-4" />;
    if (status === 'APPROVED' || status === 'PUBLISHED') return <CheckCircle className="h-4 w-4" />;
    if (status === 'REJECTED') return <XCircle className="h-4 w-4" />;
    return null;
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-8">
      {/* Application Wizard */}
      <div>
        <h2 className="text-xl font-semibold text-stone-900 mb-4">{t('dashboard.review.applyForFeatures')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featureCards.map((card) => {
            const Icon = card.icon;
            const typeKey = card.type.toLowerCase();
            const cert = reviewStatus?.certificates.find(c => c.type === card.type);
            const isApplied = cert && ['PENDING', 'APPROVED'].includes(cert.status);
            return (
              <div key={card.type} className="border border-stone-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Icon className="h-5 w-5 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-stone-900">{t(`dashboard.review.features.${typeKey}.name`)}</h3>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-stone-600">{t('dashboard.review.requirements')}</p>
                  <ul className="text-xs text-stone-600 space-y-1">
                    <li>• {t(`dashboard.review.features.${typeKey}.req1`)}</li>
                    <li>• {t(`dashboard.review.features.${typeKey}.req2`)}</li>
                    {typeKey === 'therapist' && <li>• {t(`dashboard.review.features.${typeKey}.req3`)}</li>}
                  </ul>
                  <p className="text-xs font-medium text-stone-600 mt-3">{t('dashboard.review.benefits')}</p>
                  <ul className="text-xs text-stone-600 space-y-1">
                    <li>• {t(`dashboard.review.features.${typeKey}.benefit1`)}</li>
                    <li>• {t(`dashboard.review.features.${typeKey}.benefit2`)}</li>
                    {typeKey === 'therapist' && <li>• {t(`dashboard.review.features.${typeKey}.benefit3`)}</li>}
                  </ul>
                </div>
                <Button size="sm" onClick={() => setShowModal(card.type)} className="w-full" disabled={isApplied}>
                  {isApplied ? t('dashboard.review.applied') : t('dashboard.review.apply')}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Processes */}
      <div>
        <h2 className="text-xl font-semibold text-stone-900 mb-4">{t('dashboard.review.mySubmissions')}</h2>

        {/* Profile Status */}
        {reviewStatus?.profile && (
          <div className="mb-4 p-4 border border-stone-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-stone-600" />
                <div>
                  <p className="font-medium text-stone-900">{t('dashboard.review.profileSubmission')}</p>
                  <p className="text-sm text-stone-500">
                    {reviewStatus.profile.submittedAt && `${t('dashboard.review.submitted')} ${new Date(reviewStatus.profile.submittedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(reviewStatus.profile.status)}`}>
                {getStatusIcon(reviewStatus.profile.status)}
                {reviewStatus.profile.status}
              </div>
            </div>
            {reviewStatus.profile.rejectionReason && (
              <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-800">
                <strong>{t('dashboard.review.rejectionReason')}</strong> {reviewStatus.profile.rejectionReason}
              </div>
            )}
          </div>
        )}

        {/* Plans */}
        {reviewStatus?.plans.map((plan) => (
          <div key={plan.id} className="mb-4 p-4 border border-stone-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-stone-600" />
                <div>
                  <p className="font-medium text-stone-900">{plan.title}</p>
                  <p className="text-sm text-stone-500">{t('dashboard.review.therapyPlan')}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(plan.status)}`}>
                {getStatusIcon(plan.status)}
                {plan.status}
              </div>
            </div>
            {plan.rejectionReason && (
              <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-800">
                <strong>{t('dashboard.review.rejectionReason')}</strong> {plan.rejectionReason}
              </div>
            )}
          </div>
        ))}

        {/* Products */}
        {reviewStatus?.products.map((product) => (
          <div key={product.id} className="mb-4 p-4 border border-stone-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-stone-600" />
                <div>
                  <p className="font-medium text-stone-900">{product.title}</p>
                  <p className="text-sm text-stone-500">{t('dashboard.review.product')}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(product.status)}`}>
                {getStatusIcon(product.status)}
                {product.status}
              </div>
            </div>
            {product.rejectionReason && (
              <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-800">
                <strong>{t('dashboard.review.rejectionReason')}</strong> {product.rejectionReason}
              </div>
            )}
          </div>
        ))}

        {/* Certificates */}
        {reviewStatus?.certificates.map((cert, i) => (
          <div key={i} className="mb-4 p-4 border border-stone-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-stone-600" />
                <div>
                  <p className="font-medium text-stone-900">{cert.type} Certificate</p>
                  <p className="text-sm text-stone-500">{t('dashboard.review.featureApplication')}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(cert.status)}`}>
                {getStatusIcon(cert.status)}
                {cert.status}
              </div>
            </div>
            {cert.rejectionReason && (
              <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-800">
                <strong>{t('dashboard.review.rejectionReason')}</strong> {cert.rejectionReason}
              </div>
            )}
          </div>
        ))}

        {!reviewStatus?.profile && !reviewStatus?.plans.length && !reviewStatus?.products.length && !reviewStatus?.certificates.length && (
          <p className="text-center text-stone-500 py-8">{t('dashboard.review.noSubmissions')}</p>
        )}
      </div>

      {showModal && <CertificateWizard certificateType={showModal} onClose={() => setShowModal(null)} />}
    </div>
  );
}
