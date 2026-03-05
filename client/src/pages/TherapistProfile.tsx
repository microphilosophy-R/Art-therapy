import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Clock, Video, Star, Shield, ChevronLeft, Calendar, QrCode, Globe, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getTherapist } from '../api/therapists';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { StarRating } from '../components/ui/StarRating';
import { PageLoader } from '../components/ui/Spinner';
import { getSpecialtyColor } from '../utils/formatters';
import { useAuthStore } from '../store/authStore';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { listTherapyPlans } from '../api/therapyPlans';
import type { TherapyPlan } from '../types';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import { cn } from '../utils/cn';
import { getPosterUrl } from '../utils/therapyPlanUtils';
import { followUser, getFollowStatus, unfollowUser } from '../api/follows';

export const TherapistProfile = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'showcase' | 'schedule' | 'about' | 'reviews'>('showcase');
  const [showQrModal, setShowQrModal] = useState(false);

  const { data: therapist, isLoading } = useQuery({
    queryKey: ['therapist', id],
    queryFn: () => getTherapist(id!),
    enabled: !!id,
  });

  const { data: therapistPlansResponse, isLoading: plansLoading } = useQuery({
    queryKey: ['therapist-plans', id],
    queryFn: () => listTherapyPlans({ therapistId: id, status: 'PUBLISHED' }),
    enabled: !!id,
  });
  const targetUserId = therapist?.user?.id;
  const canFollow = !!(isAuthenticated && currentUser?.role === 'MEMBER' && targetUserId && targetUserId !== currentUser.id);

  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', targetUserId],
    queryFn: () => getFollowStatus(targetUserId!),
    enabled: canFollow,
  });

  const followMutation = useMutation({
    mutationFn: () => followUser(targetUserId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follow-status', targetUserId] }),
  });
  const unfollowMutation = useMutation({
    mutationFn: () => unfollowUser(targetUserId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follow-status', targetUserId] }),
  });

  if (isLoading) return <PageLoader />;

  if (!therapist) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-500">{t('therapists.profile.notFound')}</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/therapists')}>
            {t('therapists.profile.backToDirectory')}
          </Button>
        </div>
      </div>
    );
  }

  const {
    user, bio, specialties, sessionPrice, sessionLength, locationCity,
    rating, reviewCount, isAccepting, refundPolicy, featuredImageUrl,
    socialMediaLink, qrCodeUrl,
    galleryImages, consultEnabled, hourlyConsultFee,
  } = therapist;

  const handleBook = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/book/${id}` } });
    } else {
      navigate(`/book/${id}`);
    }
  };

  const tabLabels: Record<'showcase' | 'schedule' | 'about' | 'reviews', string> = {
    showcase: t('shop.artist.showcase.title', 'Showcase'),
    schedule: t('therapists.profile.scheduleTab', 'Schedule'),
    about: t('therapists.profile.about'),
    reviews: t('therapists.profile.reviewsTab'),
  };

  const calendarEvents = (therapistPlansResponse?.data ?? []).flatMap((plan: TherapyPlan) => {
    return (plan.events || []).map((evt) => {
      let displayTitle = plan.title;
      const isSensitive = plan.type === 'PERSONAL_CONSULT' || plan.type === 'GROUP_CONSULT';

      if (isSensitive) {
        displayTitle = t(`common.planType.${plan.type}`);
      }

      return {
        id: evt.id,
        title: displayTitle,
        start: evt.startTime,
        end: evt.endTime || undefined,
        backgroundColor: isSensitive ? '#14b8a6' : '#8b5cf6',
        borderColor: isSensitive ? '#14b8a6' : '#8b5cf6',
      };
    });
  });

  return (
    <div className="bg-stone-50 min-h-screen pb-20">
      {/* Top bar */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('therapists.profile.back')}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Profile header card */}
            <Card className="border border-stone-200 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row gap-0">
                  {/* Portrait */}
                  <div className="sm:w-48 shrink-0">
                    {featuredImageUrl ? (
                      <img
                        src={featuredImageUrl}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-full h-64 sm:h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-64 sm:h-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center">
                        <Avatar
                          firstName={user.firstName}
                          lastName={user.lastName}
                          src={user.avatarUrl}
                          size="xl"
                          className="h-20 w-20 ring-4 ring-white/30"
                        />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-6 space-y-4">
                    <div>
                      <h1 className="text-2xl font-semibold text-stone-900">
                        {user.firstName} {user.lastName}
                      </h1>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {rating !== undefined && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-medium text-stone-800">{rating.toFixed(1)}</span>
                            <span className="text-stone-400">({reviewCount ?? 0})</span>
                          </div>
                        )}
                        <span className="flex items-center gap-1 text-sm text-stone-500">
                          <MapPin className="h-3.5 w-3.5 text-teal-600" /> {locationCity}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {specialties.map((s) => (
                        <span key={s} className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', getSpecialtyColor(s))}>
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100">
                        <Clock className="h-3.5 w-3.5 text-teal-600" />
                        {t('therapists.profile.minSession', { n: sessionLength })}
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100">
                        <Video className="h-3.5 w-3.5 text-teal-600" />
                        {t('therapists.profile.videoAvailable')}
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                        <Shield className="h-3.5 w-3.5" />
                        {t('therapists.profile.verified')}
                      </span>
                      {isAccepting ? (
                        <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                          {t('therapists.profile.acceptingClients')}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                          {t('therapists.profile.notAccepting')}
                        </span>
                      )}
                    </div>

                    {(socialMediaLink || qrCodeUrl) && (
                      <div className="flex items-center gap-4 pt-1">
                        {socialMediaLink && (
                          <a href={socialMediaLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-teal-700 transition-colors">
                            <Globe className="h-3.5 w-3.5" />
                            {t('therapists.profile.socialMedia')}
                          </a>
                        )}
                        {qrCodeUrl && (
                          <button onClick={() => setShowQrModal(true)}
                            className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-teal-700 transition-colors">
                            <QrCode className="h-3.5 w-3.5" />
                            {t('therapists.profile.qrCode')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Tabs */}
            <div className="space-y-4">
              <div className="flex gap-6 border-b border-stone-200">
                {(['showcase', 'schedule', 'about', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'pb-3 text-sm font-semibold transition-colors relative',
                      activeTab === tab ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
                    )}
                  >
                    {tabLabels[tab]}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <div>
                {activeTab === 'showcase' && (
                  <div className="space-y-6">
                    {/* Featured Plans Showcase */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {therapistPlansResponse?.data?.slice(0, 4).map((plan: TherapyPlan) => (
                        <Link key={plan.id} to={`/therapy-plans/${plan.id}`} className="group relative aspect-[16/9] rounded-2xl overflow-hidden border border-stone-200">
                          <img src={getPosterUrl(plan)} alt={plan.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <p className="text-white font-bold text-sm truncate">{plan.title}</p>
                            <p className="text-white/70 text-[10px]">{t(`common.planType.${plan.type}`)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {(!therapistPlansResponse?.data || therapistPlansResponse.data.length === 0) && (
                      <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-stone-200 text-stone-400">
                        <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">{t('shop.artist.showcase.noPlans')}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'schedule' && (
                  <Card className="border border-stone-200 shadow-sm rounded-2xl">
                    <CardContent className="p-6">
                      {plansLoading ? (
                        <div className="flex justify-center py-16"><PageLoader /></div>
                      ) : (
                        <FullCalendar
                          plugins={[timeGridPlugin, dayGridPlugin]}
                          initialView="timeGridWeek"
                          locale={i18n.language.startsWith('zh') ? zhCnLocale : undefined}
                          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
                          events={calendarEvents}
                          height="auto"
                          nowIndicator
                          slotMinTime="07:00:00"
                          slotMaxTime="21:00:00"
                          eventContent={(arg) => (
                            <div className="overflow-hidden px-1.5 py-0.5 text-xs leading-tight rounded">
                              <div className="font-semibold truncate">{arg.event.title}</div>
                            </div>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'about' && (
                  <Card className="border border-stone-200 shadow-sm rounded-2xl">
                    <CardContent className="p-6 space-y-6">
                      <div>
                        <h2 className="text-base font-semibold text-stone-900 mb-3">
                          {t('therapists.profile.aboutSection')}
                        </h2>
                        <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{bio}</p>
                      </div>

                      {galleryImages && galleryImages.length > 0 && (
                        <div>
                          <h2 className="text-base font-semibold text-stone-900 mb-3">
                            {t('therapists.profile.gallery')}
                          </h2>
                          <div className="grid grid-cols-3 gap-2">
                            {galleryImages.map((img) => (
                              <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-stone-100">
                                <img src={img.url} alt="" className="h-full w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {refundPolicy && (
                        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
                          <h3 className="text-sm font-semibold text-stone-800 mb-1.5">
                            {t('therapists.profile.cancellationPolicy')}
                          </h3>
                          <p className="text-sm text-stone-600 leading-relaxed">{refundPolicy.policyDescription}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'reviews' && (
                  <Card className="border border-stone-200 shadow-sm rounded-2xl">
                    <CardContent className="p-6">
                      {reviewCount && reviewCount > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 pb-4 border-b border-stone-100">
                            <span className="text-4xl font-bold text-stone-900">{rating?.toFixed(1)}</span>
                            <div>
                              <StarRating rating={rating ?? 0} />
                              <p className="text-sm text-stone-500 mt-0.5">{reviewCount} {t('therapists.profile.reviews')}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <Star className="h-10 w-10 mx-auto mb-3 text-stone-200" />
                          <p className="text-sm text-stone-400">{t('therapists.profile.noReviews')}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Booking sidebar */}
          <div className="lg:sticky lg:top-8 space-y-4">
            <Card className="border border-stone-200 shadow-sm rounded-2xl">
              <CardContent className="p-6 space-y-5">
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-widest mb-1">
                    {t('therapists.profile.perSession')}
                  </p>
                  <PriceDisplay
                    cnyAmount={sessionPrice}
                    className="text-3xl font-semibold text-stone-900"
                  />
                </div>

                <Button
                  className="w-full rounded-xl text-sm font-semibold"
                  disabled={!isAccepting}
                  onClick={handleBook}
                >
                  <Calendar className="h-4 w-4" />
                  {isAccepting ? t('therapists.profile.bookSession') : t('therapists.profile.notAvailable')}
                </Button>
                {!isAuthenticated && isAccepting && (
                  <p className="text-xs text-center text-stone-400">
                    {t('therapists.profile.signInToBook')}
                  </p>
                )}

                {canFollow && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={followStatus?.isFollowing ? 'outline' : 'primary'}
                      size="sm"
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
                      variant="outline"
                      size="sm"
                      disabled={!followStatus?.isFollowing}
                      onClick={() => navigate(`/dashboard/member?tab=messages&conversation=${targetUserId}`)}
                    >
                      Message
                    </Button>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-stone-100">
                  {[
                    { icon: Clock, text: t('therapists.profile.minuteSession', { n: sessionLength }) },
                    { icon: Video, text: t('therapists.profile.videoOrInPerson') },
                    { icon: Shield, text: t('therapists.profile.securePayment') },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-stone-600">
                      <item.icon className="h-4 w-4 text-teal-600 shrink-0" />
                      {item.text}
                    </div>
                  ))}
                </div>

                {consultEnabled && (
                  <div className="pt-3 border-t border-stone-100 space-y-1">
                    <p className="text-xs font-medium text-teal-700 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" />
                      {t('therapists.profile.consultAvailable')}
                    </p>
                    {hourlyConsultFee && (
                      <p className="text-xs text-stone-500">
                        {t('therapists.profile.hourlyFee', { fee: Number(hourlyConsultFee).toFixed(0) })}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl space-y-4 text-center">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-stone-900">{t('therapists.profile.qrCode')}</h3>
              <button onClick={() => setShowQrModal(false)} className="p-1.5 rounded-full hover:bg-stone-100 transition-colors">
                <X className="h-4 w-4 text-stone-500" />
              </button>
            </div>
            <div className="aspect-square w-full rounded-xl overflow-hidden border border-stone-100 bg-stone-50 p-3">
              <img src={qrCodeUrl!} alt="QR Code" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-stone-400">{t('therapists.profile.socialMedia')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

