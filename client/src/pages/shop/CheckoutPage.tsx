import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCart, createOrder } from '../../api/shop';
import { getMemberAddresses } from '../../api/profile';
import { Button } from '../../components/ui/Button';
import { Loader2, CreditCard, ShoppingBag, MapPin } from 'lucide-react';
import { AlipayPaymentForm } from '../../components/payments/AlipayPaymentForm';
import { WechatPaymentForm } from '../../components/payments/WechatPaymentForm';
import { AddressBookPanel } from '../../components/profile/AddressBookPanel';
import { getProductCoverUrl } from '../../utils/productMedia';

type CheckoutStep = 1 | 2 | 3;

export const CheckoutPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [step, setStep] = useState<CheckoutStep>(1);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'ALIPAY' | 'WECHAT_PAY'>('WECHAT_PAY');
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

    const { data: cartItems, isLoading: isLoadingCart } = useQuery({
        queryKey: ['cart'],
        queryFn: getCart,
    });

    const { data: addresses = [] } = useQuery({
        queryKey: ['member-addresses'],
        queryFn: getMemberAddresses,
    });

    useEffect(() => {
        if (!selectedAddressId && addresses.length > 0) {
            const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
            setSelectedAddressId(defaultAddress.id);
        }
    }, [addresses, selectedAddressId]);

    const selectedAddress = useMemo(
        () => addresses.find((address) => address.id === selectedAddressId) ?? null,
        [addresses, selectedAddressId],
    );

    const { mutate: handleCreateOrder, isPending: isCreatingOrder } = useMutation({
        mutationFn: () => createOrder({ addressId: selectedAddressId! }),
        onSuccess: (order) => {
            setCreatedOrderId(order.id);
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            setStep(3);
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to create order');
        },
    });

    if (isLoadingCart) {
        return (
            <div className="flex justify-center flex-col items-center py-32 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-celadon-600" />
                <p className="text-gray-500">{t('shop.checkout.loading')}</p>
            </div>
        );
    }

    if (!cartItems || cartItems.length === 0) {
        navigate('/cart');
        return null;
    }

    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0);

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('shop.checkout.title')}</h1>

            <div className="mb-6 flex items-center gap-3">
                {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center gap-3">
                        <div
                            className={`h-8 w-8 rounded-full text-sm font-semibold flex items-center justify-center ${step >= n ? 'bg-celadon-600 text-white shadow-gentle' : 'bg-ivory-200 text-ink-500 border border-ink-100'
                                }`}
                        >
                            {n}
                        </div>
                        {n < 3 && <div className={`h-0.5 w-10 ${step > n ? 'bg-celadon-600' : 'bg-ivory-200'}`} />}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-8 lg:col-span-2">
                    {step === 1 && (
                        <div className="bg-ivory-50 p-8 rounded-3xl border border-ink-100 shadow-gentle relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-celadon-500"></div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-celadon-600" />
                                {t('shop.checkout.shippingAddress')}
                            </h2>

                            <AddressBookPanel
                                selectable
                                selectedAddressId={selectedAddressId}
                                onSelectAddress={setSelectedAddressId}
                            />

                            <div className="mt-6 flex justify-end">
                                <Button
                                    size="lg"
                                    className="bg-celadon-600 hover:bg-celadon-700 text-ivory-50 shadow-sm"
                                    disabled={!selectedAddressId}
                                    onClick={() => setStep(2)}
                                >
                                    {t('common.continue', 'Continue')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="bg-ivory-50 p-8 rounded-3xl border border-ink-100 shadow-gentle relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-celadon-500"></div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-celadon-600" />
                                {t('shop.checkout.confirmAddress', 'Confirm Shipping Address')}
                            </h2>

                            {selectedAddress ? (
                                <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                                    <p className="font-semibold text-stone-900">
                                        {selectedAddress.recipientName} · {selectedAddress.mobile}
                                    </p>
                                    <p className="text-sm text-stone-700 mt-1">
                                        {selectedAddress.province} {selectedAddress.city} {selectedAddress.district}
                                    </p>
                                    <p className="text-sm text-stone-700">{selectedAddress.addressDetail}</p>
                                    {selectedAddress.postalCode && (
                                        <p className="text-xs text-stone-500 mt-1">
                                            {t('shop.checkout.postalCode', 'Postal Code')}: {selectedAddress.postalCode}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-rose-600">{t('shop.checkout.selectAddressFirst', 'Please select an address first.')}</p>
                            )}

                            <div className="mt-6 flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => setStep(1)}>
                                    {t('common.back', 'Back')}
                                </Button>
                                <Button
                                    size="lg"
                                    className="bg-celadon-600 hover:bg-celadon-700 text-ivory-50 shadow-sm"
                                    disabled={!selectedAddressId || isCreatingOrder}
                                    onClick={() => handleCreateOrder()}
                                >
                                    {isCreatingOrder ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                    {t('shop.checkout.confirmOrder')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && createdOrderId && (
                        <div className="bg-ivory-50 p-8 rounded-3xl border border-ink-100 shadow-gentle relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <CreditCard className="w-5 h-5 mr-2 text-blue-500" />
                                {t('shop.checkout.paymentMethod')}
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button
                                    disabled
                                    className="border-2 rounded-lg p-4 flex flex-col items-center justify-center opacity-40 cursor-not-allowed border-gray-200 bg-gray-50"
                                >
                                    <svg className="w-8 h-8 mb-2" viewBox="0 0 1024 1024" fill="currentColor">
                                        <path d="M1024 512C1024 229.7 794.3 0 512 0S0 229.7 0 512s229.7 512 512 512 512-229.7 512-512z" fill="#00A0E9"/>
                                        <path d="M785.9 621.1c-14.9-4.9-86.4-27.6-99.8-30.8-13.4-3.1-23.2-4.9-32.9 4.9-9.8 9.8-37.9 30.8-46.4 37.2-8.6 6.4-17.1 7.3-32 2.4-14.9-4.9-62.9-23.2-119.8-73.9-44.3-39.5-74.2-88.3-82.8-103.2-8.6-14.9-.9-22.9 6.4-30.3 6.6-6.6 14.9-17.1 22.3-25.7 7.4-8.6 9.8-14.9 14.7-24.7 4.9-9.8 2.5-18.4-1.2-25.7-3.7-7.4-32.9-79.3-45.1-108.6-11.8-28.5-23.8-24.6-32.9-25.1-8.5-.4-18.3-.5-28-.5s-25.7 3.7-39.1 18.4c-13.4 14.9-51.3 50.1-51.3 122.2s52.5 141.7 59.9 151.5c7.4 9.8 104.2 159.1 252.4 223.1 35.2 15.2 62.7 24.3 84.1 31.1 35.4 11.3 67.6 9.7 93.1 5.9 28.4-4.2 86.4-35.3 98.6-69.4 12.2-34.1 12.2-63.3 8.5-69.4-3.6-6.1-13.4-9.8-28.3-14.7z" fill="#FFF"/>
                                    </svg>
                                    <span className="font-semibold text-gray-500">{t('shop.checkout.alipay')}</span>
                                    <span className="text-xs text-gray-400 mt-1">Not available</span>
                                </button>
                                <button
                                    className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center transition-colors ${paymentMethod === 'WECHAT_PAY'
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-200 hover:border-green-200'
                                        }`}
                                    onClick={() => setPaymentMethod('WECHAT_PAY')}
                                >
                                    <svg className="w-8 h-8 mb-2" viewBox="0 0 1024 1024" fill="currentColor">
                                        <path d="M690.1 377.4c5.9 0 11.8.2 17.6.5-24.4-128.7-158.3-227.1-319.9-227.1C209 150.8 64 271.4 64 420.2c0 81.1 43.6 154.2 111.9 203.6 5.5 3.9 9.1 10.3 9.1 17.6 0 2.4-.5 4.6-1.1 6.9-5.5 20.3-14.2 52.8-14.6 54.3-.7 2.6-1.7 5.2-1.7 7.9 0 5.9 4.8 10.8 10.8 10.8 2.3 0 4.2-.9 6.2-2l70.9-40.9c5.3-3.1 11-5 17.2-5 3.2 0 6.4.5 9.5 1.4 33.1 9.5 68.8 14.8 105.7 14.8 6 0 11.9-.1 17.8-.4-7.1-21-10.9-43.1-10.9-66 0-135.8 132.2-245.8 295.3-245.8z m-194.3-86.5c23.8 0 43.2 19.3 43.2 43.1s-19.3 43.1-43.2 43.1c-23.8 0-43.2-19.3-43.2-43.1s19.4-43.1 43.2-43.1z m-215.9 86.2c-23.8 0-43.2-19.3-43.2-43.1s19.3-43.1 43.2-43.1 43.2 19.3 43.2 43.1-19.4 43.1-43.2 43.1z" fill="#00C800"/>
                                        <path d="M866.7 792.7c56.9-41.2 93.2-102 93.2-169.7 0-124-120.8-224.5-269.9-224.5-149 0-269.9 100.5-269.9 224.5S540.9 847.5 690 847.5c30.8 0 60.6-4.4 88.1-12.3 2.6-.8 5.2-1.2 7.9-1.2 5.2 0 9.9 1.6 14.3 4.1l59.1 34c1.7 1 3.3 1.7 5.2 1.7 2.4 0 4.7-.9 6.4-2.6 1.7-1.7 2.6-4 2.6-6.4 0-2.2-.9-4.4-1.4-6.6-.3-1.2-7.6-28.3-12.2-45.3-.5-1.9-.9-3.8-.9-5.7.1-5.9 3.1-11.2 7.6-14.5zM600.2 587.2c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9c0 19.8-16.2 35.9-36 35.9z m179.9 0c-19.9 0-36-16.1-36-35.9 0-19.8 16.1-35.9 36-35.9s36 16.1 36 35.9c-.1 19.8-16.2 35.9-36 35.9z" fill="#00C800"/>
                                    </svg>
                                    <span className="font-semibold">{t('shop.checkout.wechatPay')}</span>
                                </button>
                            </div>

                            <div className="flex justify-center">
                                {paymentMethod === 'ALIPAY' ? (
                                    <AlipayPaymentForm
                                        orderId={createdOrderId}
                                        onSuccess={() => navigate('/orders')}
                                    />
                                ) : (
                                    <WechatPaymentForm
                                        orderId={createdOrderId}
                                        onSuccess={() => navigate('/orders')}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-ivory-50 rounded-3xl p-8 sticky top-24 border border-ink-100 shadow-gentle">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                            <ShoppingBag className="w-5 h-5 mr-2 text-gray-600" />
                            {t('shop.checkout.orderSummary')}
                        </h2>

                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex gap-4 group">
                                    <div className="flex-shrink-0 w-16 aspect-poster bg-white rounded-md border border-ink-100 overflow-hidden shadow-sm">
                                        {getProductCoverUrl(item.product) ? (
                                            <img
                                                src={getProductCoverUrl(item.product)!}
                                                alt={item.product.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-ivory-100 flex items-center justify-center text-stone-400">
                                                <ShoppingBag className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-sm">
                                        <div className="font-medium text-gray-900 line-clamp-2">{item.product.title}</div>
                                        <div className="text-gray-500">{t('shop.checkout.qty', { count: item.quantity })}</div>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        ¥{(Number(item.product.price) * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-ink-100 pt-4 space-y-3 mb-6">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>{t('shop.cart.subtotal', { count: cartItems.length })}</span>
                                <span>¥{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>{t('shop.cart.shipping')}</span>
                                <span className="text-celadon-600 font-medium">{t('shop.checkout.free')}</span>
                            </div>
                        </div>

                        <div className="border-t border-b border-ink-100 py-4 mb-6">
                            <div className="flex justify-between items-end">
                                <span className="font-bold text-gray-900">{t('shop.cart.total')}</span>
                                <div className="text-right">
                                    <span className="text-3xl font-bold text-celadon-600 block">¥{subtotal.toFixed(2)}</span>
                                    <span className="text-xs text-gray-500">{t('shop.cart.includesVat')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-gray-500 text-center">
                            {t('shop.checkout.terms')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
