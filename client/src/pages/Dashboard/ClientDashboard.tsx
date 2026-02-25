import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Heart } from 'lucide-react';
import { getAppointments, cancelAppointment } from '../../api/appointments';
import { AppointmentCard } from '../../components/appointments/AppointmentCard';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';

type Tab = 'upcoming' | 'past';

export const ClientDashboard = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'client', tab],
    queryFn: () =>
      getAppointments({
        status: tab === 'upcoming' ? ['PENDING', 'CONFIRMED'] : ['COMPLETED', 'CANCELLED'],
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const appointments = data?.data ?? [];

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-stone-500 mt-1">Manage your therapy sessions here.</p>
        </div>

        {/* Quick stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: Calendar,
              label: 'Upcoming sessions',
              value: data?.total ?? 0,
              color: 'text-teal-600 bg-teal-50',
            },
            {
              icon: Clock,
              label: 'Hours in therapy',
              value: '—',
              color: 'text-blue-600 bg-blue-50',
            },
            {
              icon: Heart,
              label: 'Therapists seen',
              value: '—',
              color: 'text-rose-500 bg-rose-50',
            },
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
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <div className="flex gap-1">
              {(['upcoming', 'past'] as Tab[]).map((t) => (
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
                </button>
              ))}
            </div>
            <Link to="/therapists">
              <Button size="sm">Book session</Button>
            </Link>
          </div>

          <div className="p-6">
            {isLoading ? (
              <PageLoader />
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-10 w-10 mx-auto text-stone-300 mb-3" />
                <p className="text-stone-500">No {tab} appointments.</p>
                {tab === 'upcoming' && (
                  <Link to="/therapists">
                    <Button variant="outline" className="mt-4">Find a therapist</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    perspective="client"
                    onCancel={tab === 'upcoming' ? (id) => cancelMutation.mutate(id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
