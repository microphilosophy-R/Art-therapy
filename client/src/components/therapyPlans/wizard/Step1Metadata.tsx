import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Select } from '../../ui/Select';
import { PosterSelector, type PosterValue } from '../PosterSelector';
import type { TherapyPlanType, ArtSalonSubType, SessionMedium } from '../../../types';

export interface Step1Values {
    type: TherapyPlanType;
    title: string;
    titleEn: string;
    slogan: string;
    sloganEn: string;
    introduction: string;
    introductionEn: string;
    location: string;
    maxParticipants: string;
    price: string;
    contactInfo: string;
    artSalonSubType: ArtSalonSubType | '';
    sessionMedium: SessionMedium | '';
    poster: PosterValue;
}

export interface Step1Props {
    values: Step1Values;
    errors: Partial<Record<keyof Step1Values, string>>;
    set: (key: any, val: any) => void;
    setValues: React.Dispatch<React.SetStateAction<any>>;
    setErrors: React.Dispatch<React.SetStateAction<any>>;
    posterFile: File | null;
    setPosterFile: (file: File | null) => void;
    isLoading?: boolean;
    consultEnabled?: boolean;
}

export const Step1Metadata = ({
    values,
    errors,
    set,
    setValues,
    setErrors,
    posterFile,
    setPosterFile,
    isLoading,
    consultEnabled = false,
}: Step1Props) => {
    const { t } = useTranslation();

    const planTypeOptions = [
        { value: 'PERSONAL_CONSULT', label: t('common.planType.PERSONAL_CONSULT'), disabled: !consultEnabled },
        { value: 'GROUP_CONSULT', label: t('common.planType.GROUP_CONSULT'), disabled: !consultEnabled },
        { value: 'ART_SALON', label: t('common.planType.ART_SALON') },
        { value: 'WELLNESS_RETREAT', label: t('common.planType.WELLNESS_RETREAT') },
    ];

    const artSalonOptions = [
        { value: 'CALLIGRAPHY', label: t('common.artSalonSubType.CALLIGRAPHY') },
        { value: 'PAINTING', label: t('common.artSalonSubType.PAINTING') },
        { value: 'DRAMA', label: t('common.artSalonSubType.DRAMA') },
        { value: 'YOGA', label: t('common.artSalonSubType.YOGA') },
        { value: 'BOARD_GAMES', label: t('common.artSalonSubType.BOARD_GAMES') },
        { value: 'CULTURAL_CONVERSATION', label: t('common.artSalonSubType.CULTURAL_CONVERSATION') },
    ];

    const mediumOptions = [
        { value: 'IN_PERSON', label: t('common.medium.IN_PERSON') },
        { value: 'VIDEO', label: t('common.medium.VIDEO') },
    ];

    return (
        <div className="space-y-6">
            {/* Plan type */}
        <div className="space-y-1">
            <Select
                label={t('therapyPlans.form.type')}
                options={planTypeOptions}
                value={values.type}
                onChange={(e) => {
                    const newType = e.target.value as TherapyPlanType;
                    setValues((prev: any) => ({ ...prev, type: newType, events: [] }));
                    setErrors((prev: any) => ({ ...prev, type: undefined }));
                }}
                error={errors.type}
            />
            {!consultEnabled && (
                <p className="text-xs text-amber-600">
                    {t('profile.wizard.consultDisabledHint')}
                </p>
            )}
        </div>

            {/* Type-specific fields */}
            {values.type === 'PERSONAL_CONSULT' && (
                <Select
                    label={t('therapyPlans.form.sessionMedium')}
                    options={mediumOptions}
                    placeholder={t('common.select')}
                    value={values.sessionMedium}
                    onChange={(e) => set('sessionMedium', e.target.value as SessionMedium)}
                    error={errors.sessionMedium}
                />
            )}
            {values.type === 'ART_SALON' && (
                <Select
                    label={t('therapyPlans.form.artSalonSubType')}
                    options={artSalonOptions}
                    placeholder={t('common.select')}
                    value={values.artSalonSubType}
                    onChange={(e) => set('artSalonSubType', e.target.value as ArtSalonSubType)}
                    error={errors.artSalonSubType}
                />
            )}
            {(values.type === 'GROUP_CONSULT' || values.type === 'ART_SALON' || values.type === 'WELLNESS_RETREAT') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        type="number"
                        label={t('therapyPlans.form.maxParticipants')}
                        placeholder={t('therapyPlans.form.maxParticipantsPlaceholder')}
                        min={1}
                        max={values.type === 'GROUP_CONSULT' ? 12 : undefined}
                        value={values.maxParticipants}
                        onChange={(e) => set('maxParticipants', e.target.value)}
                        error={errors.maxParticipants}
                    />
                    <Input
                        type="number"
                        label={t('therapyPlans.form.price')}
                        placeholder={t('therapyPlans.form.pricePlaceholder')}
                        min={0}
                        step={0.01}
                        value={values.price}
                        onChange={(e) => set('price', e.target.value)}
                        error={errors.price}
                    />
                </div>
            )}

            <Input
                label={`${t('therapyPlans.form.title')} (zh)`}
                placeholder={t('therapyPlans.form.titlePlaceholder', 'e.g. Intro to Creative Healing')}
                value={values.title}
                onChange={(e) => set('title', e.target.value)}
                error={errors.title}
                maxLength={100}
            />
            <Input
                label={`${t('therapyPlans.form.title')} (en)`}
                placeholder="e.g. Intro to Creative Healing"
                value={values.titleEn}
                onChange={(e) => set('titleEn', e.target.value)}
                error={errors.titleEn as string | undefined}
                maxLength={100}
            />

            <Input
                label={`${t('therapyPlans.form.slogan', 'Slogan')} (zh)`}
                placeholder={t('therapyPlans.form.sloganPlaceholder', 'A brief, catchy subtitle (e.g. Escape to Nature)')}
                value={values.slogan}
                onChange={(e) => set('slogan', e.target.value)}
                error={errors.slogan}
                maxLength={60}
            />
            <Input
                label={`${t('therapyPlans.form.slogan', 'Slogan')} (en)`}
                placeholder="A brief, catchy subtitle"
                value={values.sloganEn}
                onChange={(e) => set('sloganEn', e.target.value)}
                error={errors.sloganEn as string | undefined}
                maxLength={60}
            />

            <Textarea
                label={`${t('therapyPlans.form.introduction')} (zh)`}
                placeholder={t('therapyPlans.form.introductionPlaceholder')}
                rows={4}
                value={values.introduction}
                onChange={(e) => set('introduction', e.target.value)}
                error={errors.introduction}
                maxLength={2000}
            />
            <Textarea
                label={`${t('therapyPlans.form.introduction')} (en)`}
                placeholder="Describe your plan in English"
                rows={4}
                value={values.introductionEn}
                onChange={(e) => set('introductionEn', e.target.value)}
                error={errors.introductionEn as string | undefined}
                maxLength={2000}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                    label={t('therapyPlans.form.location')}
                    placeholder={t('therapyPlans.form.locationPlaceholder')}
                    value={values.location}
                    onChange={(e) => set('location', e.target.value)}
                    error={errors.location}
                    maxLength={300}
                />
                <Input
                    label={t('therapyPlans.form.contactInfo')}
                    placeholder={t('therapyPlans.form.contactInfoPlaceholder')}
                    value={values.contactInfo}
                    onChange={(e) => set('contactInfo', e.target.value)}
                    error={errors.contactInfo}
                    maxLength={300}
                />
            </div>

            <div>
                <p className="text-sm font-medium text-stone-700 mb-2">{t('therapyPlans.form.posterSection')}</p>
                <PosterSelector
                    value={values.poster}
                    onChange={(v) => set('poster', v)}
                    onFileSelected={(file) => setPosterFile(file)}
                    disabled={isLoading}
                />
            </div>
        </div>
    );
};
