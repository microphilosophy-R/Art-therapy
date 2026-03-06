import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <nav aria-label="Progress" className="w-full md:relative mb-12">
      <div className="hidden md:block absolute top-4 left-0 right-0 h-px bg-ink-100" aria-hidden />
      <motion.div
        className="hidden md:block absolute top-4 left-0 h-px bg-celadon-500 origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: completionPercent / 100 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        aria-hidden
      />
      <ol role="list" className="space-y-4 md:space-y-0 md:flex md:items-start">
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
                className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all duration-300 md:flex-col md:items-center md:gap-3 md:border-0 md:bg-transparent md:px-2 md:py-0 ${isClickable ? 'cursor-pointer hover:bg-ivory-200 md:hover:bg-transparent' : 'cursor-default'
                  } ${isCurrent
                    ? 'border-celadon-300 bg-ivory-50 md:border-0 md:bg-transparent shadow-gentle md:shadow-none'
                    : 'border-ink-100 bg-ivory-50 md:border-0 md:bg-transparent'
                  }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-serif font-medium transition-all duration-500 shadow-sm ${isCompleted
                      ? 'border-celadon-600 bg-celadon-600 text-ivory-50 shadow-celadon-200'
                      : isCurrent
                        ? 'border-celadon-500 bg-ivory-50 text-celadon-700 ring-4 ring-celadon-50 scale-110'
                        : 'border-ink-200 bg-ivory-50 text-ink-400'
                    }`}
                >
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : step.id}
                </span>
                <span className="min-w-0 md:text-center mt-1">
                  <span
                    className={`block text-xs font-serif uppercase tracking-widest mb-1 transition-colors ${isCompleted || isCurrent ? 'text-celadon-700 font-semibold' : 'text-ink-400'
                      }`}
                  >
                    {formatStepLabel ? formatStepLabel(step.id) : `Step ${step.id}`}
                  </span>
                  <span className={`block text-[15px] font-sans transition-colors ${isCurrent ? 'text-ink-900 font-medium' : 'text-ink-600'
                    }`}>{step.name}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
