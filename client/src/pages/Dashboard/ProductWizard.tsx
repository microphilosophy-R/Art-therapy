import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LogOut, Video, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PosterSelector, type PosterValue } from '../../components/therapyPlans/PosterSelector';
import { WizardStepper } from '../../components/ui/WizardStepper';
import api from '../../api/axios';
import { translateBatch, type TranslateBatchItemInput, type TranslateLang } from '../../api/translate';
import { validateFile } from '../../utils/fileValidation';
import { getProductDefaultPosterUrl } from '../../utils/productMedia';

type ProductCategory = 'PAINTING' | 'SCULPTURE' | 'CRAFTS' | 'DIGITAL_ART' | 'MERCHANDISE' | 'OTHER';
type ProductLocalizedField = 'title' | 'description';
type TranslationStatus = 'idle' | 'pending' | 'success' | 'failed';

type TranslationFieldState = {
  status: TranslationStatus;
  sourceLang: TranslateLang | null;
  errorCode?: string;
};

interface ProductFormValues {
  title: string;
  titleEn: string;
  category: ProductCategory;
  price: string;
  stock: string;
  description: string;
  descriptionEn: string;
  poster: PosterValue;
  images: File[];
}

const defaultValues: ProductFormValues = {
  title: '',
  titleEn: '',
  category: 'OTHER',
  price: '',
  stock: '',
  description: '',
  descriptionEn: '',
  poster: { type: 'default', id: 1 },
  images: [],
};

type Step = 1 | 2 | 3 | 4;

export const ProductWizard = () => {
  const { t, i18n } = useTranslation();
  const userLang: TranslateLang = i18n.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  const translationSourceLang: TranslateLang = userLang;
  const translationTargetLang: TranslateLang = userLang === 'zh' ? 'en' : 'zh';
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [values, setValues] = useState<ProductFormValues>(defaultValues);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadedPosterUrl, setUploadedPosterUrl] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [translationState, setTranslationState] = useState<Record<ProductLocalizedField, TranslationFieldState>>({
    title: { status: 'idle', sourceLang: null },
    description: { status: 'idle', sourceLang: null },
  });
  const [translationSkipped, setTranslationSkipped] = useState(false);
  const [translationMode, setTranslationMode] = useState<'auto' | 'manual' | null>(null);
  const [translationMessage, setTranslationMessage] = useState<string | null>(null);
  const [translationReviewed, setTranslationReviewed] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isUploadingStep2, setIsUploadingStep2] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, {
        params: type ? { type } : undefined,
      });
      return res.data.url;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      titleI18n: { zh: string; en: string };
      category: ProductCategory;
      price: number;
      stock: number;
      description: string;
      descriptionI18n: { zh: string; en: string };
      defaultPosterId?: number | null;
      posterUrl?: string | null;
      videoUrl?: string | null;
      images: string[];
    }) => {
      const res = await api.post('/shop/products', data);
      return res.data;
    },
    onSuccess: () => navigate('/dashboard/member?tab=products'),
  });

  const set = <K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    const mapped: Record<string, { field: ProductLocalizedField; lang: TranslateLang }> = {
      title: { field: 'title', lang: 'zh' },
      titleEn: { field: 'title', lang: 'en' },
      description: { field: 'description', lang: 'zh' },
      descriptionEn: { field: 'description', lang: 'en' },
    };
    const rule = mapped[String(key)];
    if (rule) {
      setTranslationState((prev) => ({
        ...prev,
        [rule.field]: { status: 'idle', sourceLang: rule.lang },
      }));
      setTranslationSkipped(false);
      setTranslationMode(null);
      setTranslationMessage(null);
      setTranslationReviewed(false);
    }
  };

  const validateStep1 = (): boolean => {
    const errs: Partial<Record<keyof ProductFormValues, string>> = {};
    const titleZh = values.title.trim();
    const titleEn = values.titleEn.trim();
    const titlePrimary = userLang === 'zh' ? titleZh : titleEn;
    if (!titlePrimary) {
      if (userLang === 'zh') errs.title = t('dashboard.products.validation.titleRequired');
      else errs.titleEn = t('dashboard.products.validation.titleRequired');
    }
    if (titlePrimary && titlePrimary.length < 2) {
      if (userLang === 'zh') errs.title = t('dashboard.products.validation.titleMinLength');
      else errs.titleEn = t('dashboard.products.validation.titleMinLength');
    }
    if (titlePrimary && titlePrimary.length > 100) {
      if (userLang === 'zh') errs.title = t('dashboard.products.validation.titleMaxLength');
      else errs.titleEn = t('dashboard.products.validation.titleMaxLength');
    }

    const price = parseFloat(values.price);
    if (!values.price) errs.price = t('dashboard.products.validation.priceRequired');
    else if (isNaN(price) || price <= 0) errs.price = t('dashboard.products.validation.pricePositive');

    const stock = parseInt(values.stock, 10);
    if (!values.stock) errs.stock = t('dashboard.products.validation.stockRequired');
    else if (isNaN(stock) || stock < 0) errs.stock = t('dashboard.products.validation.stockNonNegative');

    const descriptionPrimary = userLang === 'zh' ? values.description.trim() : values.descriptionEn.trim();
    if (!descriptionPrimary) {
      if (userLang === 'zh') errs.description = t('dashboard.products.validation.descriptionRequired');
      else errs.descriptionEn = t('dashboard.products.validation.descriptionRequired');
    }
    if (descriptionPrimary && descriptionPrimary.length < 10) {
      if (userLang === 'zh') errs.description = t('dashboard.products.validation.descriptionMinLength');
      else errs.descriptionEn = t('dashboard.products.validation.descriptionMinLength');
    }

    if (!values.poster) {
      errs.poster = t('dashboard.products.validation.posterRequired');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Partial<Record<keyof ProductFormValues, string>> = {};
    if (values.images.length > 9) errs.images = t('dashboard.products.validation.imageMaxCount');

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !translationReviewed) {
      setTranslationMessage(t('translation.reviewRequired', 'Please complete the translation checkpoint before final submission.'));
      return;
    }

    if (currentStep === 2) {
      setIsUploadingStep2(true);
      setErrors((prev) => ({ ...prev, images: undefined }));
      setMediaUploadError(null);
      try {
        let nextPosterUrl: string | null = null;
        if (values.poster?.type === 'custom') {
          if (posterFile) {
            nextPosterUrl = await uploadMutation.mutateAsync({
              file: posterFile,
              type: 'productPoster',
            });
          } else if (uploadedPosterUrl) {
            nextPosterUrl = uploadedPosterUrl;
          } else {
            setErrors((prev) => ({
              ...prev,
              poster: t('dashboard.products.validation.posterRequired'),
            }));
            return;
          }
        }

        const urls: string[] = [];
        for (const file of values.images) {
          const url = await uploadMutation.mutateAsync({
            file,
            type: 'productGallery',
          });
          urls.push(url);
        }

        let nextVideoUrl: string | null = null;
        if (videoFile) {
          nextVideoUrl = await uploadMutation.mutateAsync({
            file: videoFile,
            type: 'productVideo',
          });
        }

        setUploadedPosterUrl(nextPosterUrl);
        setImageUrls(urls);
        setUploadedVideoUrl(nextVideoUrl);
      } catch {
        setMediaUploadError(t('dashboard.products.validation.mediaUploadFailed'));
        return;
      } finally {
        setIsUploadingStep2(false);
      }
    }

    setCurrentStep((prev) => (prev + 1) as Step);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step);
  };

  const buildRequiredLocalized = (zhInput: string, enInput: string) => {
    const zh = zhInput.trim();
    const en = enInput.trim();
    const fallback = zh || en;
    return {
      zh: zh || fallback,
      en: en || fallback,
    };
  };

  const translationRows: Array<{
    field: ProductLocalizedField;
    label: string;
    sourceKey: keyof ProductFormValues;
    targetKey: keyof ProductFormValues;
    multiline?: boolean;
  }> = [
    {
      field: 'title',
      label: t('dashboard.products.fields.title'),
      sourceKey: translationSourceLang === 'zh' ? 'title' : 'titleEn',
      targetKey: translationSourceLang === 'zh' ? 'titleEn' : 'title',
    },
    {
      field: 'description',
      label: t('dashboard.products.fields.description'),
      sourceKey: translationSourceLang === 'zh' ? 'description' : 'descriptionEn',
      targetKey: translationSourceLang === 'zh' ? 'descriptionEn' : 'description',
      multiline: true,
    },
  ];

  const handleTranslationFieldChange = (
    key: keyof ProductFormValues,
    field: ProductLocalizedField,
    value: string,
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setTranslationState((prev) => ({
      ...prev,
      [field]: { status: 'idle', sourceLang: translationSourceLang },
    }));
    setTranslationSkipped(false);
    setTranslationMode('manual');
    setTranslationMessage(null);
    setTranslationReviewed(true);
  };

  const handleSkipTranslation = () => {
    setTranslationSkipped(true);
    setTranslationMode('manual');
    setTranslationMessage(null);
    setTranslationReviewed(true);
  };

  const handleTranslate = async () => {
    const tasks: Array<{
      field: ProductLocalizedField;
      targetKey: keyof ProductFormValues;
      request: TranslateBatchItemInput;
    }> = [];

    const preState: Record<ProductLocalizedField, TranslationFieldState> = {
      title: { status: 'idle', sourceLang: null },
      description: { status: 'idle', sourceLang: null },
    };

    translationRows.forEach((row) => {
      const sourceText = String(values[row.sourceKey] ?? '').trim();
      if (!sourceText) {
        preState[row.field] = { status: 'failed', sourceLang: translationSourceLang, errorCode: 'EMPTY_SOURCE' };
        return;
      }

      preState[row.field] = { status: 'pending', sourceLang: translationSourceLang };
      tasks.push({
        field: row.field,
        targetKey: row.targetKey,
        request: {
          key: String(row.targetKey),
          text: sourceText,
          sourceLang: translationSourceLang,
          targetLang: translationTargetLang,
        },
      });
    });

    setTranslationState(preState);
    setTranslationSkipped(false);
    setTranslationMode(null);
    setTranslationMessage(null);
    setTranslationReviewed(false);

    if (!tasks.length) {
      setTranslationMode('manual');
      setTranslationMessage(t('translation.manualFallback'));
      setTranslationReviewed(true);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await translateBatch(tasks.map((task) => task.request));
      const resultMap = new Map(response.results.map((result) => [result.key, result]));

      setValues((prev) => {
        const next = { ...prev };
        tasks.forEach((task) => {
          const result = resultMap.get(task.request.key);
          if (result?.status === 'ok' && typeof result.translatedText === 'string') {
            (next[task.targetKey] as string) = result.translatedText;
          }
        });
        return next;
      });

      setErrors((prev) => ({
        ...prev,
        title: undefined,
        titleEn: undefined,
        description: undefined,
        descriptionEn: undefined,
      }));

      setTranslationState((prev) => {
        const next = { ...prev };
        tasks.forEach((task) => {
          const result = resultMap.get(task.request.key);
          if (result?.status === 'ok') {
            next[task.field] = { status: 'success', sourceLang: translationSourceLang };
          } else {
            next[task.field] = {
              status: 'failed',
              sourceLang: translationSourceLang,
              errorCode: result?.errorCode ?? 'TRANSLATION_FAILED',
            };
          }
        });
        return next;
      });

      const hasFailures = response.results.some((result) => result.status === 'failed');
      setTranslationMode(response.mode);
      if (response.mode === 'manual') {
        setTranslationMessage(t('translation.manualFallback'));
      } else if (hasFailures) {
        setTranslationMessage(t('translation.partialFailure'));
      } else {
        setTranslationMessage(null);
      }
    } catch {
      setTranslationMode('manual');
      setTranslationMessage(t('translation.manualFallback'));
      setTranslationState((prev) => ({
        ...prev,
        title: { status: 'failed', sourceLang: translationSourceLang, errorCode: 'NETWORK_ERROR' },
        description: { status: 'failed', sourceLang: translationSourceLang, errorCode: 'NETWORK_ERROR' },
      }));
    } finally {
      setIsTranslating(false);
      setTranslationReviewed(true);
    }
  };

  const handleSubmit = async () => {
    if (!translationReviewed) {
      setTranslationMessage(t('translation.reviewRequired', 'Please complete the translation checkpoint before final submission.'));
      return;
    }
    const titleLocalized = buildRequiredLocalized(values.title, values.titleEn);
    const descriptionLocalized = buildRequiredLocalized(values.description, values.descriptionEn);
    await createMutation.mutateAsync({
      title: titleLocalized.zh,
      titleI18n: titleLocalized,
      category: values.category,
      price: parseFloat(values.price),
      stock: parseInt(values.stock, 10),
      description: descriptionLocalized.zh,
      descriptionI18n: descriptionLocalized,
      defaultPosterId: values.poster?.type === 'default' ? values.poster.id : null,
      posterUrl: values.poster?.type === 'custom' ? uploadedPosterUrl : null,
      videoUrl: uploadedVideoUrl,
      images: imageUrls,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + values.images.length > 9) {
      setErrors((prev) => ({ ...prev, images: t('dashboard.products.validation.imageMaxCount') }));
      return;
    }
    setMediaUploadError(null);
    set('images', [...values.images, ...files]);
  };

  const removeImage = (index: number) => {
    set('images', values.images.filter((_, i) => i !== index));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, { maxMb: 100, accept: ['mp4', 'mov', 'webm'] });
    if (err) {
      setVideoError(err);
      e.target.value = '';
      return;
    }
    setVideoError(null);
    setMediaUploadError(null);
    setVideoFile(file);
    e.target.value = '';
  };

  const steps = [
    { id: 1, name: t('dashboard.products.steps.basicInfo') },
    { id: 2, name: t('dashboard.products.steps.media') },
    { id: 3, name: t('dashboard.products.steps.translation', 'Translation') },
    { id: 4, name: t('dashboard.products.steps.preview') },
  ];

  const isLoading = uploadMutation.isPending || createMutation.isPending || isTranslating || isUploadingStep2;
  const posterPreviewUrl =
    values.poster?.type === 'custom'
      ? uploadedPosterUrl ?? values.poster.url
      : getProductDefaultPosterUrl(values.poster?.id ?? null);
  const previewVideoUrl = uploadedVideoUrl;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">{t('dashboard.products.createTitle')}</h1>

      <WizardStepper
        steps={steps}
        currentStep={currentStep}
        onStepClick={(id) => setCurrentStep(id as Step)}
        formatStepLabel={(id) => `${t('dashboard.products.stepPrefix')} ${id}`}
      />

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="space-y-4">
          {userLang === 'zh' ? (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard.products.fields.title')} (zh) {t('dashboard.products.fields.required')}</label>
              <input
                type="text"
                value={values.title}
                onChange={(e) => set('title', e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
              {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard.products.fields.title')} (en) {t('dashboard.products.fields.required')}</label>
              <input
                type="text"
                value={values.titleEn}
                onChange={(e) => set('titleEn', e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
              {errors.titleEn && <p className="text-sm text-red-600 mt-1">{errors.titleEn}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard.products.fields.category')} {t('dashboard.products.fields.required')}</label>
            <select
              value={values.category}
              onChange={(e) => set('category', e.target.value as ProductCategory)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            >
              <option value="PAINTING">{t('dashboard.products.categories.painting')}</option>
              <option value="SCULPTURE">{t('dashboard.products.categories.sculpture')}</option>
              <option value="CRAFTS">{t('dashboard.products.categories.crafts')}</option>
              <option value="DIGITAL_ART">{t('dashboard.products.categories.digitalArt')}</option>
              <option value="MERCHANDISE">{t('dashboard.products.categories.merchandise')}</option>
              <option value="OTHER">{t('dashboard.products.categories.other')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard.products.fields.price')} {t('dashboard.products.fields.required')}</label>
              <input
                type="number"
                step="0.01"
                value={values.price}
                onChange={(e) => set('price', e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
              {errors.price && <p className="text-sm text-red-600 mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard.products.fields.stock')} {t('dashboard.products.fields.required')}</label>
              <input
                type="number"
                value={values.stock}
                onChange={(e) => set('stock', e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
              {errors.stock && <p className="text-sm text-red-600 mt-1">{errors.stock}</p>}
            </div>
          </div>

          {userLang === 'zh' ? (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard.products.fields.description')} (zh) {t('dashboard.products.fields.required')}</label>
              <textarea
                value={values.description}
                onChange={(e) => set('description', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
              {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard.products.fields.description')} (en) {t('dashboard.products.fields.required')}</label>
              <textarea
                value={values.descriptionEn}
                onChange={(e) => set('descriptionEn', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
              {errors.descriptionEn && <p className="text-sm text-red-600 mt-1">{errors.descriptionEn}</p>}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">
              {t('dashboard.products.fields.poster')} {t('dashboard.products.fields.required')}
            </p>
            <PosterSelector
              value={values.poster}
              onChange={(poster) => {
                set('poster', poster);
                if (poster?.type === 'default') {
                  setPosterFile(null);
                  setUploadedPosterUrl(null);
                }
              }}
              onFileSelected={(file) => {
                setPosterFile(file);
                setUploadedPosterUrl(null);
              }}
              disabled={isLoading}
            />
            {errors.poster && <p className="text-sm text-red-600 mt-1">{errors.poster}</p>}
          </div>
        </div>
      )}

      {/* Step 2: Media */}
      {currentStep === 2 && (
        <div className="space-y-4">
          {mediaUploadError && (
            <p className="text-sm text-red-600">{mediaUploadError}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('dashboard.products.fields.images')} {t('common.optional')}
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
            {errors.images && <p className="text-sm text-red-600 mt-1">{errors.images}</p>}

            {values.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {values.images.map((file, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-24 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                    >
                      <X className="h-3.5 w-3.5 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('dashboard.products.fields.video')} {t('common.optional')}
            </label>
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleVideoChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
            {videoError && <p className="text-sm text-red-600 mt-1">{videoError}</p>}
            {videoFile && (
              <div className="mt-3 rounded-lg border border-stone-200 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm text-stone-700">
                  <span className="inline-flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    {videoFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVideoFile(null)}
                    className="text-stone-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <video
                  src={URL.createObjectURL(videoFile)}
                  controls
                  className="w-full max-h-56 rounded-md bg-black"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Translation */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{t('translation.optionalStepTitle')}</h3>
                <p className="text-xs text-stone-500">
                  {translationSkipped ? t('translation.skipped') : t('translation.optionalHint')}
                </p>
                <p className="text-xs text-stone-500 mt-1">{t('translation.manualEditHint')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipTranslation}
                  disabled={isLoading || isTranslating}
                >
                  {t('translation.skip')}
                </Button>
                <Button
                  type="button"
                  onClick={handleTranslate}
                  loading={isTranslating}
                  disabled={isLoading || isTranslating}
                >
                  {t('translation.translateNow')}
                </Button>
              </div>
            </div>

            {translationMessage && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {translationMessage}
              </p>
            )}

            <div className="hidden md:grid md:grid-cols-2 gap-3 px-1">
              <p className="text-xs font-medium text-stone-600">
                {t('translation.sourceColumn', { lang: t(`translation.sourceDetected.${translationSourceLang}`) })}
              </p>
              <p className="text-xs font-medium text-stone-600">
                {t('translation.resultColumn', { lang: t(`translation.sourceDetected.${translationTargetLang}`) })}
              </p>
            </div>

            <div className="space-y-3">
              {translationRows.map((row) => {
                const state = translationState[row.field];
                const sourceValue = String(values[row.sourceKey] ?? '');
                const targetValue = String(values[row.targetKey] ?? '');
                const statusClass =
                  state.status === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : state.status === 'failed'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : state.status === 'pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-stone-50 text-stone-600 border-stone-200';
                return (
                  <div
                    key={row.field}
                    className="rounded-md border border-stone-200 p-3"
                  >
                    <p className="text-sm font-medium text-stone-800 mb-2">{row.label}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        {row.multiline ? (
                          <textarea
                            rows={4}
                            value={sourceValue}
                            onChange={(e) => handleTranslationFieldChange(row.sourceKey, row.field, e.target.value)}
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={sourceValue}
                            onChange={(e) => handleTranslationFieldChange(row.sourceKey, row.field, e.target.value)}
                            className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        )}
                      </div>
                      <div>
                        {row.multiline ? (
                          <textarea
                            rows={4}
                            value={targetValue}
                            onChange={(e) => handleTranslationFieldChange(row.targetKey, row.field, e.target.value)}
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={targetValue}
                            onChange={(e) => handleTranslationFieldChange(row.targetKey, row.field, e.target.value)}
                            className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                        {t(`translation.status.${state.status}`)}
                      </span>
                      {state.errorCode && state.status === 'failed' && (
                        <span className="text-xs text-rose-600">{state.errorCode}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {translationMode && (
              <p className="text-xs text-stone-500">
                {t('translation.modeLabel')}: {translationMode.toUpperCase()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Preview */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="space-y-4 bg-stone-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-stone-900">{values.title || values.titleEn}</h2>
            <div className="flex gap-4 text-sm text-stone-600">
              <span>{t('dashboard.products.previewLabels.category')} {values.category}</span>
              <span>{t('dashboard.products.previewLabels.price')}{values.price}</span>
              <span>{t('dashboard.products.previewLabels.stock')} {values.stock}</span>
            </div>
            <p className="text-stone-700 whitespace-pre-wrap">{values.description || values.descriptionEn}</p>

            <div className="space-y-3">
              <p className="text-sm font-medium text-stone-700">
                {t('dashboard.products.fields.poster')}
              </p>
              <div className="aspect-[16/9] max-w-2xl w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                {posterPreviewUrl ? (
                  <img src={posterPreviewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-stone-400 text-sm">
                    {t('dashboard.products.fields.poster')}
                  </div>
                )}
              </div>
            </div>

            {previewVideoUrl && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-stone-700">
                  {t('dashboard.products.fields.video')}
                </p>
                <video
                  src={previewVideoUrl}
                  controls
                  className="max-w-2xl w-full max-h-64 rounded-lg bg-black"
                />
              </div>
            )}

            {values.images.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-stone-700">
                  {t('dashboard.products.fields.images')}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {values.images.map((file, i) => (
                    <img key={i} src={URL.createObjectURL(file)} alt="" className="w-full h-24 object-cover rounded" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-stone-200 pt-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} disabled={isLoading}>
          <LogOut className="h-4 w-4 mr-1.5" />
          {t('dashboard.products.buttons.exit')}
        </Button>

        <div className="flex gap-3">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={isLoading}>
              {t('dashboard.products.buttons.back')}
            </Button>
          )}

          {currentStep < 4 ? (
            <Button onClick={handleNext} loading={isLoading} disabled={isLoading}>
              {t('dashboard.products.buttons.next')}
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={isLoading} disabled={isLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
              {t('dashboard.products.buttons.submitReview')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
