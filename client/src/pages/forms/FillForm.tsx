import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { getFormForClient, submitForm, type FormQuestion } from '../../api/forms';

export function FillForm() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { data: form, isLoading, isError } = useQuery({
    queryKey: ['form-client', id],
    queryFn: () => getFormForClient(id!),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submitForm(id!, Object.entries(answers).map(([questionId, value]) => ({ questionId, value }))),
    onSuccess: () => navigate('/dashboard/client'),
  });

  const handleSubmit = () => {
    if (!form) return;
    const required = form.questions?.filter((q) => q.required) ?? [];
    const missing = required.filter((q) => !answers[q.id]?.trim()).map((q) => q.id);
    if (missing.length > 0) {
      setValidationErrors(missing);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);
    submitMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500">
        {t('forms.fill.notFound')}
      </div>
    );
  }

  if (form.status === 'SUBMITTED') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm">
          <CheckCircle className="h-12 w-12 text-teal-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-stone-900">{t('forms.fill.alreadySubmitted')}</h2>
          <p className="text-stone-500 mt-2">{t('forms.fill.alreadySubmittedDesc')}</p>
          <Button className="mt-6" onClick={() => navigate('/dashboard/client')}>{t('forms.fill.backToDashboard')}</Button>
        </div>
      </div>
    );
  }

  const therapistName = `${form.sender?.firstName ?? ''} ${form.sender?.lastName ?? ''}`.trim();

  return (
    <div className="min-h-screen bg-stone-50 py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6">
          <ChevronLeft className="h-4 w-4" /> {t('forms.detail.back')}
        </button>

        <div className="mb-6">
          <p className="text-sm text-stone-500 mb-1">{t('forms.fill.from', { name: therapistName })}</p>
          <h1 className="text-2xl font-bold text-stone-900">{form.title}</h1>
          {form.description && <p className="text-stone-500 mt-2">{form.description}</p>}
        </div>

        {validationErrors.length > 0 && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t('forms.fill.requiredError')}
          </div>
        )}

        <div className="space-y-5">
          {(form.questions ?? []).map((q: FormQuestion, idx: number) => (
            <div key={q.id} className={`bg-white rounded-xl border p-5 shadow-sm ${validationErrors.includes(q.id) ? 'border-rose-300' : 'border-stone-200'}`}>
              <p className="text-sm font-medium text-stone-800 mb-3">
                {idx + 1}. {q.label}
                {q.required && <span className="text-rose-500 ml-1">*</span>}
              </p>

              <QuestionInput question={q} value={answers[q.id] ?? ''} onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))} />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={handleSubmit} loading={submitMutation.isPending} size="lg">
            {t('forms.fill.submit')}
          </Button>
        </div>

        {submitMutation.isError && (
          <p className="text-sm text-rose-600 mt-3 text-right">{t('forms.fill.submitError')}</p>
        )}
      </div>
    </div>
  );
}

function QuestionInput({ question: q, value, onChange }: { question: FormQuestion; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();

  if (q.type === 'SHORT_TEXT') {
    return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder={t('forms.fill.textPlaceholder')} />;
  }

  if (q.type === 'LONG_TEXT') {
    return <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" placeholder={t('forms.fill.textPlaceholder')} />;
  }

  if (q.type === 'YES_NO') {
    return (
      <div className="flex gap-3">
        {['Yes', 'No'].map((opt) => (
          <button key={opt} type="button" onClick={() => onChange(opt)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${value === opt ? 'bg-teal-600 text-white border-teal-600' : 'border-stone-300 text-stone-600 hover:bg-stone-50'}`}>
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (q.type === 'SINGLE_CHOICE') {
    return (
      <div className="space-y-2">
        {q.options.map((opt) => (
          <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
            <input type="radio" name={q.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="text-teal-600 border-stone-300" />
            <span className="text-sm text-stone-700">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (q.type === 'MULTIPLE_CHOICE') {
    const selected: string[] = value ? JSON.parse(value) : [];
    const toggle = (opt: string) => {
      const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
      onChange(JSON.stringify(next));
    };
    return (
      <div className="space-y-2">
        {q.options.map((opt) => (
          <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" value={opt} checked={selected.includes(opt)} onChange={() => toggle(opt)} className="rounded text-teal-600 border-stone-300" />
            <span className="text-sm text-stone-700">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (q.type === 'SCALE') {
    const min = q.scaleMin ?? 1;
    const max = q.scaleMax ?? 10;
    const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div>
        <div className="flex gap-2 flex-wrap">
          {nums.map((n) => (
            <button key={n} type="button" onClick={() => onChange(String(n))} className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${value === String(n) ? 'bg-teal-600 text-white border-teal-600' : 'border-stone-300 text-stone-600 hover:bg-stone-50'}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-stone-400 mt-1 px-0.5">
          <span>{t('forms.fill.scaleMin', { min })}</span>
          <span>{t('forms.fill.scaleMax', { max })}</span>
        </div>
      </div>
    );
  }

  return null;
}
