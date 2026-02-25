import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Heart, FileText, Bell } from 'lucide-react';
import { getAppointments, cancelAppointment } from '../../api/appointments';
import { listReceivedForms, type ClientForm } from '../../api/forms';
import { AppointmentCard } from '../../components/appointments/AppointmentCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';

type Tab = 'upcoming' | 'past' | 'forms';

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
    enabled: tab !== 'forms',
  });

  const { data: formsData } = useQuery({
    queryKey: ['received-forms'],
    queryFn: () => listReceivedForms(1),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const pendingForms = formsData?.data.filter((f: ClientForm) => f.status === 'SENT') ?? [];
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

        {/* Forms notification banner */}
        {pendingForms.length > 0 && tab !== 'forms' && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-teal-50 border border-teal-200 px-4 py-3">
            <Bell className="h-5 w-5 text-teal-600 shrink-0" />
            <p className="text-sm text-teal-800 flex-1">
              You have <strong>{pendingForms.length}</strong> form{pendingForms.length > 1 ? 's' : ''} waiting for your response.
            </p>
            <button onClick={() => setTab('forms')} className="text-sm font-medium text-teal-700 hover:underline shrink-0">View forms</button>
          </div>
        )}

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

        {/* Tabs + content */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <div className="flex gap-1">
              {(['upcoming', 'past', 'forms'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    tab === t
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {t === 'forms' ? 'My Forms' : t}
                  {t === 'forms' && pendingForms.length > 0 && (
                    <Badge variant="warning" className="ml-1.5 text-xs">{pendingForms.length}</Badge>
                  )}
                </button>
              ))}
            </div>
            {tab !== 'forms' && (
              <Link to="/therapists">
                <Button size="sm">Book session</Button>
              </Link>
            )}
          </div>

          <div className="p-6">
            {tab === 'forms' ? (
              (formsData?.data ?? []).length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No forms received yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(formsData?.data ?? []).map((form: ClientForm) => (
                    <div key={form.id} className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 hover:bg-stone-50">
                      <div>
                        <p className="text-sm font-medium text-stone-800">{form.title}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          From: {form.sender?.firstName} {form.sender?.lastName} &bull;{' '}
                          {form.status === 'SENT' ? (
                            <span className="text-amber-600 font-medium">Awaiting your response</span>
                          ) : (
                            <span className="text-teal-600">Submitted</span>
                          )}
                        </p>
                      </div>
                      {form.status === 'SENT' ? (
                        <Link to={`/forms/${form.id}`}>
                          <Button size="sm">Fill out</Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-stone-400">Completed</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : isLoading ? (
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
