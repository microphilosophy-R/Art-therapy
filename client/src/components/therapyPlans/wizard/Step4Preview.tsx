import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Phone,
  Info,
  Image as ImageIcon,
  Video,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { TherapyPlanFormValues } from '@/pages/therapy-plans';
import { getDefaultPosterUrl } from '../../../utils/defaultPosters';

interface Step4Props {
  values: TherapyPlanFormValues;
  posterFile: File | null;
  videoFile: File | null;
  stagedGalleryFiles: File[];
  pdfFiles: File[];
  existingGalleryCount?: number;
  existingVideoUrl?: string | null;
  existingPdfCount?: number;
  translationPanel?: React.ReactNode;
}

export const Step4Preview = ({
  values,
  posterFile,
  videoFile,
  stagedGalleryFiles,
  pdfFiles,
  existingGalleryCount = 0,
  existingVideoUrl = null,
  existingPdfCount = 0,
  translationPanel,
}: Step4Props) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const dateFormatLocale = isZh ? zhCN : undefined;

  const totalGalleryCount = existingGalleryCount + stagedGalleryFiles.length;
  const hasVideo = !!existingVideoUrl || !!videoFile;
  const totalPdfCount = existingPdfCount + pdfFiles.length;

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '--';
    try {
      return format(new Date(dateStr), isZh ? 'yyyy年M月d日 HH:mm' : 'MMM d, yyyy HH:mm', {
        locale: dateFormatLocale,
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return '--';
    try {
      return format(new Date(`${dateStr}T00:00:00`), isZh ? 'yyyy年M月d日' : 'MMM d, yyyy', {
        locale: dateFormatLocale,
      });
    } catch {
      return dateStr;
    }
  };

  const getPosterPreview = () => {
    if (posterFile) return URL.createObjectURL(posterFile);
    if (values.poster?.type === 'custom') return values.poster.url;
    if (values.poster?.type === 'default') return getDefaultPosterUrl(values.poster.id);
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {translationPanel}
      <div className="bg-stone-50 rounded-xl p-6 border border-stone-200">
        <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
          <Info className="h-5 w-5 text-teal-600" />
          {isZh ? '计划预览' : 'Plan Preview'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                {t('therapyPlans.form.title')}
              </span>
              <h2 className="text-xl font-bold text-stone-900">{values.title || '--'}</h2>
              {values.slogan && (
                <p className="text-stone-500 italic mt-1 font-medium">"{values.slogan}"</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {values.type === 'PERSONAL_CONSULT' ? (
                <>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-stone-400 block">
                        {t('therapyPlans.form.consultDateRange')}
                      </span>
                      <span className="text-sm font-medium">
                        {formatDateOnly(values.consultDateStart)} - {formatDateOnly(values.consultDateEnd)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-stone-400 block">
                        {t('therapyPlans.form.consultDailyHours')}
                      </span>
                      <span className="text-sm font-medium">
                        {values.consultWorkStart || '--:--'} - {values.consultWorkEnd || '--:--'} (UTC+8)
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-teal-600 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-stone-400 block">{t('therapyPlans.form.startTime')}</span>
                      <span className="text-sm font-medium">{formatDateTime(values.startTime)}</span>
                    </div>
                  </div>
                  {values.endTime && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-teal-600 mt-1 flex-shrink-0" />
                      <div>
                        <span className="text-xs text-stone-400 block">{t('therapyPlans.form.endTime')}</span>
                        <span className="text-sm font-medium">{formatDateTime(values.endTime)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-teal-600 mt-1 flex-shrink-0" />
                <div>
                  <span className="text-xs text-stone-400 block">{t('therapyPlans.form.location')}</span>
                  <span className="text-sm font-medium">{values.location || '--'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-teal-600 mt-1 flex-shrink-0" />
                <div>
                  <span className="text-xs text-stone-400 block">{t('therapyPlans.form.contactInfo')}</span>
                  <span className="text-sm font-medium">{values.contactInfo || '--'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              {values.maxParticipants && (
                <div className="bg-white px-3 py-2 rounded-lg border border-stone-200">
                  <span className="text-xs text-stone-400 block">{t('therapyPlans.form.maxParticipants')}</span>
                  <span className="text-sm font-bold flex items-center gap-1">
                    <Users className="h-3 w-3" /> {values.maxParticipants}
                  </span>
                </div>
              )}
              {values.price && (
                <div className="bg-white px-3 py-2 rounded-lg border border-stone-200">
                  <span className="text-xs text-stone-400 block">{t('therapyPlans.form.price')}</span>
                  <span className="text-sm font-bold text-teal-700">¥ {values.price}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
                {t('therapyPlans.form.poster')}
              </span>
              <div className="aspect-video rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-stone-100">
                {getPosterPreview() ? (
                  <img
                    src={getPosterPreview()!}
                    alt="Poster Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-stone-400 block mb-1">{t('therapyPlans.form.gallerySection')}</span>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-stone-400" />
                  <span className="text-sm font-medium">{totalGalleryCount} {isZh ? '张图片' : 'images'}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-stone-400 block mb-1">{t('therapyPlans.form.videoSection')}</span>
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-stone-400" />
                  <span className="text-sm font-medium">{hasVideo ? '1' : '0'} {isZh ? '个视频' : 'video'}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs text-stone-400 block mb-1">{t('therapyPlans.form.pdfSection')}</span>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-400" />
                <span className="text-sm font-medium">{totalPdfCount} {isZh ? '份文档' : 'PDFs'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-200">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2">
            {t('therapyPlans.form.introduction')}
          </span>
          <div className="prose prose-sm max-w-none text-stone-700 leading-relaxed whitespace-pre-wrap">
            {values.introduction || (isZh ? '暂无简介。' : 'No introduction provided.')}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
        <Info className="h-5 w-5 text-amber-600 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed">
          {isZh
            ? '请仔细检查以上信息。提交后，计划将进入审核队列。在管理员批准前，您将无法再次编辑该计划。'
            : 'Please review the information above carefully. Once submitted, your plan enters review and cannot be edited until approved.'}
        </p>
      </div>
    </div>
  );
};
