import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { validateFile } from '../../utils/fileValidation';
import { DEFAULT_POSTER_COUNT, getDefaultPosterUrl } from '../../utils/defaultPosters';

export type PosterValue =
  | { type: 'default'; id: number }
  | { type: 'custom'; url: string }
  | null;

interface PosterSelectorProps {
  value: PosterValue;
  onChange: (value: PosterValue) => void;
  /** Called when user picks a custom file; parent handles the actual upload */
  onFileSelected?: (file: File) => void;
  disabled?: boolean;
}

export const PosterSelector = ({
  value,
  onChange,
  onFileSelected,
  disabled,
}: PosterSelectorProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const selectedDefaultId =
    value?.type === 'default' ? value.id : null;
  const customUrl =
    value?.type === 'custom' ? value.url : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateFile(file, { maxMb: 10, accept: ['jpg', 'jpeg', 'png', 'webp', 'gif'] });
    if (error) {
      setFileError(error);
      e.target.value = '';
      return;
    }
    setFileError(null);
    const previewUrl = URL.createObjectURL(file);
    onChange({ type: 'custom', url: previewUrl });
    onFileSelected?.(file);
    e.target.value = ''; // reset so same file can be re-selected
  };

  return (
    <div>
      <p className="text-sm text-stone-500 mb-3">{t('therapyPlans.form.defaultPosters')}</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
        {Array.from({ length: DEFAULT_POSTER_COUNT }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ type: 'default', id: n })}
            className={`relative aspect-video overflow-hidden rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${selectedDefaultId === n
                ? 'border-teal-500 shadow-md'
                : 'border-stone-200 hover:border-stone-400'
              }`}
          >
            <img
              src={getDefaultPosterUrl(n) ?? ''}
              alt={t('therapyPlans.form.defaultPosterAlt', { n })}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {selectedDefaultId === n && (
              <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-teal-500 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10 3L5 9 2 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Custom upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${customUrl
              ? 'border-teal-500 text-teal-700 bg-teal-50'
              : 'border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700'
            }`}
        >
          <Upload className="h-4 w-4" />
          {customUrl
            ? t('therapyPlans.form.uploadCustom') + ' ✓'
            : t('therapyPlans.form.uploadCustom')}
        </button>
        {customUrl && (
          <div className="mt-2">
            <img
              src={customUrl}
              alt="Custom poster preview"
              className="h-20 rounded-lg object-cover border border-stone-200"
            />
          </div>
        )}
        <p className="mt-1.5 text-xs text-stone-400">{t('therapyPlans.form.posterHint')}</p>
        {fileError && (
          <p className="mt-1 text-xs text-rose-600">{fileError}</p>
        )}
      </div>
    </div>
  );
};
