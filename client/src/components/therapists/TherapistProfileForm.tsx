import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Image, Link as LinkIcon, QrCode, Upload, X, CheckCircle } from 'lucide-react';
import { updateTherapistProfile } from '../../api/therapists';
import { uploadFile } from '@/api/upload';
import { updateProfileSchema, type UpdateProfileInput } from '../../../../server/src/schemas/therapist.schemas';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { validateFile } from '../../utils/fileValidation';
import type { TherapistProfile } from '../../types';

interface TherapistProfileFormProps {
    profile: TherapistProfile;
}

export const TherapistProfileForm = ({ profile }: TherapistProfileFormProps) => {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [featuredImageError, setFeaturedImageError] = useState<string | null>(null);
    const [qrCodeError, setQrCodeError] = useState<string | null>(null);
    const featuredImageInputRef = useRef<HTMLInputElement>(null);
    const qrCodeInputRef = useRef<HTMLInputElement>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<UpdateProfileInput>({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: {
            bio: profile.bio,
            specialties: profile.specialties,
            sessionPrice: Number(profile.sessionPrice),
            sessionLength: profile.sessionLength,
            locationCity: profile.locationCity,
            isAccepting: profile.isAccepting,
            featuredImageUrl: profile.featuredImageUrl || '',
            socialMediaLink: profile.socialMediaLink || '',
            qrCodeUrl: profile.qrCodeUrl || '',
        },
    });

    const featuredImageUrl = watch('featuredImageUrl');
    const qrCodeUrl = watch('qrCodeUrl');

    const mutation = useMutation({
        mutationFn: (data: UpdateProfileInput) => updateTherapistProfile(profile.id, data),
        onSuccess: (updatedProfile) => {
            qc.invalidateQueries({ queryKey: ['therapist', profile.id] });
            qc.invalidateQueries({ queryKey: ['profile'] });
            setSuccessMessage(t('therapists.profile.saveSuccess'));
            setTimeout(() => setSuccessMessage(null), 3000);

            // If we just initialized the profile (id was userId), we need a full refresh
            // or at least to update the local state/url to use the new profile ID.
            if (profile.id !== updatedProfile.id) {
                window.location.reload();
            }
        },
    });

    const uploadMutation = useMutation({
        mutationFn: (file: File) => uploadFile(file),
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'featuredImageUrl' | 'qrCodeUrl') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const error = validateFile(file, { maxMb: 10, accept: ['jpg', 'jpeg', 'png', 'webp'] });
        if (error) {
            if (field === 'featuredImageUrl') setFeaturedImageError(error);
            else setQrCodeError(error);
            return;
        }

        if (field === 'featuredImageUrl') setFeaturedImageError(null);
        else setQrCodeError(null);

        try {
            const result = (await uploadMutation.mutateAsync(file)) as { url: string };
            setValue(field, result.url);
        } catch (err) {
            console.error('Upload failed', err);
        }
    };

    const onSubmit = (data: UpdateProfileInput) => {
        mutation.mutate(data);
    };

    return (
        <div className="space-y-6">
            {successMessage && (
                <div className="flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-3 rounded-xl border border-teal-100 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">{successMessage}</span>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Featured Image Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-stone-900 font-semibold">
                        <Image className="h-5 w-5 text-teal-600" />
                        <h3>{t('therapists.profile.featuredImage')}</h3>
                    </div>
                    <p className="text-sm text-stone-500">{t('therapists.profile.featuredImageHint')}</p>

                    <div className="relative group aspect-video w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 transition-colors hover:border-teal-300">
                        {featuredImageUrl ? (
                            <>
                                <img src={featuredImageUrl} alt="Featured" className="h-full w-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setValue('featuredImageUrl', '')}
                                    className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition-transform hover:scale-110"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => featuredImageInputRef.current?.click()}
                                className="flex h-full w-full flex-col items-center justify-center gap-3 text-stone-400 group-hover:text-teal-600"
                            >
                                <div className="rounded-full bg-stone-100 p-4 transition-colors group-hover:bg-teal-50">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <span className="text-sm font-medium">{t('common.optional')} - {t('therapists.profile.featuredImage')}</span>
                            </button>
                        )}
                        <input
                            ref={featuredImageInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => handleFileUpload(e, 'featuredImageUrl')}
                        />
                    </div>
                    {featuredImageError && <p className="text-xs text-rose-500">{featuredImageError}</p>}
                </section>

                {/* Social Links Section */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-stone-100">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-stone-900 font-semibold">
                            <LinkIcon className="h-5 w-5 text-teal-600" />
                            <h3>{t('therapists.profile.socialMedia')}</h3>
                        </div>
                        <input
                            {...register('socialMediaLink')}
                            placeholder="https://xiaohongshu.com/user/..."
                            className="w-full rounded-xl border-stone-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500"
                        />
                        {errors.socialMediaLink && <p className="text-xs text-rose-500">{errors.socialMediaLink.message}</p>}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-stone-900 font-semibold">
                            <QrCode className="h-5 w-5 text-teal-600" />
                            <h3>{t('therapists.profile.qrCode')}</h3>
                        </div>
                        <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 group hover:border-teal-300 transition-colors">
                            {qrCodeUrl ? (
                                <>
                                    <img src={qrCodeUrl} alt="QR Code" className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setValue('qrCodeUrl', '')}
                                        className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white backdrop-blur-sm transition-transform hover:scale-110"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => qrCodeInputRef.current?.click()}
                                    className="flex h-full w-full flex-col items-center justify-center gap-1 text-stone-400 group-hover:text-teal-600"
                                >
                                    <Upload className="h-4 w-4" />
                                    <span className="text-[10px] font-medium leading-none">{t('common.optional')}</span>
                                </button>
                            )}
                            <input
                                ref={qrCodeInputRef}
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => handleFileUpload(e, 'qrCodeUrl')}
                            />
                        </div>
                        {qrCodeError && <p className="text-xs text-rose-500">{qrCodeError}</p>}
                    </div>
                </section>

                {/* Generic Profile Info (Quick Edit) */}
                <section className="space-y-4 pt-4 border-t border-stone-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">{t('therapists.profile.locationCity', 'City')}</label>
                            <input
                                {...register('locationCity')}
                                className="w-full rounded-xl border-stone-200 px-4 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">{t('therapists.profile.perSession')}</label>
                            <input
                                type="number"
                                {...register('sessionPrice', { valueAsNumber: true })}
                                className="w-full rounded-xl border-stone-200 px-4 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">{t('therapists.profile.bio')}</label>
                        <textarea
                            {...register('bio')}
                            rows={4}
                            className="w-full rounded-xl border-stone-200 px-4 py-2 text-sm focus:border-teal-500 focus:ring-teal-500"
                        />
                    </div>
                </section>

                <div className="pt-4 flex justify-end">
                    <Button
                        type="submit"
                        size="lg"
                        loading={mutation.isPending || uploadMutation.isPending}
                        className="px-12"
                    >
                        {t('common.save')}
                    </Button>
                </div>
            </form>
        </div>
    );
};
