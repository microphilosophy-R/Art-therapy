import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Calendar, Clock, Video, MapPin, LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAppointment } from '../../api/appointments';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { PageLoader } from '../../components/ui/Spinner';
import { formatDate, formatTime, formatPrice } from '../../utils/formatters';

export const BookingConfirmation = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = params.get('appointmentId');
  const redirectStatus = params.get('redirect_status');

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => getAppointment(appointmentId!),
    enabled: !!appointmentId && redirectStatus === 'succeeded',
    // Poll until CONFIRMED
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'CONFIRMED' ? false : 3000;
    },
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!appointmentId) navigate('/');
  }, [appointmentId, navigate]);

  if (redirectStatus !== 'succeeded') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <XCircle className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-stone-900 mb-2">{t('booking.confirmation.paymentFailed')}</h1>
          <p className="text-stone-500 mb-6">
            {t('booking.confirmation.paymentFailedDesc')}
          </p>
          <Button onClick={() => navigate(-1)}>{t('booking.confirmation.tryAgain')}</Button>
        </div>
      </div>
    );
  }

  if (isLoading || appointment?.status !== 'CONFIRMED') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <PageLoader />
          <p className="text-stone-500 mt-4">{t('booking.confirmation.confirming')}</p>
        </div>
      </div>
    );
  }

  const { therapist, startTime, endTime, medium, payment } = appointment;
  const person = therapist?.user;

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Success header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-teal-100 mb-4">
            <CheckCircle className="h-9 w-9 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">{t('booking.confirmation.confirmed')}</h1>
          <p className="text-stone-500 mt-1">
            {t('booking.confirmation.confirmedDesc')}
          </p>
        </div>

        {/* Receipt card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {person && (
              <div className="flex items-center gap-4 pb-4 border-b border-stone-100">
                <Avatar
                  firstName={person.firstName}
                  lastName={person.lastName}
                  src={person.avatarUrl}
                  size="lg"
                />
                <div>
                  <p className="font-semibold text-stone-900">
                    {person.firstName} {person.lastName}
                  </p>
                  <p className="text-sm text-stone-500">{t('booking.confirmation.artTherapist')}</p>
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-500">
                  <Calendar className="h-4 w-4" /> {t('booking.confirmation.date')}
                </span>
                <span className="font-medium text-stone-900">{formatDate(startTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-500">
                  <Clock className="h-4 w-4" /> {t('booking.confirmation.time')}
                </span>
                <span className="font-medium text-stone-900">
                  {formatTime(startTime)} – {formatTime(endTime)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-500">
                  {medium === 'VIDEO'
                    ? <Video className="h-4 w-4" />
                    : <MapPin className="h-4 w-4" />}
                  {t('booking.confirmation.format')}
                </span>
                <span className="font-medium text-stone-900">
                  {medium === 'VIDEO' ? t('booking.confirmation.videoCall') : t('booking.confirmation.inPerson')}
                </span>
              </div>
              {payment && (
                <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                  <span className="font-semibold text-stone-900">{t('booking.confirmation.amountPaid')}</span>
                  <span className="font-bold text-teal-700">
                    {formatPrice(payment.amount / 100)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link to="/dashboard/client" className="flex-1">
            <Button className="w-full" size="lg">
              <LayoutDashboard className="h-4 w-4" /> {t('booking.confirmation.goToDashboard')}
            </Button>
          </Link>
          <Link to="/therapists" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              {t('booking.confirmation.browseTherapists')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
