import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getMyArtistProfile, updateArtistProfile, submitArtistProfileForReview } from '../../../api/artist';
import { Button } from '../../../components/ui/Button';
import { PageLoader } from '../../../components/ui/Spinner';
import { AlertCircle, CheckCircle } from 'lucide-react';

const profileSchema = z.object({
    bio: z.string().min(10, 'Bio must be at least 10 characters').optional().nullable(),
    portfolioUrl: z.string().url('Must be a valid URL').optional().nullable(),
    commissionStatus: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const ArtistProfileTab = () => {
    const { t } = useTranslation();
    const qc = useQueryClient();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['artist-profile', 'me'],
        queryFn: getMyArtistProfile,
    });

    const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        values: {
            bio: profile?.bio || '',
            portfolioUrl: profile?.portfolioUrl || '',
            commissionStatus: profile?.commissionStatus || '',
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateArtistProfile,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['artist-profile', 'me'] });
        },
    });

    const submitMutation = useMutation({
        mutationFn: submitArtistProfileForReview,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['artist-profile', 'me'] });
        },
    });

    const onSubmit = (data: ProfileFormValues) => {
        updateMutation.mutate(data);
    };

    if (isLoading) return <PageLoader />;

    return (
        <div className="max-w-3xl">
            <div className="mb-6 flex items-center justify-between bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                    <h3 className="text-sm font-medium text-stone-900">Profile Status</h3>
                    <p className="text-xs text-stone-500 mt-1">
                        Current approval status for your artist account.
                    </p>
                </div>
                <div>
                    {profile?.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle className="h-4 w-4" /> Approved
                        </span>
                    )}
                    {profile?.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                            <AlertCircle className="h-4 w-4" /> Pending Review
                        </span>
                    )}
                    {(!profile?.status || profile?.status === 'REJECTED') && (
                        <div className="flex gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-800">
                                Draft / Rejected
                            </span>
                            <Button
                                size="sm"
                                onClick={() => submitMutation.mutate()}
                                loading={submitMutation.isPending}
                            >
                                Submit for Review
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-stone-700">Bio</label>
                    <textarea
                        {...register('bio')}
                        rows={4}
                        className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        placeholder="Tell us about yourself and your art..."
                    />
                    {errors.bio && <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-stone-700">Portfolio URL</label>
                    <input
                        {...register('portfolioUrl')}
                        type="url"
                        className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        placeholder="https://yourportfolio.com"
                    />
                    {errors.portfolioUrl && <p className="mt-1 text-sm text-red-600">{errors.portfolioUrl.message}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-stone-700">Commission Status</label>
                    <input
                        {...register('commissionStatus')}
                        type="text"
                        className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        placeholder="e.g., Open for commissions, Fully booked"
                    />
                    {errors.commissionStatus && <p className="mt-1 text-sm text-red-600">{errors.commissionStatus.message}</p>}
                </div>

                <div className="flex justify-end">
                    <Button type="submit" loading={updateMutation.isPending}>
                        Save Profile
                    </Button>
                </div>
            </form>
        </div>
    );
};
