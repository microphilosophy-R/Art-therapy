import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, ImagePlus, Video, X } from 'lucide-react';
import { UploadProgress } from '../../ui/UploadProgress';
import { validateFile } from '../../../utils/fileValidation';
import type { TherapyPlanImage } from '../../../types';

export interface Step3Props {
    isLoading?: boolean;
    videoUploadPercent?: number;

    videoFile: File | null;
    setVideoFile: (file: File | null) => void;
    existingVideoUrl?: string | null;
    videoError: string | null;
    setVideoError: (err: string | null) => void;

    galleryImages: TherapyPlanImage[];
    stagedGalleryFiles: File[];
    setStagedGalleryFiles: React.Dispatch<React.SetStateAction<File[]>>;
    onAddGalleryImage?: (file: File) => void;
    onDeleteGalleryImage?: (id: string) => void;
    isAddingGalleryImage?: boolean;
    galleryError: string | null;
    setGalleryError: (err: string | null) => void;
    galleryUploadError?: string | null;

    pdfFiles: File[];
    setPdfFiles: React.Dispatch<React.SetStateAction<File[]>>;
    existingPdfs: Array<{ id: string; url: string; name: string }>;
    onAddPdf?: (file: File) => void;
    onDeletePdf?: (id: string) => void;
    isAddingPdf?: boolean;
    pdfError: string | null;
    setPdfError: (err: string | null) => void;

    planType: string;
}

export const Step3Imports = ({
    isLoading,
    videoUploadPercent = 0,
    videoFile,
    setVideoFile,
    existingVideoUrl,
    videoError,
    setVideoError,
    galleryImages,
    stagedGalleryFiles,
    setStagedGalleryFiles,
    onAddGalleryImage,
    onDeleteGalleryImage,
    isAddingGalleryImage,
    galleryError,
    setGalleryError,
    galleryUploadError,
    pdfFiles,
    setPdfFiles,
    existingPdfs,
    onAddPdf,
    onDeletePdf,
    isAddingPdf,
    pdfError,
    setPdfError,
    planType,
}: Step3Props) => {
    const { t } = useTranslation();
    const videoInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const totalGallery = galleryImages.length + stagedGalleryFiles.length;
    const totalPdfs = existingPdfs.length + pdfFiles.length;

    return (
        <div className="space-y-8">
            {/* Video upload — Group/Art/Retreat only */}
            {planType !== 'PERSONAL_CONSULT' && (
                <div>
                    <p className="text-sm font-medium text-stone-700 mb-2">{t('therapyPlans.form.videoSection', 'Promo Video (optional)')}</p>
                    <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm"
                        className="sr-only"
                        disabled={isLoading}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const err = validateFile(file, { maxMb: 100, accept: ['mp4', 'mov', 'webm'] });
                            if (err) { setVideoError(err); e.target.value = ''; return; }
                            setVideoError(null);
                            setVideoFile(file);
                            e.target.value = '';
                        }}
                    />
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => videoInputRef.current?.click()}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${videoFile
                            ? 'border-teal-500 text-teal-700 bg-teal-50'
                            : 'border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700'
                            }`}
                    >
                        <Video className="h-4 w-4" />
                        {videoFile ? `${videoFile.name} ✓` : t('therapyPlans.form.uploadVideo', 'Upload video')}
                        {videoFile && (
                            <X
                                className="h-3.5 w-3.5 ml-1 text-stone-400 hover:text-rose-500"
                                onClick={(e) => { e.stopPropagation(); setVideoFile(null); }}
                            />
                        )}
                    </button>
                    {videoError && <p className="mt-1 text-xs text-rose-600">{videoError}</p>}
                    {videoUploadPercent > 0 && videoUploadPercent < 100 && (
                        <UploadProgress percent={videoUploadPercent} />
                    )}
                    {!videoFile && existingVideoUrl && (
                        <video
                            src={existingVideoUrl}
                            controls
                            className="mt-2 rounded-lg max-h-40 border border-stone-200"
                        />
                    )}
                    <p className="mt-1.5 text-xs text-stone-400">{t('therapyPlans.form.videoHint', 'mp4 / mov / webm · max 100 MB')}</p>
                </div>
            )}

            {/* Gallery images */}
            <div>
                <p className="text-sm font-medium text-stone-700 mb-2">
                    {t('therapyPlans.form.gallerySection', 'Gallery Images (up to 9)')}
                </p>
                <div className="flex flex-wrap gap-2">
                    {galleryImages.map((img) => (
                        <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone-200">
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                            {onDeleteGalleryImage && (
                                <button
                                    type="button"
                                    onClick={() => onDeleteGalleryImage(img.id)}
                                    className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white hover:bg-rose-600 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}

                    {stagedGalleryFiles.map((file, idx) => {
                        const tempUrl = URL.createObjectURL(file);
                        return (
                            <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-teal-200">
                                <img src={tempUrl} alt="" className="w-full h-full object-cover" onLoad={() => URL.revokeObjectURL(tempUrl)} />
                                <button
                                    type="button"
                                    onClick={() => setStagedGalleryFiles(prev => prev.filter((_, i) => i !== idx))}
                                    className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 text-white hover:bg-rose-600 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-teal-600 text-[10px] text-white text-center py-0.5">
                                    {t('common.new', 'New')}
                                </div>
                            </div>
                        );
                    })}

                    {totalGallery < 9 && (
                        <>
                            <input
                                ref={galleryInputRef}
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                disabled={isAddingGalleryImage}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const err = validateFile(file, { maxMb: 10, accept: ['jpg', 'jpeg', 'png', 'webp', 'gif'] });
                                    if (err) { setGalleryError(err); e.target.value = ''; return; }
                                    setGalleryError(null);
                                    if (onAddGalleryImage) {
                                        onAddGalleryImage(file);
                                    } else {
                                        setStagedGalleryFiles(prev => [...prev, file]);
                                    }
                                    e.target.value = '';
                                }}
                            />
                            <button
                                type="button"
                                disabled={isAddingGalleryImage}
                                onClick={() => galleryInputRef.current?.click()}
                                className="w-20 h-20 rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isAddingGalleryImage
                                    ? <span className="text-xs text-center leading-tight">{t('common.uploading', 'Uploading…')}</span>
                                    : <><ImagePlus className="h-5 w-5" /><span className="text-xs mt-1">{t('therapyPlans.form.addImage', 'Add')}</span></>
                                }
                            </button>
                        </>
                    )}
                </div>
                {galleryError && <p className="mt-1 text-xs text-rose-600">{galleryError}</p>}
                {galleryUploadError && <p className="mt-1 text-xs text-rose-600">{galleryUploadError}</p>}
                {galleryImages.length === 0 && stagedGalleryFiles.length === 0 && !onAddGalleryImage && (
                    <p className="text-xs text-stone-400">{t('therapyPlans.form.galleryHint', 'Save the plan first to add gallery images')}</p>
                )}
            </div>

            {/* Multiple PDF uploads */}
            <div>
                <p className="text-sm font-medium text-stone-700 mb-2">
                    {t('therapyPlans.form.pdfSection', 'Supplementary PDFs (up to 6)')}
                </p>
                <div className="flex flex-col gap-2">
                    {existingPdfs.map((pdf) => (
                        <div key={pdf.id} className="flex items-center justify-between p-3 border border-stone-200 rounded-lg bg-white">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="h-5 w-5 text-stone-400 flex-shrink-0" />
                                <a href={pdf.url} target="_blank" rel="noreferrer" className="text-sm text-teal-600 hover:underline truncate">
                                    {pdf.name}
                                </a>
                            </div>
                            {onDeletePdf && (
                                <button
                                    type="button"
                                    onClick={() => onDeletePdf(pdf.id)}
                                    className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}

                    {pdfFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border border-teal-200 bg-teal-50 rounded-lg">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="h-5 w-5 text-teal-600 flex-shrink-0" />
                                <span className="text-sm text-teal-800 truncate">{file.name}</span>
                                <span className="text-xs text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded font-medium ml-2">{t('common.new')}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPdfFiles((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-teal-600 hover:text-rose-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}

                    {totalPdfs < 6 && (
                        <>
                            <input
                                ref={pdfInputRef}
                                type="file"
                                accept="application/pdf"
                                className="sr-only"
                                disabled={isAddingPdf || isLoading}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const err = validateFile(file, { maxMb: 20, accept: ['pdf'] });
                                    if (err) { setPdfError(err); e.target.value = ''; return; }
                                    setPdfError(null);
                                    if (onAddPdf) {
                                        onAddPdf(file);
                                    } else {
                                        setPdfFiles((prev) => [...prev, file]);
                                    }
                                    e.target.value = '';
                                }}
                            />
                            <button
                                type="button"
                                disabled={isAddingPdf || isLoading}
                                onClick={() => pdfInputRef.current?.click()}
                                className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 rounded-lg hover:border-stone-400 hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isAddingPdf ? (
                                    <span className="text-sm text-stone-500">{t('common.uploading', 'Uploading…')}</span>
                                ) : (
                                    <>
                                        <FileText className="h-4 w-4 text-stone-400" />
                                        <span className="text-sm text-stone-500 font-medium">{t('therapyPlans.form.uploadPdf', 'Add PDF')}</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
                {pdfError && <p className="mt-2 text-xs text-rose-600">{pdfError}</p>}
                {totalPdfs === 0 && !onAddPdf && (
                    <p className="mt-1.5 text-xs text-stone-400">{t('therapyPlans.form.pdfHint', 'Save the plan first to add PDFs if editing.')}</p>
                )}
            </div>
        </div>
    );
};
