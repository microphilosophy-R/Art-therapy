import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import api from '../../api/axios';

type ProductCategory = 'PAINTING' | 'SCULPTURE' | 'CRAFTS' | 'DIGITAL_ART' | 'MERCHANDISE' | 'OTHER';

interface ProductFormValues {
  title: string;
  category: ProductCategory;
  price: string;
  stock: string;
  description: string;
  images: File[];
}

const defaultValues: ProductFormValues = {
  title: '',
  category: 'OTHER',
  price: '',
  stock: '',
  description: '',
  images: [],
};

type Step = 1 | 2 | 3;

export const ProductWizard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [values, setValues] = useState<ProductFormValues>(defaultValues);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData);
      return res.data.url;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; category: ProductCategory; price: number; stock: number; description: string; images: string[] }) => {
      const res = await api.post('/shop/products', data);
      return res.data;
    },
    onSuccess: () => navigate('/dashboard/member?tab=products'),
  });

  const set = <K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateStep1 = (): boolean => {
    const errs: Partial<Record<keyof ProductFormValues, string>> = {};
    if (!values.title.trim()) errs.title = t('dashboard.products.validation.titleRequired');
    else if (values.title.length < 2) errs.title = t('dashboard.products.validation.titleMinLength');
    else if (values.title.length > 100) errs.title = t('dashboard.products.validation.titleMaxLength');

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
    if (!values.description.trim()) errs.description = t('dashboard.products.validation.descriptionRequired');
    else if (values.description.length < 10) errs.description = t('dashboard.products.validation.descriptionMinLength');

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

  const handleSubmit = async () => {
    await createMutation.mutateAsync({
      title: values.title,
      category: values.category,
      price: parseFloat(values.price),
      stock: parseInt(values.stock, 10),
      description: values.description,
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

  const isLoading = uploadMutation.isPending || createMutation.isPending;

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
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard.products.fields.title')} {t('dashboard.products.fields.required')}</label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => set('title', e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
            {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
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
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('dashboard.products.fields.description')} {t('dashboard.products.fields.required')}</label>
            <textarea
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
            {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
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
        <div className="space-y-4 bg-stone-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-stone-900">{values.title}</h2>
          <div className="flex gap-4 text-sm text-stone-600">
            <span>{t('dashboard.products.previewLabels.category')} {values.category}</span>
            <span>{t('dashboard.products.previewLabels.price')}{values.price}</span>
            <span>{t('dashboard.products.previewLabels.stock')} {values.stock}</span>
          </div>
          <p className="text-stone-700 whitespace-pre-wrap">{values.description}</p>
          <div className="grid grid-cols-3 gap-2">
            {values.images.map((file, i) => (
              <img key={i} src={URL.createObjectURL(file)} alt="" className="w-full h-24 object-cover rounded" />
            ))}
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
