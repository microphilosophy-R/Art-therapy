import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Shield, CheckCircle, AlertCircle, Eye, EyeOff, Camera, Briefcase, Image, Star, FileText, Upload, X, Globe, QrCode, Plus, Trash2, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { DatePicker } from '../components/ui/DatePicker';
import { getProfile, updateProfile, updatePassword, acceptPrivacy, uploadAvatar, uploadPortrait, addGalleryImage, deleteGalleryImage, type GalleryImage } from '../api/profile';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { validateFile } from '../utils/fileValidation';
import ReactFlagsSelect from 'react-flags-select';
import { AddressBookPanel } from '../components/profile/AddressBookPanel';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  nickname: z.string().max(50).optional(),
  birthday: z.string().optional(),
  gender: z.string().optional(),
  country: z.string().optional(),
  religion: z.string().optional(),
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

const professionalSchema = z.object({
  bio: z.string().max(1000).optional(),
  specialties: z.string().optional(),
  sessionPrice: z.number().optional(),
  sessionLength: z.number().optional(),
  locationCity: z.string().max(100).optional(),
  isAccepting: z.boolean().optional(),
  consultEnabled: z.boolean().optional(),
  hourlyConsultFee: z.number().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type ProfessionalForm = z.infer<typeof professionalSchema>;

type Tab = 'info' | 'security' | 'privacy' | 'addresses' | 'professional' | 'exhibition' | 'showcase' | 'preview';

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
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<Array<{ label: string; url: string }>>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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

  React.useEffect(() => {
    if (profile?.userProfile?.socialLinks) {
      const links = Object.entries(profile.userProfile.socialLinks)
        .filter(([_, url]) => url)
        .map(([label, url]) => ({ label, url: url as string }));
      setSocialLinks(links.length > 0 ? links : [{ label: '', url: '' }]);
    } else {
      setSocialLinks([{ label: '', url: '' }]);
    }
  }, [profile]);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      nickname: profile?.nickname ?? '',
      birthday: profile?.birthday ? new Date(profile.birthday).toISOString().split('T')[0] : '',
      gender: profile?.gender ?? '',
      country: profile?.country ?? '',
      religion: profile?.religion ?? '',
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

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      updateUser({ avatarUrl: data.avatarUrl });
      showToast(t('profile.personal.avatarSuccess', 'Avatar updated'), 'success');
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.message ?? t('profile.personal.avatarError', 'Failed to upload avatar'), 'error');
    },
  });

  const professionalForm = useForm<ProfessionalForm>({
    resolver: zodResolver(professionalSchema),
    values: {
      bio: (profile as any)?.userProfile?.bio ?? '',
      specialties: (profile as any)?.userProfile?.specialties?.join(', ') ?? '',
      sessionPrice: (profile as any)?.userProfile?.sessionPrice ?? undefined,
      sessionLength: (profile as any)?.userProfile?.sessionLength ?? undefined,
      locationCity: (profile as any)?.userProfile?.locationCity ?? '',
      isAccepting: (profile as any)?.userProfile?.isAccepting ?? false,
      consultEnabled: (profile as any)?.userProfile?.consultEnabled ?? false,
      hourlyConsultFee: (profile as any)?.userProfile?.hourlyConsultFee ?? undefined,
    },
  });

  const professionalMutation = useMutation({
    mutationFn: (data: ProfessionalForm) => updateProfile({
      bio: data.bio || null,
      specialties: data.specialties ? data.specialties.split(',').map((s: string) => s.trim()) : [],
      sessionPrice: data.sessionPrice ?? null,
      sessionLength: data.sessionLength ?? null,
      locationCity: data.locationCity || null,
      isAccepting: data.isAccepting,
      consultEnabled: data.consultEnabled,
      hourlyConsultFee: data.hourlyConsultFee ?? null,
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      showToast('Professional info saved', 'success');
    },
    onError: () => showToast('Failed to save', 'error'),
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post('/profile/submit-for-review'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      showToast('Profile submitted for review', 'success');
    },
    onError: () => showToast('Failed to submit', 'error'),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateFile(file, { maxMb: 5, accept: ['jpg', 'jpeg', 'png', 'webp', 'gif'] });
    if (error) { setAvatarError(error); e.target.value = ''; return; }
    setAvatarError(null);
    avatarMutation.mutate(file);
    e.target.value = '';
  };

  const onProfileSubmit = (data: ProfileForm) => {
    let age = null;
    if (data.birthday) {
      const birthDate = new Date(data.birthday);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }
    profileMutation.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname || null,
      birthday: data.birthday || null,
      age,
      gender: data.gender || null,
      country: data.country || null,
      religion: data.religion || null,
      phone: data.phone || null,
    });
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    passwordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  const hasTherapistOrCounselorCert = (profile as any)?.userProfile?.certificates?.some(
    (c: any) => (c.type === 'THERAPIST' || c.type === 'COUNSELOR') && c.status === 'APPROVED'
  );

  const STATUS_STYLE: Record<string, string> = {
    DRAFT: 'bg-stone-50 text-stone-600 border-stone-200',
    PENDING_REVIEW: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    APPROVED: 'bg-green-50 text-green-700 border-green-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'info', label: t('profile.tabs.info'), icon: User },
    { id: 'security', label: t('profile.tabs.security'), icon: Lock },
    { id: 'privacy', label: t('profile.tabs.privacy'), icon: Shield },
    { id: 'addresses', label: t('profile.tabs.addresses', 'Addresses'), icon: MapPin },
    ...(hasTherapistOrCounselorCert ? [{ id: 'professional' as Tab, label: t('profile.tabs.professional'), icon: Briefcase }] : []),
    { id: 'exhibition' as Tab, label: t('profile.tabs.exhibition'), icon: Image },
    { id: 'showcase' as Tab, label: t('profile.tabs.showcase'), icon: Star },
    { id: 'preview' as Tab, label: t('profile.tabs.preview'), icon: FileText },
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
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-stone-900">{t('profile.personal.title')}</h2>
                  <p className="text-sm text-stone-500 mt-1">{t('profile.personal.subtitle')}</p>
                </div>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <Avatar
                      firstName={profile?.firstName ?? ''}
                      lastName={profile?.lastName ?? ''}
                      src={profile?.avatarUrl ?? undefined}
                      size="xl"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={avatarMutation.isPending}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {t('profile.personal.changeAvatar', 'Change avatar')}
                    </Button>
                    {avatarError && <p className="text-xs text-rose-600 mt-1">{avatarError}</p>}
                    <p className="text-xs text-stone-400 mt-1">{t('profile.personal.avatarHint', 'jpg / png / webp · max 5 MB')}</p>
                  </div>
                </div>

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
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.birthday')}</label>
                    <DatePicker
                      value={profileForm.watch('birthday') || ''}
                      onChange={(val) => profileForm.setValue('birthday', val)}
                      placeholder={t('profile.personal.birthdayPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.age')}</label>
                    <input
                      type="text"
                      value={profile?.age || ''}
                      disabled
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 text-stone-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.gender')}</label>
                    <select
                      {...profileForm.register('gender')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="">{t('profile.personal.genderOptions.preferNotToSay')}</option>
                      <option value="Female">{t('profile.personal.genderOptions.female')}</option>
                      <option value="Male">{t('profile.personal.genderOptions.male')}</option>
                      <option value="Other">{t('profile.personal.genderOptions.other')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.religion')}</label>
                    <select
                      {...profileForm.register('religion')}
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="">{t('profile.personal.religionOptions.preferNotToSay')}</option>
                      <option value="Christianity">{t('profile.personal.religionOptions.christianity')}</option>
                      <option value="Islam">{t('profile.personal.religionOptions.islam')}</option>
                      <option value="Hinduism">{t('profile.personal.religionOptions.hinduism')}</option>
                      <option value="Buddhism">{t('profile.personal.religionOptions.buddhism')}</option>
                      <option value="Judaism">{t('profile.personal.religionOptions.judaism')}</option>
                      <option value="Sikhism">{t('profile.personal.religionOptions.sikhism')}</option>
                      <option value="Atheism">{t('profile.personal.religionOptions.atheism')}</option>
                      <option value="Agnosticism">{t('profile.personal.religionOptions.agnosticism')}</option>
                      <option value="Other">{t('profile.personal.religionOptions.other')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.personal.country')}</label>
                  <ReactFlagsSelect
                    selected={profileForm.watch('country') || ''}
                    onSelect={(code) => profileForm.setValue('country', code)}
                    searchable
                    searchPlaceholder={t('profile.personal.countryPlaceholder')}
                    className="w-full"
                  />
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
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-stone-900">{t('profile.security.title')}</h2>
                  <p className="text-sm text-stone-500 mt-1">{t('profile.security.subtitle')}</p>
                </div>

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

            {/* ── Privacy ── */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-stone-900">{t('profile.privacyTab.title')}</h2>
                  <p className="text-sm text-stone-500 mt-1">{t('profile.privacyTab.subtitle')}</p>
                </div>
                {profile?.privacyConsentAt ? (
                  <div className="flex items-center gap-3 rounded-xl bg-teal-50 border border-teal-200 p-4">
                    <CheckCircle className="h-5 w-5 text-teal-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-teal-800">{t('profile.privacyTab.accepted')}</p>
                      <p className="text-xs text-teal-600 mt-0.5">
                        {t('profile.privacyTab.acceptedOn')} {new Date(profile.privacyConsentAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">{t('profile.privacyTab.notAccepted')}</p>
                      <p className="text-sm text-amber-700 mt-1">{t('profile.privacyTab.pleaseAccept')}</p>
                      <Button size="sm" className="mt-3" loading={privacyMutation.isPending} onClick={() => privacyMutation.mutate()}>
                        {t('profile.privacyTab.acceptButton')}
                      </Button>
                    </div>
                  </div>
                )}
                <Link to="/privacy" className="inline-flex items-center gap-1.5 text-teal-700 font-medium hover:underline text-sm">
                  <Shield className="h-4 w-4" />
                  {t('profile.privacyTab.readPolicy')}
                </Link>
              </div>
            )}

            {/* ── Professional ── */}
            {activeTab === 'addresses' && (
              <AddressBookPanel
                title={t('profile.addresses.title', 'Delivery Addresses')}
                subtitle={t('profile.addresses.subtitle', 'Manage up to 6 delivery addresses for product orders.')}
              />
            )}

            {activeTab === 'professional' && hasTherapistOrCounselorCert && (
              <form onSubmit={professionalForm.handleSubmit((d) => professionalMutation.mutate(d))} className="space-y-5">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-stone-900">{t('profile.professional.title')}</h2>
                  <p className="text-sm text-stone-500 mt-1">{t('profile.professional.subtitle')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.professional.bio')}</label>
                  <textarea {...professionalForm.register('bio')} rows={4} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.professional.specialties')}</label>
                  <input {...professionalForm.register('specialties')} placeholder={t('profile.professional.specialtiesHint')} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.professional.sessionPrice')}</label>
                    <input type="number" {...professionalForm.register('sessionPrice', { valueAsNumber: true })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.professional.sessionLength')}</label>
                    <input type="number" {...professionalForm.register('sessionLength', { valueAsNumber: true })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.professional.locationCity')}</label>
                  <input {...professionalForm.register('locationCity')} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...professionalForm.register('isAccepting')} className="rounded" />
                  <span className="text-sm text-stone-700">{t('profile.professional.isAccepting')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...professionalForm.register('consultEnabled')} className="rounded" />
                  <span className="text-sm text-stone-700">{t('profile.professional.consultEnabled')}</span>
                </label>
                {professionalForm.watch('consultEnabled') && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.professional.hourlyConsultFee')}</label>
                    <input type="number" {...professionalForm.register('hourlyConsultFee', { valueAsNumber: true })} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                )}
                <Button type="submit" loading={professionalMutation.isPending}>{t('common.save')}</Button>
              </form>
            )}

            {/* ── Gallery ── */}
            {activeTab === 'exhibition' && (
              <div className="space-y-5">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-stone-900">{t('profile.exhibition.title')}</h2>
                  <p className="text-sm text-stone-500 mt-1">{t('profile.exhibition.subtitle')}</p>
                </div>

                {/* Portrait Upload */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">{t('profile.exhibition.featuredPortrait')}</label>
                  <div className="flex items-start gap-4">
                    {(profile as any)?.userProfile?.featuredImageUrl ? (
                      <div className="relative w-48 h-32 rounded-lg overflow-hidden bg-stone-100">
                        <img src={(profile as any).userProfile.featuredImageUrl} alt="Portrait" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-48 h-32 rounded-lg bg-stone-100 flex items-center justify-center">
                        <Image className="h-8 w-8 text-stone-400" />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        id="portrait-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const error = validateFile(file, { maxMb: 10, accept: ['jpg', 'jpeg', 'png', 'webp'] });
                          if (error) { showToast(error, 'error'); e.target.value = ''; return; }
                          uploadPortrait(file).then(() => {
                            qc.invalidateQueries({ queryKey: ['profile'] });
                            showToast(t('profile.exhibition.portraitUpdated'), 'success');
                          }).catch(() => showToast(t('profile.exhibition.uploadFailed'), 'error'));
                          e.target.value = '';
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('portrait-upload')?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('profile.exhibition.uploadPortrait')}
                      </Button>
                      <p className="text-xs text-stone-400 mt-1">{t('profile.exhibition.portraitHint')}</p>
                    </div>
                  </div>
                </div>

                {/* Gallery Images */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">{t('profile.exhibition.galleryImages')}</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {(profile as any)?.userProfile?.galleryImages?.map((img: GalleryImage) => (
                      <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 group">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => {
                            if (confirm(t('profile.exhibition.deleteConfirm'))) {
                              deleteGalleryImage(img.id).then(() => {
                                qc.invalidateQueries({ queryKey: ['profile'] });
                                showToast(t('profile.exhibition.imageDeleted'), 'success');
                              }).catch(() => showToast(t('profile.exhibition.uploadFailed'), 'error'));
                            }
                          }}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {((profile as any)?.userProfile?.galleryImages?.length || 0) < 9 && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        id="exhibition-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const error = validateFile(file, { maxMb: 10, accept: ['jpg', 'jpeg', 'png', 'webp'] });
                          if (error) { showToast(error, 'error'); e.target.value = ''; return; }
                          addGalleryImage(file).then(() => {
                            qc.invalidateQueries({ queryKey: ['profile'] });
                            showToast(t('profile.exhibition.imageAdded'), 'success');
                          }).catch(() => showToast(t('profile.exhibition.uploadFailed'), 'error'));
                          e.target.value = '';
                        }}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('exhibition-upload')?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('profile.exhibition.addImage')}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">{t('profile.exhibition.socialLinks')}</label>
                  <div className="space-y-2">
                    {socialLinks.map((link, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t('profile.exhibition.labelPlaceholder')}
                          value={link.label}
                          onChange={(e) => {
                            const updated = [...socialLinks];
                            updated[idx].label = e.target.value;
                            setSocialLinks(updated);
                          }}
                          className="w-1/3 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <input
                          type="url"
                          placeholder={t('profile.exhibition.urlPlaceholder')}
                          value={link.url}
                          onChange={(e) => {
                            const updated = [...socialLinks];
                            updated[idx].url = e.target.value;
                            setSocialLinks(updated);
                          }}
                          onBlur={() => {
                            const linksObj = socialLinks.reduce((acc, l) => {
                              if (l.label && l.url) acc[l.label] = l.url;
                              return acc;
                            }, {} as Record<string, string>);
                            updateProfile({ socialLinks: linksObj }).then(() => qc.invalidateQueries({ queryKey: ['profile'] }));
                          }}
                          className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = socialLinks.filter((_, i) => i !== idx);
                            setSocialLinks(updated.length > 0 ? updated : [{ label: '', url: '' }]);
                            const linksObj = updated.reduce((acc, l) => {
                              if (l.label && l.url) acc[l.label] = l.url;
                              return acc;
                            }, {} as Record<string, string>);
                            updateProfile({ socialLinks: linksObj }).then(() => qc.invalidateQueries({ queryKey: ['profile'] }));
                          }}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSocialLinks([...socialLinks, { label: '', url: '' }])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('profile.exhibition.addLink')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Showcase ── */}
            {activeTab === 'showcase' && (
              <div className="space-y-5">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-stone-900">{t('profile.showcase.title')}</h2>
                  <p className="text-sm text-stone-500 mt-1">{t('profile.showcase.subtitle')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('profile.showcase.displayName')}</label>
                  <input
                    type="text"
                    defaultValue={profile?.nickname || `${profile?.firstName} ${profile?.lastName}`}
                    onBlur={(e) => {
                      updateProfile({ nickname: e.target.value }).then(() => {
                        qc.invalidateQueries({ queryKey: ['profile'] });
                        showToast(t('profile.showcase.updated'), 'success');
                      }).catch(() => showToast(t('profile.showcase.updateFailed'), 'error'));
                    }}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(profile as any)?.userProfile?.isAccepting ?? false}
                      onChange={(e) => {
                        updateProfile({ isAccepting: e.target.checked } as any).then(() => {
                          qc.invalidateQueries({ queryKey: ['profile'] });
                          showToast(t('profile.showcase.updated'), 'success');
                        }).catch(() => showToast(t('profile.showcase.updateFailed'), 'error'));
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-stone-700">{t('profile.showcase.showAccepting')}</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── Public Preview ── */}
            {activeTab === 'preview' && (
              <div className="space-y-5">
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-stone-900">{t('profile.preview.title')}</h2>
                      <p className="text-sm text-stone-500 mt-1">{t('profile.preview.subtitle')}</p>
                    </div>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded border ${STATUS_STYLE[(profile as any)?.userProfile?.profileStatus || 'DRAFT']}`}>
                      {(profile as any)?.userProfile?.profileStatus || 'DRAFT'}
                    </span>
                  </div>
                </div>

                {(profile as any)?.userProfile?.rejectionReason && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-600">
                    <strong>Rejection reason:</strong> {(profile as any).userProfile.rejectionReason}
                  </div>
                )}

                {/* Profile Preview */}
                <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                  {/* Portrait Hero */}
                  {(profile as any)?.userProfile?.featuredImageUrl ? (
                    <div className="w-full h-48 bg-gradient-to-br from-teal-400 to-blue-500">
                      <img src={(profile as any).userProfile.featuredImageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-teal-400 to-blue-500" />
                  )}

                  <div className="p-6 space-y-4">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <Avatar firstName={profile?.firstName ?? ''} lastName={profile?.lastName ?? ''} src={profile?.avatarUrl} size="lg" />
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">{profile?.firstName} {profile?.lastName}</h3>
                        {(profile as any)?.userProfile?.locationCity && (
                          <p className="text-sm text-stone-500">{(profile as any).userProfile.locationCity}</p>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {(profile as any)?.userProfile?.bio && (
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900 mb-1">{t('profile.preview.about')}</h4>
                        <p className="text-sm text-stone-600 whitespace-pre-wrap">{(profile as any).userProfile.bio}</p>
                      </div>
                    )}

                    {/* Specialties */}
                    {(profile as any)?.userProfile?.specialties?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900 mb-2">{t('profile.preview.specialties')}</h4>
                        <div className="flex flex-wrap gap-2">
                          {(profile as any).userProfile.specialties.map((s: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gallery */}
                    {(profile as any)?.userProfile?.galleryImages?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900 mb-2">{t('profile.preview.exhibition')}</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {(profile as any).userProfile.galleryImages.map((img: GalleryImage) => (
                            <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-stone-100">
                              <img src={img.url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Social Links */}
                    {(profile as any)?.userProfile?.socialLinks && (
                      <div className="flex gap-3">
                        {(profile as any).userProfile.socialLinks.website && (
                          <a href={(profile as any).userProfile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 hover:underline flex items-center gap-1">
                            <Globe className="h-4 w-4" /> Website
                          </a>
                        )}
                        {(profile as any).userProfile.socialLinks.instagram && (
                          <a href={(profile as any).userProfile.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 hover:underline">
                            Instagram
                          </a>
                        )}
                        {(profile as any).userProfile.socialLinks.facebook && (
                          <a href={(profile as any).userProfile.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 hover:underline">
                            Facebook
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="border-t border-stone-200 pt-4">
                  <Button
                    onClick={() => submitMutation.mutate()}
                    loading={submitMutation.isPending}
                    disabled={(profile as any)?.userProfile?.profileStatus === 'PENDING_REVIEW'}
                  >
                    {t('profile.preview.submitForReview')}
                  </Button>
                  <p className="text-xs text-stone-500 mt-2">
                    {t('profile.preview.submitNote')}
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
