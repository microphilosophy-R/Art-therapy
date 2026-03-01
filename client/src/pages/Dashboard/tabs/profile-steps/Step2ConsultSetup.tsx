import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, FileText } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { uploadFile } from '../../../../api/upload';
import { validateFile } from '../../../../utils/fileValidation';
import type { UpdateProfileInput } from '../../../../../../server/src/schemas/therapist.schemas';

interface Props {
  form: UseFormReturn<UpdateProfileInput>;
}

export const Step2ConsultSetup = ({ form }: Props) => {
  const { t } = useTranslation();
  const { register, watch, setValue, formState: { errors } } = form;
  const consultEnabled = watch('consultEnabled') ?? false;
  const certificateUrl = watch('certificateUrl') ?? '';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, 'cert'),
  });

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, { maxMb: 10, accept: ['pdf', 'jpg', 'jpeg', 'png'] });
    if (err) { setFileError(err); return; }
    setFileError(null);
    try {
      const result = await uploadMutation.mutateAsync(file) as { url: string };
      setValue('certificateUrl', result.url, { shouldValidate: true });
    } catch {
      setFileError(t('common.errors.tryAgain'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 p-4 rounded-xl border border-stone-200 bg-stone-50">
        <input
          type="checkbox"
          id="consultEnabled"
          {...register('consultEnabled')}
          className="mt-0.5 h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
        />
        <div>
          <label htmlFor="consultEnabled" className="text-sm font-semibold text-stone-800 cursor-pointer">
            {t('profile.wizard.enableConsult')}
          </label>
          <p className="text-xs text-stone-500 mt-0.5">
            {t('profile.wizard.enableConsultDesc')}
          </p>
        </div>
      </div>

      {consultEnabled && (
        <div className="space-y-5 pl-2 border-l-2 border-teal-200">
          {/* Basic Fees */}
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
              {t('profile.wizard.basicFees')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('profile.wizard.sessionPrice')} (¥)
                </label>
                <input
                  type="number"
                  {...register('sessionPrice', { valueAsNumber: true })}
                  className="w-full max-w-xs rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none"
                />
                {errors.sessionPrice && (
                  <p className="text-xs text-rose-500 mt-1">{errors.sessionPrice.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  {t('profile.wizard.sessionLength')} (min)
                </label>
                <input
                  type="number"
                  {...register('sessionLength', { valueAsNumber: true })}
                  className="w-full max-w-xs rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none"
                />
                {errors.sessionLength && (
                  <p className="text-xs text-rose-500 mt-1">{errors.sessionLength.message}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('profile.wizard.hourlyConsultFee')} (¥) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              {...register('hourlyConsultFee', { valueAsNumber: true })}
              className="w-full max-w-xs rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none"
            />
            {errors.hourlyConsultFee && (
              <p className="text-xs text-rose-500 mt-1">{errors.hourlyConsultFee.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('profile.wizard.certificate')} <span className="text-rose-500">*</span>
            </label>
            {certificateUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-teal-200 bg-teal-50 max-w-sm">
                <FileText className="h-5 w-5 text-teal-600 shrink-0" />
                <a
                  href={certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-teal-700 underline truncate flex-1"
                >
                  {t('profile.wizard.certificateUploaded')}
                </a>
                <button
                  type="button"
                  onClick={() => setValue('certificateUrl', '', { shouldValidate: true })}
                  className="text-stone-400 hover:text-rose-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-stone-200 text-sm text-stone-500 hover:border-teal-400 hover:text-teal-600 transition-colors disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {uploadMutation.isPending ? t('common.loading') : t('profile.wizard.uploadCertificate')}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="sr-only"
              onChange={handleCertUpload}
            />
            {fileError && <p className="text-xs text-rose-500 mt-1">{fileError}</p>}
            <p className="text-xs text-stone-400 mt-1">{t('profile.wizard.certificateHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
