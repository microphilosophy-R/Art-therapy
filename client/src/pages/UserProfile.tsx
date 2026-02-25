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

const GENDER_OPTIONS = [
  'Prefer not to say',
  'Female',
  'Male',
  'Non-binary',
  'Genderqueer',
  'Transgender',
  'Other',
];

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
      showToast('Profile updated successfully.', 'success');
    },
    onError: () => showToast('Failed to update profile.', 'error'),
  });

  const passwordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      passwordForm.reset();
      showToast('Password changed successfully.', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed to change password.', 'error'),
  });

  const privacyMutation = useMutation({
    mutationFn: acceptPrivacy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      showToast('Privacy terms accepted.', 'success');
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
    { id: 'info', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'privacy', label: 'Privacy', icon: Shield },
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
          <h1 className="text-2xl font-bold text-stone-900">Account Settings</h1>
          <p className="text-stone-500 mt-1">Manage your personal information and account preferences</p>
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
                <h2 className="text-base font-semibold text-stone-900">Personal Information</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">First Name</label>
                    <input
                      {...profileForm.register('firstName')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="text-xs text-rose-600 mt-1">{profileForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Last Name</label>
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
                  <label className="block text-sm font-medium text-stone-700 mb-1">Nickname <span className="text-stone-400 font-normal">(optional)</span></label>
                  <input
                    {...profileForm.register('nickname')}
                    placeholder="How would you like to be called?"
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Age <span className="text-stone-400 font-normal">(optional)</span></label>
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
                    <label className="block text-sm font-medium text-stone-700 mb-1">Gender <span className="text-stone-400 font-normal">(optional)</span></label>
                    <select
                      {...profileForm.register('gender')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="">Prefer not to say</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
                  <input
                    value={profile?.email ?? ''}
                    disabled
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 text-stone-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-stone-400 mt-1">Email cannot be changed. Contact support if needed.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Phone <span className="text-stone-400 font-normal">(optional)</span></label>
                  <input
                    {...profileForm.register('phone')}
                    type="tel"
                    placeholder="+1 555-000-0000"
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" loading={profileMutation.isPending}>
                    Save Changes
                  </Button>
                </div>
              </form>
            )}

            {/* ── Security ── */}
            {activeTab === 'security' && (
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
                <h2 className="text-base font-semibold text-stone-900">Change Password</h2>
                <p className="text-sm text-stone-500">Choose a strong password of at least 8 characters.</p>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Current Password</label>
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
                  <label className="block text-sm font-medium text-stone-700 mb-1">New Password</label>
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
                  <label className="block text-sm font-medium text-stone-700 mb-1">Confirm New Password</label>
                  <input
                    {...passwordForm.register('confirmPassword')}
                    type="password"
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-rose-600 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" loading={passwordMutation.isPending}>Update Password</Button>
              </form>
            )}

            {/* ── Payment ── */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <h2 className="text-base font-semibold text-stone-900">Payment Methods</h2>
                <div className="rounded-xl bg-stone-50 border border-stone-200 p-5">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-stone-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-stone-700">Secure Payment via Stripe</p>
                      <p className="text-sm text-stone-500 mt-1">
                        Your payment information is handled exclusively by Stripe, a PCI DSS Level 1 certified payment processor.
                        ArtTherapy never stores your raw card number, CVV, or full card details on our servers.
                      </p>
                      <p className="text-sm text-stone-500 mt-2">
                        Payment methods are saved securely in your Stripe customer profile and can be managed during checkout.
                        Each session payment is processed at the time of booking.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 text-sm text-teal-800">
                  <p className="font-medium mb-1">Privacy Note on Payments</p>
                  <p>Platform fees are 15% per session. A record of each transaction (amount, date, therapist) is stored for your receipt history and is protected under our <Link to="/privacy" className="underline">Privacy Policy</Link>. Payment details visible to therapists are limited to session confirmation — they never see your full card information.</p>
                </div>
              </div>
            )}

            {/* ── Privacy ── */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h2 className="text-base font-semibold text-stone-900">Privacy & Consent</h2>

                {profile?.privacyConsentAt ? (
                  <div className="flex items-center gap-3 rounded-xl bg-teal-50 border border-teal-200 p-4">
                    <CheckCircle className="h-5 w-5 text-teal-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-teal-800">Privacy Terms Accepted</p>
                      <p className="text-xs text-teal-600 mt-0.5">
                        Accepted on {new Date(profile.privacyConsentAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Privacy Terms Not Yet Accepted</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Please review and accept our privacy terms to enable all features.
                      </p>
                      <Button
                        size="sm"
                        className="mt-3"
                        loading={privacyMutation.isPending}
                        onClick={() => privacyMutation.mutate()}
                      >
                        Accept Privacy Terms
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3 text-sm text-stone-600">
                  <p>You can review our full privacy practices at any time:</p>
                  <Link to="/privacy" className="inline-flex items-center gap-1.5 text-teal-700 font-medium hover:underline">
                    <Shield className="h-4 w-4" />
                    Read Privacy Policy & Terms
                  </Link>
                </div>

                <div className="border-t border-stone-100 pt-5">
                  <p className="text-sm font-medium text-stone-700 mb-2">Your Data Rights</p>
                  <ul className="space-y-1.5 text-sm text-stone-500">
                    <li>• You may request a copy of your data by contacting support</li>
                    <li>• You may request deletion of your account and data</li>
                    <li>• Session notes and therapy records are subject to legal retention requirements (minimum 6 years)</li>
                    <li>• Payment records are retained per PCI DSS requirements</li>
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
