import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMyOrders } from '../../api/shop';
import { Loader2, Package, Truck, CheckCircle2, XCircle, ShoppingBag } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const MyOrdersPage = () => {
    const { data: orders, isLoading } = useQuery({
        queryKey: ['my-orders'],
        queryFn: getMyOrders,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-32">
                <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!orders || orders.length === 0) {
        return (
            <div className="container mx-auto px-4 py-20 max-w-4xl text-center">
                <div className="bg-gray-50 rounded-2xl p-12 py-24 flex flex-col items-center justify-center">
                    <Package className="w-20 h-20 text-gray-300 mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
                    <p className="text-gray-500 mb-8 max-w-sm">When you buy items from the shop, they will appear here with tracking information.</p>
                    <Link to="/shop">
                        <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                            Browse Shop
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return <Loader2 className="w-5 h-5 text-yellow-500" />;
            case 'PAID': return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
            case 'SHIPPED': return <Truck className="w-5 h-5 text-teal-500" />;
            case 'DELIVERED': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'CANCELLED': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <Package className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'PENDING': return 'Awaiting Payment';
            case 'PAID': return 'Processing';
            case 'SHIPPED': return 'Shipped';
            case 'DELIVERED': return 'Delivered';
            case 'CANCELLED': return 'Cancelled';
            default: return status;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

            <div className="space-y-6">
                {orders.map((order) => (
                    <div key={order.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                        {/* Order Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 p-4 border-b gap-4">
                            <div className="flex flex-wrap gap-6 text-sm">
                                <div>
                                    <span className="text-gray-500 block">Date placed</span>
                                    <span className="font-medium text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Total</span>
                                    <span className="font-medium text-gray-900">¥{(order.totalAmount / 100).toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Order ID</span>
                                    <span className="font-mono text-gray-900">{order.id}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border text-sm font-medium">
                                {getStatusIcon(order.status)}
                                {getStatusText(order.status)}
                            </div>
                        </div>

                        {/* Order Content */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Items */}
                                <div className="md:col-span-2 space-y-4">
                                    <h3 className="font-semibold text-gray-900 mb-4 border-b pb-2">Items</h3>
                                    {order.items.map((item) => (
                                        <div key={item.id} className="flex gap-4">
                                            <Link to={`/shop/${item.productId}`} className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded border overflow-hidden">
                                                {item.product.images[0] ? (
                                                    <img
                                                        src={item.product.images[0].url}
                                                        alt={item.product.title}
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <ShoppingBag className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </Link>
                                            <div>
                                                <Link to={`/shop/${item.productId}`} className="font-semibold text-gray-900 hover:text-teal-600 transition-colors line-clamp-1">
                                                    {item.product.title}
                                                </Link>
                                                <div className="text-sm text-gray-500 mt-1">Qty: {item.quantity}</div>
                                                <div className="text-sm font-medium text-gray-900 mt-1">¥{(item.price / 100).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Shipping & Tracking */}
                                <div className="space-y-6 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-8">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2 border-b pb-2">Shipping Information</h3>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <div className="font-medium text-gray-900">{order.shippingAddress.recipientName}</div>
                                            <div>{order.shippingAddress.phone}</div>
                                            <div className="mt-2">
                                                {order.shippingAddress.province} {order.shippingAddress.city} {order.shippingAddress.district}
                                            </div>
                                            <div>{order.shippingAddress.details}</div>
                                        </div>
                                    </div>

                                    {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                                        <div className="bg-teal-50 border border-teal-100 rounded-lg p-4">
                                            <h4 className="font-semibold text-teal-800 mb-2 flex items-center text-sm">
                                                <Truck className="w-4 h-4 mr-2" />
                                                Logistics Details
                                            </h4>
                                            <div className="text-sm space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-stone-600">Carrier:</span>
                                                    <span className="font-medium text-teal-900">{order.carrierName || 'Standard Shipping'}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-stone-600">Tracking #:</span>
                                                    <span className="font-mono text-teal-900 bg-teal-100 px-2 py-0.5 rounded">{order.trackingNumber || 'N/A'}</span>
                                                </div>
                                                {order.trackingNumber && (
                                                    <a
                                                        href={`https://m.kuaidi100.com/result.jsp?nu=${order.trackingNumber}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-teal-600 hover:text-teal-700 text-xs font-medium block mt-2 text-right"
                                                    >
                                                        Track on Kuaidi100 &rarr;
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
