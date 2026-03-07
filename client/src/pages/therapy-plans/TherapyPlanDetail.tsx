import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Calendar, Users, Phone, ChevronLeft, Video, Download, CheckCircle2, FileText,
} from 'lucide-react';
import {
  getTherapyPlan,
  submitTherapyPlanForReview,
  archiveTherapyPlan,
  getTherapyPlanIcsUrl,
  signUpForTherapyPlan,
  cancelTherapyPlanSignup,
} from '../../api/therapyPlans';
import { StandardPaymentWorkflow } from '../../components/payments/StandardPaymentWorkflow';
import { type PaymentMethod } from '../../components/payments/PaymentMethodSelector';
import { PlanSchedule } from '../../components/therapyPlans/PlanSchedule';
import { getPosterUrl } from '../../utils/therapyPlanUtils';
import { ImageSlideshow } from '../../components/ui/ImageSlideshow';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { pickLocalizedText } from '../../utils/i18nContent';
import { followUser, getFollowStatus, unfollowUser } from '../../api/follows';
import { formatCNY } from '../../utils/formatters';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  SIGN_UP_CLOSED: 'warning',
  IN_PROGRESS: 'info',
  FINISHED: 'default',
  IN_GALLERY: 'outline',
  CANCELLED: 'danger',
  ARCHIVED: 'default',
};

export const TherapyPlanDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('alipay');
  const [signupResult, setSignupResult] = useState<{ participantId: string; payment?: any } | null>(null);
  const hasTherapistCert = !!user?.approvedCertificates?.includes('THERAPIST');

  const { data: plan, isLoading } = useQuery({
    queryKey: ['therapy-plan', id],
    queryFn: () => getTherapyPlan(id!),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: () => submitTherapyPlanForReview(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['therapy-plan', id] }),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveTherapyPlan(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['therapy-plan', id] }),
  });

  const signupMutation = useMutation({
    mutationFn: () => signUpForTherapyPlan(id!, { paymentProvider: paymentMethod === 'wechat' ? 'WECHAT_PAY' : 'ALIPAY' }),
    onSuccess: (data) => {
      setSignupError(null);
      if (data.payment) {
        // If there's a payment needed, don't invalidate yet, show the payment form
        setSignupResult({ participantId: data.participant.id, payment: data.payment });
      } else {
        // Free plan, just refresh
        queryClient.invalidateQueries({ queryKey: ['therapy-plan', id] });
      }
    },
    onError: (err: any) => {
      setSignupError(err?.response?.data?.message ?? t('common.errors.generic', 'An error occurred'));
    },
  });

  const cancelSignupMutation = useMutation({
    mutationFn: () => cancelTherapyPlanSignup(id!),
    onSuccess: () => {
      setSignupError(null);
      queryClient.invalidateQueries({ queryKey: ['therapy-plan', id] });
    },
    onError: (err: any) => {
      setSignupError(err?.response?.data?.message ?? t('common.errors.generic', 'An error occurred'));
    },
  });

  const therapistUserId = plan?.therapist?.user?.id;
  const canFollowOwner = !!(user?.role === 'MEMBER' && therapistUserId && therapistUserId !== user.id);

  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', therapistUserId],
    queryFn: () => getFollowStatus(therapistUserId!),
    enabled: canFollowOwner,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!therapistUserId) throw new Error('Therapist not found');
      return followUser(therapistUserId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follow-status', therapistUserId] }),
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!therapistUserId) throw new Error('Therapist not found');
      return unfollowUser(therapistUserId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follow-status', therapistUserId] }),
  });

  const shouldRedirectToTherapist = plan?.type === 'PERSONAL_CONSULT' && !!plan?.therapistId;

  useEffect(() => {
    if (!shouldRedirectToTherapist || !plan?.therapistId) return;
    navigate(`/therapists/${plan.therapistId}`, { replace: true });
  }, [navigate, plan?.therapistId, shouldRedirectToTherapist]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-5 w-28 bg-stone-200 rounded mb-6" />
        <div className="aspect-[16/9] w-full rounded-xl bg-stone-200 mb-6" />
        <div className="h-8 w-3/4 bg-stone-200 rounded mb-3" />
        <div className="h-4 w-1/2 bg-stone-200 rounded mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-24 rounded-lg bg-stone-200" />
          <div className="h-24 rounded-lg bg-stone-200" />
        </div>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-stone-500">{t('therapyPlans.detail.notFound')}</p>
        <Link to="/therapy-plans" className="text-teal-600 text-sm mt-3 inline-block hover:underline">
          {t('therapyPlans.detail.back')}
        </Link>
      </div>
    );
  }

  const posterUrl = getPosterUrl(plan);
  const planTitle = pickLocalizedText(plan.titleI18n, i18n.language, plan.title);
  const planSlogan = pickLocalizedText(plan.sloganI18n, i18n.language, plan.slogan);
  const planIntroduction = pickLocalizedText(plan.introductionI18n, i18n.language, plan.introduction);
  const therapist = plan.therapist;
  const therapistUser = therapist?.user;

  const galleryImages = plan.images?.length
    ? plan.images.map((img) => img.url)
    : [posterUrl];

  const isOwner = hasTherapistCert && therapist?.userId === user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const isClient = user?.role === 'MEMBER' && !hasTherapistCert;
  const canEdit = isAdmin || (isOwner && (plan.status === 'DRAFT' || plan.status === 'REJECTED'));
  const canSubmit = isOwner && (plan.status === 'DRAFT' || plan.status === 'REJECTED');
  const canArchive = (isOwner || isAdmin) && plan.status === 'PUBLISHED';

  const isNonPersonal = plan.type !== 'PERSONAL_CONSULT';
  const myParticipation = plan.participants?.find((p) => p.userId === user?.id);
  const isEnrolled = myParticipation?.status === 'SIGNED_UP';
  const isPendingPayment = myParticipation?.status === 'PENDING_PAYMENT';

  const now = new Date();
  const isPastSignupDeadline = (new Date(plan.startTime).getTime() - now.getTime()) < 12 * 60 * 60 * 1000;

  const canSignUp = (user?.role === 'MEMBER' || !user) && isNonPersonal && plan.status === 'PUBLISHED' && !isEnrolled && !isPendingPayment && !isPastSignupDeadline;
  const canCancelSignup = isClient && isNonPersonal && plan.status === 'PUBLISHED' && (isEnrolled || isPendingPayment);

  if (shouldRedirectToTherapist) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  const numericPrice = Number(plan.price ?? 0);
  const isPayablePlan = plan.price != null && numericPrice > 0;
  const isFreePlan = !isPayablePlan;
  const priceDisplay = isPayablePlan ? formatCNY(numericPrice) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        to="/therapy-plans"
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('therapyPlans.detail.back')}
      </Link>

      {/* Media: video (if any) + image slideshow */}
      <div className="mb-6 space-y-3">
        {plan.videoUrl && (
          <div className="rounded-xl overflow-hidden aspect-[16/9] bg-black">
            <video
              src={plan.videoUrl}
              controls
              className="w-full h-full object-contain"
              poster={posterUrl}
            />
          </div>
        )}
        <ImageSlideshow images={galleryImages} />
      </div>

      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="info">{t(`common.planType.${plan.type}`)}</Badge>
            {plan.artSalonSubType && (
              <Badge variant="default">{t(`common.artSalonSubType.${plan.artSalonSubType}`)}</Badge>
            )}
            {plan.sessionMedium && (
              <Badge variant="outline">
                {plan.sessionMedium === 'VIDEO' ? <Video className="h-3 w-3 inline mr-1" /> : null}
                {t(`common.medium.${plan.sessionMedium}`)}
              </Badge>
            )}
            {(isOwner || isAdmin) && (
              <Badge variant={statusVariant[plan.status] ?? 'default'}>
                {t(`common.planStatus.${plan.status}`)}
              </Badge>
            )}
            {plan.status === 'PUBLISHED' && isPastSignupDeadline && (
              <Badge variant="warning">
                {t('therapyPlans.detail.closedSignUp', 'Closed Sign Up')}
              </Badge>
            )}
            {isEnrolled && (
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                {t('therapyPlans.detail.enrolled')}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-stone-900">{planTitle}</h1>
          {planSlogan && (
            <p className="text-stone-500 mt-1 italic">{planSlogan}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/therapy-plans/${plan.id}/edit`)}
            >
              {t('therapyPlans.detail.edit')}
            </Button>
          )}
          {canSubmit && (
            <Button
              size="sm"
              loading={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {t('therapyPlans.detail.submitForReview')}
            </Button>
          )}
          {canArchive && (
            <Button
              size="sm"
              variant="outline"
              loading={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
            >
              {t('therapyPlans.detail.archive')}
            </Button>
          )}
          {plan.status === 'PUBLISHED' && (
            <a
              href={getTherapyPlanIcsUrl(plan.id)}
              download={`${planTitle}.ics`}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-md border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 hover:border-teal-400 hover:text-teal-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              {t('therapyPlans.detail.exportIcs', 'Add to My Calendar (Export)')}
            </a>
          )}
        </div>
      </div>

      {/* Sign-up panel / Workflow */}
      {(canSignUp || canCancelSignup) && (
        <div className="mb-6">
          {isCheckingOut && priceDisplay ? (
            <StandardPaymentWorkflow
              type={plan.type as any}
              data={{
                title: planTitle,
                price: Number(plan.price),
                startTime: plan.startTime,
                endTime: plan.endTime || undefined,
                location: plan.location || undefined,
                therapistName: therapistUser ? `${therapistUser.firstName} ${therapistUser.lastName}` : '',
                therapistAvatar: therapistUser?.avatarUrl || undefined,
                participantId: signupResult?.participantId || myParticipation?.id || undefined,
              }}
              onComplete={async (method: PaymentMethod) => {
                if (!signupResult?.participantId && !myParticipation?.id) {
                  const res = await signupMutation.mutateAsync();
                  return { participantId: res.participant.id };
                }
                return { participantId: signupResult?.participantId || myParticipation?.id };
              }}
              onCancel={() => {
                setIsCheckingOut(false);
                setSignupResult(null);
              }}
            />
          ) : (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-teal-800">
                    {isEnrolled
                      ? t('therapyPlans.detail.enrolled')
                      : isPendingPayment
                        ? t('payment.waitingForPayment', 'Waiting for Payment')
                        : isFreePlan
                          ? t('therapyPlans.detail.signUpFree', 'Sign Up for Free')
                          : t('therapyPlans.detail.signUp')}
                  </p>
                  {priceDisplay && !isEnrolled && !isPendingPayment && (
                    <p className="text-2xl font-bold text-teal-700 mt-0.5">{priceDisplay}</p>
                  )}
                  {signupError && (
                    <p className="text-sm text-rose-600 mt-1">{signupError}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {canSignUp && (
                    <Button
                      onClick={() => {
                        if (!user) {
                          navigate('/login', { state: { from: `/therapy-plans/${id}` } });
                          return;
                        }
                        if (isPayablePlan) {
                          setIsCheckingOut(true);
                        } else {
                          signupMutation.mutate();
                        }
                      }}
                    >
                      {!user
                        ? isFreePlan
                          ? t('therapyPlans.detail.signInToSignUpFree', 'Sign In to Sign Up for Free')
                          : t('therapyPlans.detail.signInToSignUp', 'Sign In to Sign Up')
                        : priceDisplay
                        ? `${t('therapyPlans.detail.signUp')} \u00B7 ${priceDisplay}`
                        : t('therapyPlans.detail.signUpFree', 'Sign Up for Free')}
                    </Button>
                  )}
                  {(canCancelSignup || isPendingPayment) && (
                    <Button
                      variant="outline"
                      loading={cancelSignupMutation.isPending}
                      disabled={cancelSignupMutation.isPending}
                      onClick={() => {
                        setSignupResult(null);
                        setIsCheckingOut(false);
                        cancelSignupMutation.mutate();
                      }}
                    >
                      {t('common.cancel', 'Cancel')}
                    </Button>
                  )}
                  {isPendingPayment && (
                    <Button onClick={() => setIsCheckingOut(true)}>
                      {t('payment.completeYourPayment', 'Complete Payment')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rejection notice */}
      {plan.status === 'REJECTED' && plan.rejectionReason && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-rose-700">{t('therapyPlans.detail.rejectedBanner')}</p>
          <p className="text-sm text-rose-600 mt-0.5">{plan.rejectionReason}</p>
        </div>
      )}

      {/* Introduction */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-2">
          {t('therapyPlans.detail.introduction')}
        </h2>
        <p className="text-stone-700 whitespace-pre-wrap">{planIntroduction}</p>
      </section>

      {/* PDF attachment */}
      {plan.attachmentUrl && (
        <div className="mb-6">
          <a
            href={plan.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 underline"
          >
            <FileText className="h-4 w-4 flex-shrink-0" />
            {plan.attachmentName ?? t('therapyPlans.detail.downloadAttachment', 'Download attachment')}
          </a>
        </div>
      )}

      {/* Schedule 鈥?PlanSchedule if events exist, else single date card */}
      {plan.events && plan.events.length > 0 ? (
        <PlanSchedule mode="view" events={plan.events} planType={plan.type} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="flex items-start gap-3 bg-stone-50 rounded-lg p-4">
            <Calendar className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-stone-500 font-medium uppercase tracking-wide mb-0.5">
                {t('therapyPlans.detail.startTime')}
              </p>
              <p className="text-sm text-stone-800">
                {new Date(plan.startTime).toLocaleString()}
              </p>
              {plan.endTime && (
                <p className="text-xs text-stone-500 mt-0.5">
                  {t('therapyPlans.detail.endTime')}: {new Date(plan.endTime).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="flex items-start gap-3 bg-stone-50 rounded-lg p-4">
          <MapPin className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wide mb-0.5">
              {t('therapyPlans.detail.location')}
            </p>
            <p className="text-sm text-stone-800">{plan.location}</p>
          </div>
        </div>

        {plan.maxParticipants != null && (
          <div className="flex items-start gap-3 bg-stone-50 rounded-lg p-4">
            <Users className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-stone-500 font-medium uppercase tracking-wide mb-0.5">
                {t('therapyPlans.detail.maxParticipants')}
              </p>
              <p className="text-sm text-stone-800">
                {plan._count?.participants != null
                  ? `${plan._count.participants} / ${plan.maxParticipants}`
                  : plan.maxParticipants}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 bg-stone-50 rounded-lg p-4">
          <Phone className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wide mb-0.5">
              {t('therapyPlans.detail.contactInfo')}
            </p>
            <p className="text-sm text-stone-800 break-all">{plan.contactInfo}</p>
          </div>
        </div>
      </div>

      {/* Therapist profile */}
      {therapistUser && (
        <section className="border-t border-stone-100 pt-6">
          <div className="flex items-center gap-4">
            <Avatar
              firstName={therapistUser.firstName}
              lastName={therapistUser.lastName}
              src={therapistUser.avatarUrl}
              size="lg"
            />
            <div>
              <p className="font-semibold text-stone-900">
                {therapistUser.firstName} {therapistUser.lastName}
              </p>
              {therapist?.locationCity && (
                <p className="text-sm text-stone-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {therapist.locationCity}
                </p>
              )}
              {therapist?.bio && (
                <p className="text-sm text-stone-600 mt-1 line-clamp-3">{therapist.bio}</p>
              )}
              {canFollowOwner && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant={followStatus?.isFollowing ? 'outline' : 'primary'}
                    onClick={() => {
                      if (followStatus?.isFollowing) {
                        unfollowMutation.mutate();
                      } else {
                        followMutation.mutate();
                      }
                    }}
                    loading={followMutation.isPending || unfollowMutation.isPending}
                  >
                    {followStatus?.isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!followStatus?.isFollowing}
                    onClick={() => navigate(`/dashboard/member?tab=messages&conversation=${therapistUserId}`)}
                  >
                    Message
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};



