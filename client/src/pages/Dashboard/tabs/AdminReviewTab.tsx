import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, FileText, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import api from '../../../api/axios';

type ReviewType = 'profiles' | 'plans' | 'products' | 'certificates';

export const AdminReviewTab = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ReviewType>('profiles');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const res = await api.get('/admin/profiles/pending');
      return res.data.data;
    },
    enabled: activeTab === 'profiles',
  });

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const res = await api.get('/admin/therapy-plans/pending');
      return res.data.data;
    },
    enabled: activeTab === 'plans',
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await api.get('/admin/products/pending');
      return res.data.data;
    },
    enabled: activeTab === 'products',
  });

  const { data: certificates, isLoading: loadingCerts } = useQuery({
    queryKey: ['admin-certificates'],
    queryFn: async () => {
      const res = await api.get('/admin/certificates');
      return res.data.data.filter((c: any) => c.status === 'PENDING');
    },
    enabled: activeTab === 'certificates',
  });

  const reviewProfileMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      await api.post(`/admin/profiles/${id}/review`, { action, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      setRejectingId(null);
      setRejectReason('');
    },
  });

  const reviewPlanMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      await api.post(`/admin/therapy-plans/${id}/review`, { action, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setRejectingId(null);
      setRejectReason('');
    },
  });

  const reviewProductMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      await api.post(`/admin/products/${id}/review`, { action, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setRejectingId(null);
      setRejectReason('');
    },
  });

  const reviewCertMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      await api.patch(`/admin/certificates/${id}`, { status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED', rejectionReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-certificates'] });
      setRejectingId(null);
      setRejectReason('');
    },
  });

  const handleApprove = (id: string, type: ReviewType) => {
    if (type === 'profiles') reviewProfileMutation.mutate({ id, action: 'APPROVE' });
    else if (type === 'plans') reviewPlanMutation.mutate({ id, action: 'APPROVE' });
    else if (type === 'products') reviewProductMutation.mutate({ id, action: 'APPROVE' });
    else if (type === 'certificates') reviewCertMutation.mutate({ id, action: 'APPROVE' });
  };

  const handleReject = (id: string, type: ReviewType) => {
    if (!rejectReason.trim()) return;
    if (type === 'profiles') reviewProfileMutation.mutate({ id, action: 'REJECT', reason: rejectReason });
    else if (type === 'plans') reviewPlanMutation.mutate({ id, action: 'REJECT', reason: rejectReason });
    else if (type === 'products') reviewProductMutation.mutate({ id, action: 'REJECT', reason: rejectReason });
    else if (type === 'certificates') reviewCertMutation.mutate({ id, action: 'REJECT', reason: rejectReason });
  };

  const isLoading = loadingProfiles || loadingPlans || loadingProducts || loadingCerts;
  const items = activeTab === 'profiles' ? profiles : activeTab === 'plans' ? plans : activeTab === 'products' ? products : certificates;

  return (
    <div>
      <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('dashboard.review.reviewQueue')}</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-stone-200">
        {(['profiles', 'plans', 'products', 'certificates'] as ReviewType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab ? 'border-b-2 border-teal-600 text-teal-600' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !items || items.length === 0 ? (
        <div className="text-center py-12 text-stone-400">{t('dashboard.review.noPending', { type: activeTab })}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="border border-stone-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-900">{item.title || item.type || item.certificateType}</h3>
                  <p className="text-sm text-stone-600 mt-1">
                    {activeTab === 'profiles' && `${item.user?.firstName} ${item.user?.lastName}`}
                    {activeTab === 'plans' && item.introduction?.substring(0, 100)}
                    {activeTab === 'products' && item.description?.substring(0, 100)}
                    {activeTab === 'certificates' && `${item.profile?.user?.firstName} ${item.profile?.user?.lastName} - ${item.profile?.user?.email}`}
                  </p>
                  {item.submittedAt && (
                    <p className="text-xs text-stone-400 mt-1">{t('dashboard.review.submitted')}: {new Date(item.submittedAt).toLocaleDateString()}</p>
                  )}
                  {item.appliedAt && (
                    <p className="text-xs text-stone-400 mt-1">{t('dashboard.review.submitted')}: {new Date(item.appliedAt).toLocaleDateString()}</p>
                  )}

                  {activeTab === 'certificates' && item.certificateUrls && item.certificateUrls.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-stone-600">Uploaded Documents:</p>
                      {item.certificateUrls.map((url: string, idx: number) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
                        >
                          <FileText className="h-4 w-4" />
                          <span>Document {idx + 1}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}

                  {activeTab === 'certificates' && (!item.certificateUrls || item.certificateUrls.length === 0) && (
                    <p className="text-xs text-stone-400 mt-2">No documents uploaded</p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {rejectingId === item.id ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder={t('dashboard.review.rejectionReasonPlaceholder')}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="px-2 py-1 text-sm border border-stone-300 rounded"
                      />
                      <Button size="sm" onClick={() => handleReject(item.id, activeTab)} disabled={!rejectReason.trim()}>
                        {t('dashboard.review.confirm')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => handleApprove(item.id, activeTab)} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('dashboard.review.approve')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectingId(item.id)} className="text-red-600 border-red-600 hover:bg-red-50">
                        <XCircle className="h-4 w-4 mr-1" />
                        {t('dashboard.review.reject')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
