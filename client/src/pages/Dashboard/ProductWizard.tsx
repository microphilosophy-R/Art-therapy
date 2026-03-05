import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import api from '../../api/axios';
import { translateBatch, type TranslateBatchItemInput, type TranslateLang } from '../../api/translate';

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
  images: [],
};

const detectSourceLang = (
  zhValue: string,
  enValue: string,
  lastEdited: TranslateLang | null,
): TranslateLang | null => {
  const zh = zhValue.trim();
  const en = enValue.trim();

  if (lastEdited === 'zh' && zh) return 'zh';
  if (lastEdited === 'en' && en) return 'en';
  if (zh && !en) return 'zh';
  if (en && !zh) return 'en';
  if (zh && en) return 'zh';
  return null;
};

type Step = 1 | 2 | 3;

export const ProductWizard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [values, setValues] = useState<ProductFormValues>(defaultValues);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [lastEditedLang, setLastEditedLang] = useState<Record<ProductLocalizedField, TranslateLang | null>>({
    title: null,
    description: null,
  });
  const [translationState, setTranslationState] = useState<Record<ProductLocalizedField, TranslationFieldState>>({
    title: { status: 'idle', sourceLang: null },
    description: { status: 'idle', sourceLang: null },
  });
  const [translationSkipped, setTranslationSkipped] = useState(false);
  const [translationMode, setTranslationMode] = useState<'auto' | 'manual' | null>(null);
  const [translationMessage, setTranslationMessage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData);
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
      setLastEditedLang((prev) => ({ ...prev, [rule.field]: rule.lang }));
      setTranslationState((prev) => ({
        ...prev,
        [rule.field]: { status: 'idle', sourceLang: rule.lang },
      }));
      setTranslationSkipped(false);
      setTranslationMode(null);
      setTranslationMessage(null);
    }
  };

  const validateStep1 = (): boolean => {
    const errs: Partial<Record<keyof ProductFormValues, string>> = {};
    const titleZh = values.title.trim();
    const titleEn = values.titleEn.trim();
    if (!titleZh && !titleEn) {
      errs.title = t('dashboard.products.validation.titleRequired');
      errs.titleEn = t('dashboard.products.validation.titleRequired');
    }
    if (titleZh && titleZh.length < 2) errs.title = t('dashboard.products.validation.titleMinLength');
    if (titleEn && titleEn.length < 2) errs.titleEn = t('dashboard.products.validation.titleMinLength');
    if (titleZh && titleZh.length > 100) errs.title = t('dashboard.products.validation.titleMaxLength');
    if (titleEn && titleEn.length > 100) errs.titleEn = t('dashboard.products.validation.titleMaxLength');

    const price = parseFloat(values.price);
    if (!values.price) errs.price = t('dashboard.products.validation.priceRequired');
    else if (isNaN(price) || price <= 0) errs.price = t('dashboard.products.validation.pricePositive');

    const stock = parseInt(values.stock, 10);
    if (!values.stock) errs.stock = t('dashboard.products.validation.stockRequired');
    else if (isNaN(stock) || stock < 0) errs.stock = t('dashboard.products.validation.stockNonNegative');

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Partial<Record<keyof ProductFormValues, string>> = {};
    const descZh = values.description.trim();
    const descEn = values.descriptionEn.trim();
    if (!descZh && !descEn) {
      errs.description = t('dashboard.products.validation.descriptionRequired');
      errs.descriptionEn = t('dashboard.products.validation.descriptionRequired');
    }
    if (descZh && descZh.length < 10) errs.description = t('dashboard.products.validation.descriptionMinLength');
    if (descEn && descEn.length < 10) errs.descriptionEn = t('dashboard.products.validation.descriptionMinLength');

    if (values.images.length === 0) errs.images = t('dashboard.products.validation.imageRequired');
    else if (values.images.length > 9) errs.images = t('dashboard.products.validation.imageMaxCount');

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;

    if (currentStep === 2) {
      // Upload images
      const urls: string[] = [];
      for (const file of values.images) {
        const url = await uploadMutation.mutateAsync(file);
        urls.push(url);
      }
      setImageUrls(urls);
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

  const handleSkipTranslation = () => {
    setTranslationSkipped(true);
    setTranslationMode('manual');
    setTranslationMessage(null);
  };

  const handleTranslate = async () => {
    const fields: Array<{
      field: ProductLocalizedField;
      zhKey: keyof ProductFormValues;
      enKey: keyof ProductFormValues;
    }> = [
      { field: 'title', zhKey: 'title', enKey: 'titleEn' },
      { field: 'description', zhKey: 'description', enKey: 'descriptionEn' },
    ];

    const tasks: Array<{
      field: ProductLocalizedField;
      targetKey: keyof ProductFormValues;
      sourceLang: TranslateLang;
      request: TranslateBatchItemInput;
    }> = [];

    const preState: Record<ProductLocalizedField, TranslationFieldState> = {
      title: { status: 'idle', sourceLang: null },
      description: { status: 'idle', sourceLang: null },
    };

    fields.forEach(({ field, zhKey, enKey }) => {
      const zhText = String(values[zhKey] ?? '').trim();
      const enText = String(values[enKey] ?? '').trim();
      const sourceLang = detectSourceLang(zhText, enText, lastEditedLang[field]);
      if (!sourceLang) {
        preState[field] = { status: 'failed', sourceLang: null, errorCode: 'EMPTY_SOURCE' };
        return;
      }
      const targetLang: TranslateLang = sourceLang === 'zh' ? 'en' : 'zh';
      const sourceText = sourceLang === 'zh' ? zhText : enText;
      const targetKey = sourceLang === 'zh' ? enKey : zhKey;
      preState[field] = { status: 'pending', sourceLang };
      tasks.push({
        field,
        targetKey,
        sourceLang,
        request: {
          key: String(targetKey),
          text: sourceText,
          sourceLang,
          targetLang,
        },
      });
    });

    setTranslationState(preState);
    setTranslationSkipped(false);
    setTranslationMode(null);
    setTranslationMessage(null);

    if (!tasks.length) {
      setTranslationMode('manual');
      setTranslationMessage(t('translation.manualFallback'));
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
            next[task.field] = { status: 'success', sourceLang: task.sourceLang };
          } else {
            next[task.field] = {
              status: 'failed',
              sourceLang: task.sourceLang,
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
        title: { status: 'failed', sourceLang: prev.title.sourceLang, errorCode: 'NETWORK_ERROR' },
        description: { status: 'failed', sourceLang: prev.description.sourceLang, errorCode: 'NETWORK_ERROR' },
      }));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async () => {
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
      images: imageUrls,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + values.images.length > 9) {
      setErrors((prev) => ({ ...prev, images: t('dashboard.products.validation.imageMaxCount') }));
      return;
    }
    set('images', [...values.images, ...files]);
  };

  const removeImage = (index: number) => {
    set('images', values.images.filter((_, i) => i !== index));
  };

  const steps = [
    { id: 1, name: t('dashboard.products.steps.basicInfo') },
    { id: 2, name: t('dashboard.products.steps.description') },
    { id: 3, name: t('dashboard.products.steps.preview') },
  ];

  const isLoading = uploadMutation.isPending || createMutation.isPending || isTranslating;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">{t('dashboard.products.createTitle')}</h1>

      {/* Stepper */}
      <nav aria-label="Progress">
        <ol className="flex space-x-8">
          {steps.map((step) => (
            <li key={step.name} className="flex-1">
              <button
                onClick={() => step.id < currentStep && setCurrentStep(step.id as Step)}
                disabled={step.id >= currentStep}
                className={`flex flex-col border-t-4 pt-4 ${
                  currentStep > step.id
                    ? 'border-teal-600 hover:border-teal-800 cursor-pointer'
                    : currentStep === step.id
                    ? 'border-teal-600 cursor-default'
                    : 'border-stone-200 cursor-not-allowed'
                }`}
              >
                <span className={`text-sm font-medium ${currentStep > step.id ? 'text-teal-600' : currentStep === step.id ? 'text-teal-600' : 'text-stone-400'}`}>
                  {t('dashboard.products.stepPrefix')} {step.id} {currentStep > step.id && <CheckCircle className="inline h-4 w-4 mb-0.5 ml-1" />}
                </span>
                <span className="text-sm font-medium text-stone-900">{step.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="space-y-4">
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
        </div>
      )}

      {/* Step 2: Description & Images */}
      {currentStep === 2 && (
        <div className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard.products.fields.images')} {t('dashboard.products.fields.required')}</label>
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
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{t('translation.optionalStepTitle')}</h3>
                <p className="text-xs text-stone-500">
                  {translationSkipped ? t('translation.skipped') : t('translation.optionalHint')}
                </p>
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

            <div className="space-y-2">
              {[
                { field: 'title' as const, label: `${t('dashboard.products.fields.title')} (zh/en)` },
                { field: 'description' as const, label: `${t('dashboard.products.fields.description')} (zh/en)` },
              ].map((row) => {
                const state = translationState[row.field];
                const sourceLabel = state.sourceLang ? t(`translation.sourceDetected.${state.sourceLang}`) : '-';
                return (
                  <div
                    key={row.field}
                    className="flex items-center justify-between rounded-md border border-stone-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-800">{row.label}</p>
                      <p className="text-xs text-stone-500">
                        {t('translation.sourcePrefix')}: {sourceLabel}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        state.status === 'success'
                          ? 'text-emerald-700'
                          : state.status === 'failed'
                            ? 'text-rose-700'
                            : state.status === 'pending'
                              ? 'text-amber-700'
                              : 'text-stone-500'
                      }`}
                    >
                      {t(`translation.status.${state.status}`)}
                    </span>
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

          <div className="space-y-4 bg-stone-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-stone-900">{values.title || values.titleEn}</h2>
            <div className="flex gap-4 text-sm text-stone-600">
              <span>{t('dashboard.products.previewLabels.category')} {values.category}</span>
              <span>{t('dashboard.products.previewLabels.price')}{values.price}</span>
              <span>{t('dashboard.products.previewLabels.stock')} {values.stock}</span>
            </div>
            <p className="text-stone-700 whitespace-pre-wrap">{values.description || values.descriptionEn}</p>
            <div className="grid grid-cols-3 gap-2">
              {values.images.map((file, i) => (
                <img key={i} src={URL.createObjectURL(file)} alt="" className="w-full h-24 object-cover rounded" />
              ))}
            </div>
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

          {currentStep < 3 ? (
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
