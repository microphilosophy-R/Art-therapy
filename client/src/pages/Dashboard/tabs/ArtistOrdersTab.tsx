import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getArtistOrders, fulfillOrder } from '../../../api/artist';
import { Button } from '../../../components/ui/Button';
import { PageLoader } from '../../../components/ui/Spinner';
import { Package, Truck } from 'lucide-react';

export const ArtistOrdersTab = () => {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [fulfillingOrderId, setFulfillingOrderId] = useState<string | null>(null);

    const { data: orders, isLoading } = useQuery({
        queryKey: ['artist-orders'],
        queryFn: getArtistOrders,
    });

    const fulfillMutation = useMutation({
        mutationFn: ({ orderId, carrierName, trackingNumber }: { orderId: string, carrierName: string, trackingNumber: string }) =>
            fulfillOrder(orderId, { carrierName, trackingNumber }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['artist-orders'] });
            setFulfillingOrderId(null);
        },
    });

    const handleFulfillSubmit = (e: React.FormEvent<HTMLFormElement>, orderId: string) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        fulfillMutation.mutate({
            orderId,
            carrierName: formData.get('carrierName') as string,
            trackingNumber: formData.get('trackingNumber') as string,
        });
    };

    if (isLoading) return <PageLoader />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-stone-900">{t('shop.artist.orders.title')}</h2>
            </div>

            {(!orders || orders.length === 0) ? (
                <div className="text-center py-12 text-stone-500 border-2 border-dashed border-stone-200 rounded-xl">
                    <Package className="h-10 w-10 mx-auto opacity-30 mb-3" />
                    <p>{t('shop.artist.orders.empty')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white border text-left border-stone-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-stone-50 px-4 py-3 border-b border-stone-100 flex justify-between items-center">
                                <div>
                                    <span className="text-xs text-stone-500 font-mono">Order #{order.id.slice(-8).toUpperCase()}</span>
                                    <p className="text-sm font-medium text-stone-900 mt-0.5">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'PAID' ? 'bg-amber-100 text-amber-800' :
                                        order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                                            order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                                                'bg-stone-100 text-stone-800'
                                        }`}>
                                        {t(`shop.orders.status.${order.status}`, order.status)}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{t('shop.artist.orders.items')}</h4>
                                    <ul className="space-y-2">
                                        {order.items?.map((item: any) => (
                                            <li key={item.id} className="flex justify-between text-sm">
                                                <span className="text-stone-900">{item.product?.title || t('shop.artist.orders.unknownProduct')} <span className="text-stone-500">x{item.quantity}</span></span>
                                                <span className="text-stone-600 font-medium">¥{(item.price * item.quantity).toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-3 pt-3 border-t border-stone-100 flex justify-between font-bold text-stone-900 text-sm">
                                        <span>{t('shop.artist.orders.total')}</span>
                                        <span>¥{order.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{t('shop.artist.orders.shippingDetails')}</h4>
                                    {order.shippingAddress ? (
                                        <div className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-100">
                                            <p className="font-medium text-stone-900 mb-1">
                                                {order.shippingAddress.recipientName} &middot; {(order.shippingAddress.phone || order.shippingAddress.mobile)}
                                            </p>
                                            <p>
                                                {order.shippingAddress.province}, {order.shippingAddress.city}, {order.shippingAddress.district}
                                            </p>
                                            <p>{order.shippingAddress.addressDetail || order.shippingAddress.details}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-stone-500 italic">{t('shop.artist.orders.noShippingDetails')}</p>
                                    )}
                                </div>
                            </div>

                            {(order.status === 'PAID' || order.status === 'PENDING') && (
                                <div className="px-4 py-3 bg-stone-50 border-t border-stone-100">
                                    {fulfillingOrderId === order.id ? (
                                        <form onSubmit={(e) => handleFulfillSubmit(e, order.id)} className="flex gap-3 items-end">
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-stone-700 mb-1">{t('shop.artist.orders.carrierName')}</label>
                                                <input required name="carrierName" className="block w-full rounded-md border-stone-300 shadow-sm sm:text-sm" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-medium text-stone-700 mb-1">{t('shop.artist.orders.trackingNumber')}</label>
                                                <input required name="trackingNumber" className="block w-full rounded-md border-stone-300 shadow-sm sm:text-sm" />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="outline" onClick={() => setFulfillingOrderId(null)}>{t('common.cancel')}</Button>
                                                <Button type="submit" loading={fulfillMutation.isPending}>{t('common.submit')}</Button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex justify-end">
                                            <Button onClick={() => setFulfillingOrderId(order.id)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                                <Truck className="h-4 w-4 mr-2" /> {t('shop.artist.orders.markAsShipped')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {order.status === 'SHIPPED' && order.carrierName && order.trackingNumber && (
                                <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-900">{t('shop.artist.orders.shippedVia', { carrier: order.carrierName })}</span>
                                    </div>
                                    <span className="text-sm text-blue-800 font-mono tracking-wide">{order.trackingNumber}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
