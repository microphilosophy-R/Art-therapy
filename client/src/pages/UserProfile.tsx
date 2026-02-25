import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Shield, CreditCard, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { getProfile, updateProfile, updatePassword, acceptPrivacy } from '../api/profile';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  nickname: z.string().max(50).optional(),
  age: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)), z.number().int().min(13).max(120).optional()),
  gender: z.string().optional(),
  phone: z.string().max(30).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string().min(1, 'Required'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

type Tab = 'info' | 'security' | 'payment' | 'privacy';

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
      type === 'success' ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
    }`}>
      {type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {message}
    </div>
  );
}

export function UserProfile() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const { updateUser } = useAuthStore();
  const qc = useQueryClient();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      nickname: profile?.nickname ?? '',
      age: profile?.age ?? undefined,
      gender: profile?.gender ?? '',
      phone: profile?.phone ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      updateUser({ firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone ?? undefined, avatarUrl: updated.avatarUrl ?? undefined });
      showToast(t('profile.personal.saveSuccess'), 'success');
    },
    onError: () => showToast(t('profile.personal.saveError'), 'error'),
  });

  const passwordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      passwordForm.reset();
      showToast(t('profile.security.success'), 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? t('profile.security.error'), 'error'),
  });

  const privacyMutation = useMutation({
    mutationFn: acceptPrivacy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      showToast(t('profile.privacyTab.success'), 'success');
    },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    profileMutation.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname || null,
      age: data.age ?? null,
      gender: data.gender || null,
      phone: data.phone || null,
    });
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    passwordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'info', label: t('profile.tabs.personal'), icon: User },
    { id: 'security', label: t('profile.tabs.security'), icon: Lock },
    { id: 'payment', label: t('profile.tabs.payment'), icon: CreditCard },
    { id: 'privacy', label: t('profile.tabs.privacy'), icon: Shield },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">{t('profile.title')}</h1>
          <p className="text-stone-500 mt-1">{t('profile.subtitle')}</p>
        </div>

        {toast && (
          <div className="mb-6">
            <Toast message={toast.message} type={toast.type} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-6">
          {/* Sidebar tabs */}
          <nav className="sm:w-48 shrink-0">
            <ul className="space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                      activeTab === id
                        ? 'bg-teal-50 text-teal-700 font-medium'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">

            {/* ── Personal Info ── */}
            {activeTab === 'info' && (
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
                <h2 className="text-base font-semibold text-stone-900">{t('profile.personal.title')}</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.firstName')}</label>
                    <input
                      {...profileForm.register('firstName')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="text-xs text-rose-600 mt-1">{profileForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.lastName')}</label>
                    <input
                      {...profileForm.register('lastName')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {profileForm.formState.errors.lastName && (
                      <p className="text-xs text-rose-600 mt-1">{profileForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.nickname')}</label>
                  <input
                    {...profileForm.register('nickname')}
                    placeholder={t('profile.personal.nicknamePlaceholder')}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.age')}</label>
                    <input
                      type="number"
                      {...profileForm.register('age')}
                      min={13}
                      max={120}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {profileForm.formState.errors.age && (
                      <p className="text-xs text-rose-600 mt-1">{profileForm.formState.errors.age.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.gender')}</label>
                    <select
                      {...profileForm.register('gender')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="">{t('profile.personal.genderOptions.preferNotToSay')}</option>
                      <option value="Female">{t('profile.personal.genderOptions.female')}</option>
                      <option value="Male">{t('profile.personal.genderOptions.male')}</option>
                      <option value="Non-binary">{t('profile.personal.genderOptions.nonBinary')}</option>
                      <option value="Genderqueer">{t('profile.personal.genderOptions.genderqueer')}</option>
                      <option value="Transgender">{t('profile.personal.genderOptions.transgender')}</option>
                      <option value="Other">{t('profile.personal.genderOptions.other')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.email')}</label>
                  <input
                    value={profile?.email ?? ''}
                    disabled
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 text-stone-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-stone-400 mt-1">{t('profile.personal.emailNote')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.phone')}</label>
                  <input
                    {...profileForm.register('phone')}
                    type="tel"
                    placeholder={t('profile.personal.phonePlaceholder')}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" loading={profileMutation.isPending}>
                    {t('common.save')}
                  </Button>
                </div>
              </form>
            )}

            {/* ── Security ── */}
            {activeTab === 'security' && (
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
                <h2 className="text-base font-semibold text-stone-900">{t('profile.security.title')}</h2>
                <p className="text-sm text-stone-500">{t('profile.security.subtitle')}</p>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.security.current')}</label>
                  <div className="relative">
                    <input
                      {...passwordForm.register('currentPassword')}
                      type={showCurrent ? 'text' : 'password'}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600">
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-rose-600 mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.security.new')}</label>
                  <div className="relative">
                    <input
                      {...passwordForm.register('newPassword')}
                      type={showNew ? 'text' : 'password'}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600">
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs text-rose-600 mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.security.confirm')}</label>
                  <input
                    {...passwordForm.register('confirmPassword')}
                    type="password"
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-rose-600 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" loading={passwordMutation.isPending}>{t('profile.security.submit')}</Button>
              </form>
            )}

            {/* ── Payment ── */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <h2 className="text-base font-semibold text-stone-900">{t('profile.payment.title')}</h2>
                <div className="rounded-xl bg-stone-50 border border-stone-200 p-5">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-stone-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-stone-700">{t('profile.payment.stripeTitle')}</p>
                      <p className="text-sm text-stone-500 mt-1">
                        {t('profile.payment.stripeDesc')}
                      </p>
                      <p className="text-sm text-stone-500 mt-2">
                        {t('profile.payment.stripeDesc2')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 text-sm text-teal-800">
                  <p className="font-medium mb-1">{t('profile.payment.privacyNote')}</p>
                  <p>{t('profile.payment.privacyDesc')} <Link to="/privacy" className="underline">{t('profile.payment.learnMore')}</Link></p>
                </div>
              </div>
            )}

            {/* ── Privacy ── */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-base font-semibold text-stone-900">{t('profile.privacyTab.title')}</h2>

                {profile?.privacyConsentAt ? (
                  <div className="flex items-center gap-3 rounded-xl bg-teal-50 border border-teal-200 p-4">
                    <CheckCircle className="h-5 w-5 text-teal-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-teal-800">{t('profile.privacyTab.accepted')}</p>
                      <p className="text-xs text-teal-600 mt-0.5">
                        {t('profile.privacyTab.acceptedOn', {
                          date: new Date(profile.privacyConsentAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                        })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">{t('profile.privacyTab.notAccepted')}</p>
                      <p className="text-sm text-amber-700 mt-1">
                        {t('profile.privacyTab.notAcceptedDesc')}
                      </p>
                      <Button
                        size="sm"
                        className="mt-3"
                        loading={privacyMutation.isPending}
                        onClick={() => privacyMutation.mutate()}
                      >
                        {t('profile.privacyTab.acceptBtn')}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3 text-sm text-stone-600">
                  <Link to="/privacy" className="inline-flex items-center gap-1.5 text-teal-700 font-medium hover:underline">
                    <Shield className="h-4 w-4" />
                    {t('profile.privacyTab.readPolicy')}
                  </Link>
                </div>

                <div className="border-t border-stone-100 pt-5">
                  <p className="text-sm font-medium text-stone-700 mb-2">{t('profile.privacyTab.dataRights')}</p>
                  <ul className="space-y-1.5 text-sm text-stone-500">
                    <li>• {t('profile.privacyTab.right1')}</li>
                    <li>• {t('profile.privacyTab.right2')}</li>
                    <li>• {t('profile.privacyTab.right3')}</li>
                    <li>• {t('profile.privacyTab.right4')}</li>
                  </ul>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
