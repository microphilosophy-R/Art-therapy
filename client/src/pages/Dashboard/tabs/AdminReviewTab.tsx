import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, FileText, ExternalLink, Ban, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import api from '../../../api/axios';
import { listAdminCertificates, manageCertificate } from '../../../api/admin';

type ReviewType = 'profiles' | 'plans' | 'products' | 'certificates';
type CertStatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
type CertTypeFilter = 'ALL' | 'COUNSELOR' | 'THERAPIST' | 'ARTIFICER';
type CertReasonAction = 'REJECT' | 'REVOKE';

const certStatusBadgeClass = (status?: string) => {
  if (status === 'PENDING') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (status === 'REVOKED') return 'bg-stone-100 text-stone-700 border-stone-200';
  return 'bg-stone-100 text-stone-600 border-stone-200';
};

export const AdminReviewTab = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ReviewType>('profiles');

  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [certStatusFilter, setCertStatusFilter] = useState<CertStatusFilter>('ALL');
  const [certTypeFilter, setCertTypeFilter] = useState<CertTypeFilter>('ALL');
  const [certSearch, setCertSearch] = useState('');
  const [certReason, setCertReason] = useState('');
  const [certReasonTarget, setCertReasonTarget] = useState<{ id: string; action: CertReasonAction } | null>(null);

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
    queryKey: ['admin-certificates', certStatusFilter, certTypeFilter, certSearch],
    queryFn: async () =>
      listAdminCertificates({
        status: certStatusFilter,
        type: certTypeFilter,
        q: certSearch || undefined,
      }),
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
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: 'APPROVE' | 'REJECT' | 'REVOKE' | 'RESET_TO_PENDING';
      reason?: string;
    }) => manageCertificate(id, { action, rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-certificates'] });
      setCertReasonTarget(null);
      setCertReason('');
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
  };

  const filteredCertificates = useMemo(() => certificates ?? [], [certificates]);

  const isLoading = loadingProfiles || loadingPlans || loadingProducts || loadingCerts;
  const items =
    activeTab === 'profiles'
      ? profiles
      : activeTab === 'plans'
        ? plans
        : activeTab === 'products'
          ? products
          : filteredCertificates;

  return (
    <div>
      <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('dashboard.review.reviewQueue')}</h2>

      <div className="flex gap-2 mb-4 border-b border-stone-200">
        {(['profiles', 'plans', 'products', 'certificates'] as ReviewType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'border-b-2 border-teal-600 text-teal-600' : 'text-stone-600 hover:text-stone-900'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'certificates' && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={certStatusFilter}
            onChange={(e) => setCertStatusFilter(e.target.value as CertStatusFilter)}
            className="px-3 py-2 rounded-lg border border-stone-300 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="REVOKED">Revoked</option>
          </select>

          <select
            value={certTypeFilter}
            onChange={(e) => setCertTypeFilter(e.target.value as CertTypeFilter)}
            className="px-3 py-2 rounded-lg border border-stone-300 text-sm"
          >
            <option value="ALL">All cert types</option>
            <option value="COUNSELOR">Counselor</option>
            <option value="THERAPIST">Therapist</option>
            <option value="ARTIFICER">Artificer</option>
          </select>

          <input
            type="text"
            value={certSearch}
            onChange={(e) => setCertSearch(e.target.value)}
            placeholder="Search by name or email"
            className="px-3 py-2 rounded-lg border border-stone-300 text-sm"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !items || items.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          {activeTab === 'certificates'
            ? 'No certificate records found.'
            : t('dashboard.review.noPending', { type: activeTab })}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => (
            (() => {
              const currentCertReasonAction: CertReasonAction | null =
                certReasonTarget && certReasonTarget.id === item.id ? certReasonTarget.action : null;

              return (
                <div key={item.id} className="border border-stone-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-stone-900">{item.title || item.type || item.certificateType}</h3>
                    {activeTab === 'certificates' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${certStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    )}
                  </div>
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
                    <p className="text-xs text-stone-400 mt-1">Applied: {new Date(item.appliedAt).toLocaleDateString()}</p>
                  )}
                  {item.reviewedAt && (
                    <p className="text-xs text-stone-400 mt-1">Reviewed: {new Date(item.reviewedAt).toLocaleDateString()}</p>
                  )}
                  {item.rejectionReason && (
                    <p className="text-xs text-rose-600 mt-1">Reason: {item.rejectionReason}</p>
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
                  {activeTab !== 'certificates' && rejectingId === item.id ? (
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
                  ) : activeTab !== 'certificates' ? (
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
                  ) : currentCertReasonAction ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder={currentCertReasonAction === 'REVOKE' ? 'Revocation reason (optional)' : t('dashboard.review.rejectionReasonPlaceholder')}
                        value={certReason}
                        onChange={(e) => setCertReason(e.target.value)}
                        className="px-2 py-1 text-sm border border-stone-300 rounded"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!certReasonTarget) return;
                          reviewCertMutation.mutate({
                            id: certReasonTarget.id,
                            action: certReasonTarget.action,
                            reason: certReason,
                          });
                        }}
                        disabled={currentCertReasonAction === 'REJECT' && !certReason.trim()}
                      >
                        {t('dashboard.review.confirm')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCertReasonTarget(null);
                          setCertReason('');
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {item.status === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => reviewCertMutation.mutate({ id: item.id, action: 'APPROVE' })} className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCertReasonTarget({ id: item.id, action: 'REJECT' })}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      {item.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCertReasonTarget({ id: item.id, action: 'REVOKE' })}
                          className="text-amber-700 border-amber-500 hover:bg-amber-50"
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      )}

                      {(item.status === 'REJECTED' || item.status === 'REVOKED') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reviewCertMutation.mutate({ id: item.id, action: 'RESET_TO_PENDING' })}
                            className="text-stone-700 border-stone-400 hover:bg-stone-50"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Set Pending
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => reviewCertMutation.mutate({ id: item.id, action: 'APPROVE' })}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
                    </>
                  )}
                    </div>
                  </div>
                </div>
              );
            })()
          ))}
        </div>
      )}
    </div>
  );
};
