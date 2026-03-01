import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCart, createOrder, createAlipayProductOrder, createWechatProductOrder } from '../../api/shop';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { Loader2, CreditCard, ShoppingBag, MapPin } from 'lucide-react';
import { AlipayPaymentForm } from '../../components/payments/AlipayPaymentForm';
import { WechatPaymentForm } from '../../components/payments/WechatPaymentForm';

export const CheckoutPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Address State
    const [address, setAddress] = useState({
        province: '',
        city: '',
        district: '',
        details: '',
        recipientName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
        phone: '',
    });

    const [paymentMethod, setPaymentMethod] = useState<'ALIPAY' | 'WECHAT_PAY'>('ALIPAY');
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

    const { data: cartItems, isLoading: isLoadingCart } = useQuery({
        queryKey: ['cart'],
        queryFn: getCart,
    });

    const { mutate: handleCreateOrder, isPending: isCreatingOrder } = useMutation({
        mutationFn: () => createOrder(address),
        onSuccess: (order) => {
            setCreatedOrderId(order.id);
            queryClient.invalidateQueries({ queryKey: ['cart'] });
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to create order');
        }
    });

    if (isLoadingCart) {
        return (
            <div className="flex justify-center flex-col items-center py-32 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
                <p className="text-gray-500">Loading checkout...</p>
            </div>
        );
    }

    if (!cartItems || cartItems.length === 0) {
        navigate('/cart');
        return null;
    }

    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0);

    const isAddressValid =
        address.province.trim() &&
        address.city.trim() &&
        address.district.trim() &&
        address.details.trim() &&
        address.recipientName.trim() &&
        address.phone.trim();

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Left Column: Forms */}
                <div className="space-y-8">

                    {/* Section 1: Shipping Address */}
                    {!createdOrderId && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-teal-600"></div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-teal-600" />
                                Shipping Address (China)
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Province (省)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={address.province}
                                        onChange={e => setAddress({ ...address, province: e.target.value })}
                                        placeholder="e.g. 广东省"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City (市)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={address.city}
                                        onChange={e => setAddress({ ...address, city: e.target.value })}
                                        placeholder="e.g. 深圳市"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">District (区)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={address.district}
                                        onChange={e => setAddress({ ...address, district: e.target.value })}
                                        placeholder="e.g. 南山区"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Address (详细地址)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                                    value={address.details}
                                    onChange={e => setAddress({ ...address, details: e.target.value })}
                                    placeholder="Street name, building, apartment number"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name (收件人)</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={address.recipientName}
                                        onChange={e => setAddress({ ...address, recipientName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (手机号码)</label>
                                    <input
                                        type="tel"
                                        required
                                        className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                                        value={address.phone}
                                        onChange={e => setAddress({ ...address, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mt-8">
                                <Button
                                    size="lg"
                                    className="w-full bg-teal-600 hover:bg-teal-700"
                                    disabled={!isAddressValid || isCreatingOrder}
                                    onClick={() => handleCreateOrder()}
                                >
                                    {isCreatingOrder ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                    Confirm & Place Order
                                </Button>
                            </div>

                        </div>
                    )}

                    {/* Section 2: Payment */}
                    {createdOrderId && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                                Select Payment Method
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
                                    <span className="font-semibold">Alipay</span>
                                </button>
                                <button
                                    className={`border-2 rounded-lg p-4 flex flex-col items-center justify-center transition-colors ${paymentMethod === 'WECHAT_PAY'
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-200 hover:border-green-200'
                                        }`}
                                    onClick={() => setPaymentMethod('WECHAT_PAY')}
                                >
                                    <img src="https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico" alt="WeChat Pay" className="w-8 h-8 mb-2" />
                                    <span className="font-semibold">WeChat Pay</span>
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

                {/* Right Column: Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-xl p-6 sticky top-24 border">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                            <ShoppingBag className="w-5 h-5 mr-2 text-gray-600" />
                            Order Summary
                        </h2>

                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex gap-4">
                                    <div className="flex-shrink-0 w-16 h-16 bg-white rounded border overflow-hidden">
                                        {item.product.images[0] ? (
                                            <img
                                                src={item.product.images[0].url}
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
                                        <div className="text-gray-500">Qty: {item.quantity}</div>
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        ¥{(Number(item.product.price) * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-4 space-y-3 mb-6">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span>¥{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Shipping</span>
                                <span className="text-green-600 font-medium">Free</span>
                            </div>
                        </div>

                        <div className="border-t border-b py-4 mb-6">
                            <div className="flex justify-between items-end">
                                <span className="font-bold text-gray-900">Total</span>
                                <div className="text-right">
                                    <span className="text-3xl font-bold text-teal-600 block">¥{subtotal.toFixed(2)}</span>
                                    <span className="text-xs text-gray-500">Includes VAT</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-xs text-gray-500 text-center">
                            By placing your order, you agree to our Terms of Sale and Privacy Policy.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
