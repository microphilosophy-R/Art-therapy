import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Upload, X, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import api from '../../api/axios';

interface CertificateWizardProps {
  certificateType: string;
  onClose: () => void;
}

export function CertificateWizard({ certificateType, onClose }: CertificateWizardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);

  const uploadMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const formData = new FormData();
      formData.append('type', certificateType);
      formData.append('isDraft', isDraft.toString());
      files.forEach(file => formData.append('files', file));
      const res = await api.post('/member/apply-certificate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberReviewStatus'] });
      onClose();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 5 - files.length);
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const typeKey = certificateType.toLowerCase();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">{t('dashboard.review.applyFor', { feature: t(`dashboard.review.features.${typeKey}.name`) })}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-2 rounded ${s <= step ? 'bg-teal-500' : 'bg-stone-200'}`} />
          ))}
        </div>

        {/* Step 1: Terms */}
        {step === 1 && (
          <div>
            <h3 className="font-semibold mb-3">{t('dashboard.wizard.step1Title')}</h3>
            <div className="space-y-3 mb-6">
              <div className="p-4 bg-stone-50 rounded">
                <p className="text-sm font-medium mb-2">{t('dashboard.review.requirements')}</p>
                <ul className="text-sm text-stone-600 space-y-1">
                  <li>• {t(`dashboard.review.features.${typeKey}.req1`)}</li>
                  <li>• {t(`dashboard.review.features.${typeKey}.req2`)}</li>
                  {typeKey === 'therapist' && <li>• {t(`dashboard.review.features.${typeKey}.req3`)}</li>}
                </ul>
              </div>
              <div className="p-4 bg-teal-50 rounded">
                <p className="text-sm font-medium mb-2">{t('dashboard.review.benefits')}</p>
                <ul className="text-sm text-teal-700 space-y-1">
                  <li>• {t(`dashboard.review.features.${typeKey}.benefit1`)}</li>
                  <li>• {t(`dashboard.review.features.${typeKey}.benefit2`)}</li>
                  {typeKey === 'therapist' && <li>• {t(`dashboard.review.features.${typeKey}.benefit3`)}</li>}
                </ul>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>{t('dashboard.wizard.next')} <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* Step 2: Upload PDFs */}
        {step === 2 && (
          <div>
            <h3 className="font-semibold mb-3">{t('dashboard.wizard.step2Title')}</h3>
            <p className="text-sm text-stone-600 mb-4">{t('dashboard.wizard.uploadHint')}</p>

            <div className="space-y-3 mb-6">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-stone-200 rounded">
                  <FileText className="h-5 w-5 text-stone-400" />
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <button onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {files.length < 5 && (
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-stone-300 rounded cursor-pointer hover:border-teal-500">
                  <Upload className="h-5 w-5 text-stone-400" />
                  <span className="text-sm text-stone-600">{t('dashboard.wizard.addFile')}</span>
                  <input type="file" accept=".pdf" multiple onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> {t('dashboard.wizard.back')}</Button>
              <Button onClick={() => setStep(3)} disabled={files.length === 0}>{t('dashboard.wizard.next')} <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div>
            <h3 className="font-semibold mb-3">{t('dashboard.wizard.step3Title')}</h3>
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-stone-50 rounded">
                <p className="text-sm font-medium mb-2">{t('dashboard.wizard.certificateType')}</p>
                <p className="text-sm text-stone-700">{t(`dashboard.review.features.${typeKey}.name`)}</p>
              </div>
              <div className="p-4 bg-stone-50 rounded">
                <p className="text-sm font-medium mb-2">{t('dashboard.wizard.uploadedFiles')}</p>
                <ul className="text-sm text-stone-700 space-y-1">
                  {files.map((file, i) => (
                    <li key={i}>• {file.name}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> {t('dashboard.wizard.back')}</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => uploadMutation.mutate(true)} loading={uploadMutation.isPending}>{t('dashboard.wizard.saveDraft')}</Button>
                <Button onClick={() => uploadMutation.mutate(false)} loading={uploadMutation.isPending}>{t('dashboard.review.submit')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
