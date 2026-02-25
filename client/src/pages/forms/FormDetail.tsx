import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Archive, Users, CheckCircle, Clock, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getFormWithResponses, archiveForm, type FormQuestion, type FormAnswer } from '../../api/forms';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-stone-100 text-stone-600',
  SENT: 'bg-blue-50 text-blue-700',
  SUBMITTED: 'bg-teal-50 text-teal-700',
  ARCHIVED: 'bg-stone-100 text-stone-500',
};

function renderAnswerValue(q: FormQuestion, value: string) {
  if (q.type === 'MULTIPLE_CHOICE') {
    try {
      const arr: string[] = JSON.parse(value);
      return arr.join(', ');
    } catch {
      return value;
    }
  }
  return value;
}

export function FormDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: form, isLoading } = useQuery({
    queryKey: ['form-detail', id],
    queryFn: () => getFormWithResponses(id!),
    enabled: !!id,
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveForm(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sent-forms'] });
      navigate('/dashboard/therapist');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!form) return null;

  const questions: FormQuestion[] = form.questions ?? [];
  const responses = form.responses ?? [];

  return (
    <div className="min-h-screen bg-stone-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[form.status] ?? ''}`}>
                  {form.status}
                </span>
              </div>
              <h1 className="text-xl font-bold text-stone-900">{form.title}</h1>
              {form.description && <p className="text-stone-500 text-sm mt-1">{form.description}</p>}
            </div>
            {form.status !== 'ARCHIVED' && (
              <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate()} loading={archiveMutation.isPending}>
                <Archive className="h-4 w-4" /> Archive
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-stone-100">
            <div>
              <p className="text-xs text-stone-400">Recipient</p>
              <p className="text-sm font-medium text-stone-700 mt-0.5">{form.recipient?.firstName} {form.recipient?.lastName}</p>
              <p className="text-xs text-stone-400">{form.recipient?.email}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Sent</p>
              <p className="text-sm font-medium text-stone-700 mt-0.5">
                {form.sentAt ? new Date(form.sentAt).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Submitted</p>
              <p className="text-sm font-medium text-stone-700 mt-0.5">
                {form.submittedAt ? new Date(form.submittedAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center gap-3">
            <FileText className="h-5 w-5 text-stone-400" />
            <div>
              <p className="text-xs text-stone-400">Questions</p>
              <p className="text-lg font-bold text-stone-900">{questions.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-xs text-stone-400">Responses</p>
              <p className="text-lg font-bold text-stone-900">{responses.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center gap-3">
            {form.status === 'SUBMITTED'
              ? <CheckCircle className="h-5 w-5 text-teal-500" />
              : <Clock className="h-5 w-5 text-amber-400" />}
            <div>
              <p className="text-xs text-stone-400">Status</p>
              <p className="text-sm font-semibold text-stone-900">{form.status}</p>
            </div>
          </div>
        </div>

        {/* Responses */}
        {responses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center shadow-sm">
            <Clock className="h-10 w-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500 font-medium">Awaiting Response</p>
            <p className="text-stone-400 text-sm mt-1">The client has not yet submitted this form.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-stone-900">Client Responses</h2>
            {responses.map((resp, rIdx) => (
              <div key={resp.id} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
                <p className="text-xs text-stone-400 mb-4">
                  Submission {rIdx + 1} — {new Date(resp.submittedAt).toLocaleString()}
                </p>
                <div className="space-y-4">
                  {questions.map((q, qIdx) => {
                    const answer: FormAnswer | undefined = resp.answers?.find((a) => a.questionId === q.id);
                    return (
                      <div key={q.id} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                        <p className="text-xs font-medium text-stone-500 mb-1">{qIdx + 1}. {q.label}</p>
                        <p className="text-sm text-stone-800">
                          {answer ? renderAnswerValue(q, answer.value) : <span className="text-stone-400 italic">Not answered</span>}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Questions list (for reference when no responses yet) */}
        {responses.length === 0 && questions.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-base font-semibold text-stone-900">Form Questions</h2>
            {questions.map((q, i) => (
              <div key={q.id} className="bg-white rounded-xl border border-stone-200 px-4 py-3 text-sm shadow-sm">
                <span className="text-stone-400 mr-2">{i + 1}.</span>
                <span className="text-stone-800">{q.label}</span>
                {q.required && <span className="ml-2 text-xs text-rose-400">Required</span>}
                <span className="ml-2 text-xs text-stone-400">({q.type.replace(/_/g, ' ')})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
