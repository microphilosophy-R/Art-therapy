import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  listTherapyPlanTemplates,
  deleteTherapyPlanTemplate,
} from '../../api/therapyPlanTemplates';
import { useAuthStore } from '../../store/authStore';
import type { TherapyPlanTemplate, TherapyPlanType } from '../../types';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: TherapyPlanType;
  onSelect: (template: TherapyPlanTemplate) => void;
}

export const TemplatePickerModal = ({
  isOpen,
  onClose,
  planType,
  onSelect,
}: TemplatePickerModalProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['therapyPlanTemplates', planType],
    queryFn: () => listTherapyPlanTemplates(planType),
    enabled: isOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTherapyPlanTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapyPlanTemplates'] });
    },
  });

  if (!isOpen) return null;

  const mine = templates.filter((t) => t.createdById === user?.id);
  const publicOthers = templates.filter((t) => t.isPublic && t.createdById !== user?.id);

  const renderList = (items: TherapyPlanTemplate[], showDelete: boolean) => {
    if (items.length === 0) {
      return (
        <p className="text-sm text-stone-400 italic py-2">
          {t('therapyPlans.templates.noTemplates')}
        </p>
      );
    }
    return (
      <ul className="space-y-2">
        {items.map((tpl) => (
          <li
            key={tpl.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">{tpl.name}</p>
              {tpl.isPublic && (
                <span className="text-xs text-teal-600">{t('therapyPlans.templates.makePublic')}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelect(tpl);
                  onClose();
                }}
              >
                {t('therapyPlans.templates.useTemplate')}
              </Button>
              {showDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('therapyPlans.templates.confirmDelete'))) {
                      deleteMutation.mutate(tpl.id);
                    }
                  }}
                  className="p-1.5 rounded-md text-stone-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  aria-label="Delete template"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md max-h-[80vh] flex flex-col bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <h2 className="text-base font-semibold text-stone-800">
            {t('therapyPlans.templates.loadTemplate')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {isLoading ? (
            <p className="text-sm text-stone-400">{t('common.loading', 'Loading…')}</p>
          ) : (
            <>
              <section>
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  {t('therapyPlans.templates.myTemplates')}
                </h3>
                {renderList(mine, true)}
              </section>

              {publicOthers.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                    {t('therapyPlans.templates.publicTemplates')}
                  </h3>
                  {renderList(publicOthers, false)}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
