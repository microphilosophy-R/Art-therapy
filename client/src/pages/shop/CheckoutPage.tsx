import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCart, createOrder, type CartItem } from '../../api/shop';
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
    const [checkoutSnapshot, setCheckoutSnapshot] = useState<CartItem[] | null>(null);

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
            if (cartItems?.length) {
                setCheckoutSnapshot(cartItems);
            }
            setCreatedOrderId(order.id);
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            setStep(3);
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to create order');
        },
    });

    const shouldRedirectToCart = !isLoadingCart && !createdOrderId && (!cartItems || cartItems.length === 0);

    useEffect(() => {
        if (!shouldRedirectToCart) return;
        navigate('/cart', { replace: true });
    }, [navigate, shouldRedirectToCart]);

    if (isLoadingCart) {
        return (
            <div className="flex justify-center flex-col items-center py-32 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-celadon-600" />
                <p className="text-gray-500">{t('shop.checkout.loading')}</p>
            </div>
        );
    }

    if (shouldRedirectToCart) {
        return null;
    }

    const displayCartItems = createdOrderId ? (checkoutSnapshot ?? cartItems ?? []) : (cartItems ?? []);
    const subtotal = displayCartItems.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0);

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
                                    <img src="/alipay-logo.svg" alt="Alipay" className="w-8 h-8 mb-2 rounded-md object-cover" loading="lazy" />
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
                                    <svg className="w-8 h-8 mb-2" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="48" height="48" rx="10" fill="#07C160" />
                                        <circle cx="19" cy="22" r="8" fill="white" />
                                        <circle cx="30" cy="27" r="8" fill="white" />
                                        <circle cx="16.5" cy="21.5" r="1.2" fill="#07C160" />
                                        <circle cx="21.5" cy="21.5" r="1.2" fill="#07C160" />
                                        <circle cx="27.5" cy="26.5" r="1.2" fill="#07C160" />
                                        <circle cx="32.5" cy="26.5" r="1.2" fill="#07C160" />
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
                            {displayCartItems.map((item) => (
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
                                <span>{t('shop.cart.subtotal', { count: displayCartItems.length })}</span>
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

