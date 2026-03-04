import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, Image, Link as LinkIcon, QrCode, GripVertical } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFile } from '../../../../api/upload';
import { addGalleryImage, deleteGalleryImage, reorderGalleryImages } from '../../../../api/therapists';
import { validateFile } from '../../../../utils/fileValidation';
import type { UpdateProfileInput } from '../../../../schemas/profileForms';
import type { TherapistProfile } from '../../../../types';

interface Props {
  form: UseFormReturn<UpdateProfileInput>;
  profile: TherapistProfile;
}

export const Step3Media = ({ form, profile }: Props) => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { register, watch, setValue } = form;
  const featuredImageUrl = watch('featuredImageUrl') ?? '';
  const qrCodeUrl = watch('qrCodeUrl') ?? '';

  const featuredRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);

  const galleryImages = profile.galleryImages ?? [];

  const uploadMutation = useMutation({ mutationFn: ({ file, type }: { file: File; type: string }) => uploadFile(file, type) });

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'featuredImageUrl' | 'qrCodeUrl',
    setError: (e: string | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, { maxMb: 10, accept: ['jpg', 'jpeg', 'png', 'webp'] });
    if (err) { setError(err); return; }
    setError(null);
    const type = field === 'featuredImageUrl' ? 'portrait' : 'qr';
    try {
      const result = await uploadMutation.mutateAsync({ file, type }) as { url: string };
      setValue(field, result.url);
    } catch {
      setError(t('common.errors.tryAgain'));
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, { maxMb: 10, accept: ['jpg', 'jpeg', 'png', 'webp'] });
    if (err) { setGalleryError(err); return; }
    setGalleryError(null);
    setGalleryUploading(true);
    try {
      await addGalleryImage(profile.id, file);
      qc.invalidateQueries({ queryKey: ['therapist', 'me'] });
    } catch {
      setGalleryError(t('common.errors.tryAgain'));
    } finally {
      setGalleryUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteGallery = async (imageId: string) => {
    try {
      await deleteGalleryImage(profile.id, imageId);
      qc.invalidateQueries({ queryKey: ['therapist', 'me'] });
    } catch {
      setGalleryError(t('common.errors.tryAgain'));
    }
  };

  return (
    <div className="space-y-8">
      {/* Featured Image */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 font-semibold text-stone-800">
          <Image className="h-4 w-4 text-teal-600" />
          <span>{t('therapists.profile.featuredImage')}</span>
        </div>
        <div className="relative group aspect-video w-full max-w-lg overflow-hidden rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 hover:border-teal-300 transition-colors">
          {featuredImageUrl ? (
            <>
              <img src={featuredImageUrl} alt="Featured" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setValue('featuredImageUrl', '')}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white hover:scale-110 transition-transform"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => featuredRef.current?.click()}
              className="flex h-full w-full flex-col items-center justify-center gap-2 text-stone-400 group-hover:text-teal-600"
            >
              <Upload className="h-6 w-6" />
              <span className="text-sm">{t('profile.wizard.uploadFeatured')}</span>
            </button>
          )}
          <input ref={featuredRef} type="file" accept="image/*" className="sr-only"
            onChange={(e) => handleImageUpload(e, 'featuredImageUrl', setFeaturedError)} />
        </div>
        {featuredError && <p className="text-xs text-rose-500">{featuredError}</p>}
      </section>

      {/* Gallery */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-stone-800">{t('profile.gallery.title')}</span>
          <span className="text-xs text-stone-400">{galleryImages.length}/9</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {galleryImages.map((img) => (
            <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 group">
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleDeleteGallery(img.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {galleryImages.length < 9 && (
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={galleryUploading}
              className="aspect-square rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1 text-stone-400 hover:border-teal-400 hover:text-teal-600 transition-colors disabled:opacity-50"
            >
              <Upload className="h-5 w-5" />
              <span className="text-xs">{galleryUploading ? t('common.loading') : t('profile.gallery.add')}</span>
            </button>
          )}
        </div>
        <input ref={galleryRef} type="file" accept="image/*" className="sr-only" onChange={handleGalleryUpload} />
        {galleryError && <p className="text-xs text-rose-500">{galleryError}</p>}
      </section>

      {/* Social & QR */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-semibold text-stone-800">
            <LinkIcon className="h-4 w-4 text-teal-600" />
            <span>{t('therapists.profile.socialMedia')}</span>
          </div>
          <input
            {...register('socialMediaLink')}
            placeholder="https://xiaohongshu.com/user/..."
            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-semibold text-stone-800">
            <QrCode className="h-4 w-4 text-teal-600" />
            <span>{t('therapists.profile.qrCode')}</span>
          </div>
          <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 group hover:border-teal-300 transition-colors">
            {qrCodeUrl ? (
              <>
                <img src={qrCodeUrl} alt="QR" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setValue('qrCodeUrl', '')}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <button type="button" onClick={() => qrRef.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-1 text-stone-400 group-hover:text-teal-600">
                <Upload className="h-4 w-4" />
                <span className="text-[10px]">{t('common.optional')}</span>
              </button>
            )}
            <input ref={qrRef} type="file" accept="image/*" className="sr-only"
              onChange={(e) => handleImageUpload(e, 'qrCodeUrl', setQrError)} />
          </div>
          {qrError && <p className="text-xs text-rose-500">{qrError}</p>}
        </div>
      </section>
    </div>
  );
};
