import { CheckCircle } from 'lucide-react';

export interface WizardStepItem {
  id: number;
  name: string;
}

interface WizardStepperProps {
  steps: WizardStepItem[];
  currentStep: number;
  onStepClick?: (id: number) => void;
  formatStepLabel?: (id: number) => string;
}

export const WizardStepper = ({
  steps,
  currentStep,
  onStepClick,
  formatStepLabel,
}: WizardStepperProps) => {
  const total = Math.max(steps.length - 1, 1);
  const completionPercent = steps.length > 1 ? ((Math.max(currentStep, 1) - 1) / total) * 100 : 0;

  return (
    <nav aria-label="Progress" className="w-full md:relative">
      <div className="hidden md:block absolute top-4 left-0 right-0 h-px bg-stone-200" aria-hidden />
      <div
        className="hidden md:block absolute top-4 left-0 h-px bg-teal-600 transition-all duration-300"
        style={{ width: `${completionPercent}%` }}
        aria-hidden
      />
      <ol role="list" className="space-y-3 md:space-y-0 md:flex md:items-start">
        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = !!onStepClick && step.id < currentStep;

          return (
            <li key={step.id} className="relative z-10 md:flex-1 md:min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (isClickable) onStepClick(step.id);
                }}
                disabled={!isClickable}
                className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors md:flex-col md:items-center md:gap-2 md:border-0 md:bg-transparent md:px-2 md:py-0 ${
                  isClickable ? 'cursor-pointer hover:bg-stone-50 md:hover:bg-transparent' : 'cursor-default'
                } ${
                  isCurrent
                    ? 'border-teal-200 bg-teal-50 md:border-0 md:bg-transparent'
                    : 'border-stone-200 bg-white md:border-0 md:bg-transparent'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                    isCompleted
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : isCurrent
                        ? 'border-teal-600 bg-white text-teal-700'
                        : 'border-stone-300 bg-white text-stone-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.id}
                </span>
                <span className="min-w-0 md:text-center">
                  <span
                    className={`block text-xs font-medium ${
                      isCompleted || isCurrent ? 'text-teal-700' : 'text-stone-500'
                    }`}
                  >
                    {formatStepLabel ? formatStepLabel(step.id) : `Step ${step.id}`}
                  </span>
                  <span className="block text-sm font-medium text-stone-900 truncate">{step.name}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
