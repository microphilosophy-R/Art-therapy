import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, GripVertical, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { createForm, sendForm, type QuestionType } from '../../api/forms';
import api from '../../api/axios';
import type { User } from '../../types';
import type { PaginatedResponse } from '../../types';

const questionSchema = z.object({
  type: z.enum(['SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE', 'YES_NO']),
  label: z.string().min(1, 'Question text is required'),
  required: z.boolean(),
  options: z.array(z.string()),
  scaleMin: z.number().optional(),
  scaleMax: z.number().optional(),
});

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  recipientId: z.string().min(1, 'Please select a client'),
  questions: z.array(questionSchema).min(1, 'Add at least one question'),
});

type FormValues = z.infer<typeof formSchema>;

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'SHORT_TEXT', label: 'Short Text' },
  { value: 'LONG_TEXT', label: 'Long Text / Paragraph' },
  { value: 'SINGLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'SCALE', label: 'Rating Scale' },
  { value: 'YES_NO', label: 'Yes / No' },
];

export function ComposeForm() {
  const navigate = useNavigate();
  const [expandedIdx, setExpandedIdx] = useState<number>(0);
  const [sendNow, setSendNow] = useState(true);

  const { data: clients } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<User>>('/admin/users', { params: { limit: 100 } });
      return data.data.filter((u) => u.role === 'CLIENT');
    },
  });

  const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      recipientId: '',
      questions: [{ type: 'SHORT_TEXT', label: '', required: false, options: [] }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const form = await createForm({
        title: values.title,
        description: values.description,
        recipientId: values.recipientId,
        questions: values.questions.map((q, i) => ({ ...q, order: i })),
      });
      if (sendNow) {
        await sendForm(form.id);
      }
      return form;
    },
    onSuccess: () => navigate('/dashboard/therapist'),
  });

  const addQuestion = () => {
    append({ type: 'SHORT_TEXT', label: '', required: false, options: [] });
    setExpandedIdx(fields.length);
  };

  return (
    <div className="min-h-screen bg-stone-50 py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900">New Client Form</h1>
          <p className="text-stone-500 mt-1">Create a questionnaire or feedback form to send to a client.</p>
        </div>

        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-6">
          {/* Meta */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Form Title</label>
              <input {...register('title')} placeholder="e.g. Initial Intake Assessment" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Description <span className="text-stone-400 font-normal">(optional)</span></label>
              <textarea {...register('description')} rows={2} placeholder="Brief instructions for the client" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Send to Client</label>
              <select {...register('recipientId')} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option value="">Select a client…</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                ))}
              </select>
              {errors.recipientId && <p className="text-xs text-rose-600 mt-1">{errors.recipientId.message}</p>}
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            {fields.map((field, idx) => {
              const qType = watch(`questions.${idx}.type`);
              const isExpanded = expandedIdx === idx;
              return (
                <div key={field.id} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(isExpanded ? -1 : idx)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
                  >
                    <GripVertical className="h-4 w-4 text-stone-300 shrink-0" />
                    <span className="flex-1 text-sm text-stone-700 font-medium truncate">
                      {watch(`questions.${idx}.label`) || `Question ${idx + 1}`}
                    </span>
                    <span className="text-xs text-stone-400 shrink-0">{QUESTION_TYPES.find(t => t.value === qType)?.label}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-stone-100">
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-stone-600 mb-1">Question Text</label>
                          <input {...register(`questions.${idx}.label`)} placeholder="Enter your question…" className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          {errors.questions?.[idx]?.label && <p className="text-xs text-rose-600 mt-1">{errors.questions[idx]?.label?.message}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-600 mb-1">Type</label>
                          <select {...register(`questions.${idx}.type`)} className="w-full border border-stone-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                            {QUESTION_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                            <input type="checkbox" {...register(`questions.${idx}.required`)} className="rounded border-stone-300 text-teal-600" />
                            Required
                          </label>
                        </div>
                      </div>

                      {/* Choice options */}
                      {(qType === 'SINGLE_CHOICE' || qType === 'MULTIPLE_CHOICE') && (
                        <OptionsEditor idx={idx} watch={watch} setValue={setValue} />
                      )}

                      {/* Scale */}
                      {qType === 'SCALE' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">Min value</label>
                            <input type="number" {...register(`questions.${idx}.scaleMin`, { valueAsNumber: true })} defaultValue={1} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">Max value</label>
                            <input type="number" {...register(`questions.${idx}.scaleMax`, { valueAsNumber: true })} defaultValue={10} className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button type="button" onClick={() => remove(idx)} className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700">
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button type="button" onClick={addQuestion} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 rounded-xl text-sm text-stone-500 hover:border-teal-400 hover:text-teal-600 transition-colors">
              <Plus className="h-4 w-4" /> Add Question
            </button>
            {errors.questions && typeof errors.questions.message === 'string' && (
              <p className="text-xs text-rose-600">{errors.questions.message}</p>
            )}
          </div>

          {/* Send option + submit */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer flex-1">
              <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} className="rounded border-stone-300 text-teal-600" />
              Send to client immediately after saving
            </label>
            <Button type="submit" loading={createMutation.isPending} className="shrink-0">
              <Send className="h-4 w-4" />
              {sendNow ? 'Save & Send' : 'Save as Draft'}
            </Button>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-rose-600">Failed to create form. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}

function OptionsEditor({ idx, watch, setValue }: { idx: number; watch: any; setValue: any }) {
  const options: string[] = watch(`questions.${idx}.options`) ?? [];

  const addOption = () => setValue(`questions.${idx}.options`, [...options, '']);
  const removeOption = (oi: number) => setValue(`questions.${idx}.options`, options.filter((_, i) => i !== oi));
  const updateOption = (oi: number, val: string) => {
    const next = [...options];
    next[oi] = val;
    setValue(`questions.${idx}.options`, next);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-stone-600">Answer Options</label>
      {options.map((opt, oi) => (
        <div key={oi} className="flex items-center gap-2">
          <input
            value={opt}
            onChange={(e) => updateOption(oi, e.target.value)}
            placeholder={`Option ${oi + 1}`}
            className="flex-1 border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button type="button" onClick={() => removeOption(oi)} className="text-stone-400 hover:text-rose-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700">
        <Plus className="h-3 w-3" /> Add option
      </button>
    </div>
  );
}
