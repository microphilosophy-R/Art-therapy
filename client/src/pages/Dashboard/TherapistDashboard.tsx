import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, DollarSign, Users, ExternalLink, AlertCircle } from 'lucide-react';
import { getAppointments, updateAppointmentStatus } from '../../api/appointments';
import { getConnectStatus, startConnectOnboarding } from '../../api/payments';
import { AppointmentCard } from '../../components/appointments/AppointmentCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';

type Tab = 'pending' | 'upcoming' | 'past';

export const TherapistDashboard = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'therapist', tab],
    queryFn: () =>
      getAppointments({
        status:
          tab === 'pending'
            ? ['PENDING']
            : tab === 'upcoming'
            ? ['CONFIRMED']
            : ['COMPLETED', 'CANCELLED'],
      }),
  });

  const { data: connectStatus, isLoading: loadingConnect } = useQuery({
    queryKey: ['connect-status'],
    queryFn: getConnectStatus,
  });

  const onboardMutation = useMutation({
    mutationFn: startConnectOnboarding,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => updateAppointmentStatus(id, 'CONFIRMED'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const appointments = data?.data ?? [];

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-stone-500 mt-1">Manage your sessions and earnings.</p>
        </div>

        {/* Stripe Connect banner */}
        {!loadingConnect && connectStatus?.status !== 'ACTIVE' && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Connect your bank account to receive payments
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Clients can book but funds won't be transferred until your Stripe account is active.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => onboardMutation.mutate()}
              loading={onboardMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Set up payouts
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Calendar, label: 'Sessions this month', value: '—', color: 'text-teal-600 bg-teal-50' },
            { icon: DollarSign, label: 'Earnings this month', value: '—', color: 'text-green-600 bg-green-50' },
            { icon: Users, label: 'Active clients', value: '—', color: 'text-blue-600 bg-blue-50' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-stone-200 p-5 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{value}</p>
                <p className="text-xs text-stone-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-wrap gap-3">
            <div className="flex gap-1">
              {(['pending', 'upcoming', 'past'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    tab === t
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {t}
                  {t === 'pending' && data?.total ? (
                    <Badge variant="warning" className="ml-1.5 text-xs">
                      {data.total}
                    </Badge>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <PageLoader />
            ) : appointments.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No {tab} appointments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div key={appt.id}>
                    <AppointmentCard
                      appointment={appt}
                      perspective="therapist"
                    />
                    {tab === 'pending' && appt.status === 'PENDING' && (
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => confirmMutation.mutate(appt.id)}
                          loading={confirmMutation.isPending}
                        >
                          Confirm session
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
