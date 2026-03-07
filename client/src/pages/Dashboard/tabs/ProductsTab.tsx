import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingBag } from 'lucide-react';
import { getProducts, submitProductForReview, deleteProduct } from '../../../api/shop';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { useAuthStore } from '../../../store/authStore';
import { getProductCoverUrl } from '../../../utils/productMedia';
import api from '../../../api/axios';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
};

export const ProductsTab = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const hasArtificerCert = user?.approvedCertificates?.includes('ARTIFICER');

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await api.get('/profile/me');
      return res.data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['my-products', statusFilter],
    queryFn: () => getProducts({ sellerId: profile?.id, ...(statusFilter !== 'all' && { status: statusFilter }) }),
    enabled: !!profile?.id,
  });

  const submitMutation = useMutation({
    mutationFn: submitProductForReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-products'] }),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-800">{t('dashboard.therapist.products.title')}</h2>
        {hasArtificerCert ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-600 font-medium">{t('dashboard.products.certified')}</span>
            <Link to="/dashboard/product-wizard">
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />{t('dashboard.therapist.products.createProduct')}</Button>
            </Link>
          </div>
        ) : (
          <Link to="/dashboard/member?tab=review">
            <Button size="sm">{t('dashboard.products.getCertified')}</Button>
          </Link>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1 text-sm border border-stone-300 rounded">
          <option value="all">{t('dashboard.therapist.products.statusFilter.all')}</option>
          <option value="DRAFT">{t('dashboard.therapist.products.statusFilter.draft')}</option>
          <option value="PENDING_REVIEW">{t('dashboard.therapist.products.statusFilter.pendingReview')}</option>
          <option value="PUBLISHED">{t('dashboard.therapist.products.statusFilter.published')}</option>
          <option value="REJECTED">{t('dashboard.therapist.products.statusFilter.rejected')}</option>
        </select>
      </div>

      {!products || products.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>{t('dashboard.therapist.products.noProducts')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product: any) => (
            <div key={product.id} className="border border-stone-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex gap-4">
                {getProductCoverUrl(product) ? (
                  <img src={getProductCoverUrl(product)!} alt={product.title} className="w-24 h-16 object-cover rounded" />
                ) : (
                  <div className="w-24 h-16 rounded bg-stone-100 flex items-center justify-center text-stone-300">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-stone-900">{product.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-stone-500">
                        <span>¥{product.price}</span>
                        <span>•</span>
                        <span>{t('dashboard.therapist.products.stock')}: {product.stock}</span>
                      </div>
                    </div>
                    <Badge variant={statusVariant[product.status]}>{product.status}</Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link to={`/products/${product.id}`}>
                      <Button size="sm" variant="outline">{t('dashboard.therapist.products.view')}</Button>
                    </Link>
                    {product.status === 'DRAFT' && (
                      <>
                        <Link to={`/dashboard/product-wizard?id=${product.id}`}>
                          <Button size="sm" variant="outline">{t('dashboard.therapist.products.edit')}</Button>
                        </Link>
                        <Button size="sm" onClick={() => submitMutation.mutate(product.id)}>{t('dashboard.therapist.products.submit')}</Button>
                        <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(product.id)}>{t('dashboard.therapist.products.delete')}</Button>
                      </>
                    )}
                    {product.status === 'REJECTED' && (
                      <Link to={`/dashboard/product-wizard?id=${product.id}`}>
                        <Button size="sm">{t('dashboard.therapist.products.edit')}</Button>
                      </Link>
                    )}
                  </div>
                  {product.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-50 text-red-800 text-sm rounded">
                      <strong>{t('dashboard.therapist.products.rejectionLabel')}</strong> {product.rejectionReason}
                    </div>
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
