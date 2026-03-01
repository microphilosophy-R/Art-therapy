import { useTranslation } from 'react-i18next';
import { UseFormReturn } from 'react-hook-form';
import type { UpdateProfileInput } from '../../../../../../server/src/schemas/therapist.schemas';

interface Props {
  form: UseFormReturn<UpdateProfileInput>;
}

const SPECIALTY_OPTIONS = [
  'Anxiety', 'Depression', 'Trauma', 'Grief', 'Relationships',
  'Self-esteem', 'Stress', 'PTSD', 'Addiction', 'Family',
  'Children', 'Adolescents', 'Adults', 'Seniors', 'LGBTQ+',
];

export const Step1BasicInfo = ({ form }: Props) => {
  const { t } = useTranslation();
  const { register, watch, setValue, formState: { errors } } = form;
  const specialties = watch('specialties') ?? [];

  const toggleSpecialty = (s: string) => {
    if (specialties.includes(s)) {
      setValue('specialties', specialties.filter((x) => x !== s), { shouldValidate: true });
    } else {
      setValue('specialties', [...specialties, s], { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            {t('profile.wizard.locationCity')}
          </label>
          <input
            {...register('locationCity')}
            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none"
          />
          {errors.locationCity && <p className="text-xs text-rose-500 mt-1">{errors.locationCity.message}</p>}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isAccepting"
            {...register('isAccepting')}
            className="h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
          />
          <label htmlFor="isAccepting" className="text-sm font-medium text-stone-700">
            {t('profile.wizard.isAccepting')}
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          {t('profile.wizard.bio')}
        </label>
        <textarea
          {...register('bio')}
          rows={5}
          className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none"
        />
        {errors.bio && <p className="text-xs text-rose-500 mt-1">{errors.bio.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          {t('profile.wizard.specialties')}
        </label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTY_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpecialty(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                specialties.includes(s)
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-teal-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {errors.specialties && <p className="text-xs text-rose-500 mt-1">{String(errors.specialties.message)}</p>}
      </div>
    </div>
  );
};
