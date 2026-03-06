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
    const [paymentMethod, setPaymentMethod] = useState<'ALIPAY' | 'WECHAT_PAY'>('ALIPAY');
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
                <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
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
                            className={`h-8 w-8 rounded-full text-sm font-semibold flex items-center justify-center ${
                                step >= n ? 'bg-teal-600 text-white' : 'bg-stone-200 text-stone-600'
                            }`}
                        >
                            {n}
                        </div>
                        {n < 3 && <div className={`h-0.5 w-10 ${step > n ? 'bg-teal-600' : 'bg-stone-200'}`} />}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                    {step === 1 && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-teal-600"></div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-teal-600" />
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
                                    className="bg-teal-600 hover:bg-teal-700"
                                    disabled={!selectedAddressId}
                                    onClick={() => setStep(2)}
                                >
                                    {t('common.continue', 'Continue')}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-teal-600"></div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-teal-600" />
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
                                    className="bg-teal-600 hover:bg-teal-700"
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
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                                {t('shop.checkout.paymentMethod')}
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <button
                                    className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center transition-colors ${paymentMethod === 'ALIPAY'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 hover:border-blue-200'
                                        }`}
                                    onClick={() => setPaymentMethod('ALIPAY')}
                                >
                                    <img src="https://alipay.com/favicon.ico" alt="Alipay" className="w-8 h-8 mb-2" />
                                    <span className="font-semibold">{t('shop.checkout.alipay')}</span>
                                </button>
                                <button
                                    className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center transition-colors ${paymentMethod === 'WECHAT_PAY'
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-200 hover:border-green-200'
                                        }`}
                                    onClick={() => setPaymentMethod('WECHAT_PAY')}
                                >
                                    <img src="https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico" alt="WeChat Pay" className="w-8 h-8 mb-2" />
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
                    <div className="bg-gray-50 rounded-xl p-6 sticky top-24 border">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                            <ShoppingBag className="w-5 h-5 mr-2 text-gray-600" />
                            {t('shop.checkout.orderSummary')}
                        </h2>

                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex gap-4">
                                    <div className="flex-shrink-0 w-16 h-16 bg-white rounded border overflow-hidden">
                                        {getProductCoverUrl(item.product) ? (
                                            <img
                                                src={getProductCoverUrl(item.product)!}
                                                alt={item.product.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
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

                        <div className="border-t pt-4 space-y-3 mb-6">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>{t('shop.cart.subtotal', { count: cartItems.length })}</span>
                                <span>¥{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>{t('shop.cart.shipping')}</span>
                                <span className="text-green-600 font-medium">{t('shop.checkout.free')}</span>
                            </div>
                        </div>

                        <div className="border-t border-b py-4 mb-6">
                            <div className="flex justify-between items-end">
                                <span className="font-bold text-gray-900">{t('shop.cart.total')}</span>
                                <div className="text-right">
                                    <span className="text-3xl font-bold text-teal-600 block">¥{subtotal.toFixed(2)}</span>
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
