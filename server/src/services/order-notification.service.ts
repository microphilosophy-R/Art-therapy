import { prisma } from '../lib/prisma';

export const notifySellerOnOrderPlaced = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { include: { userProfile: { include: { user: true } } } } } },
      user: true,
    },
  });

  if (!order) return;

  const sellerIds = new Set<string>();
  for (const item of order.items) {
    if (item.product.userProfile?.userId) {
      sellerIds.add(item.product.userProfile.userId);
    }
  }

  if (sellerIds.size === 0) return;

  await prisma.message.createMany({
    data: Array.from(sellerIds).map((sellerId) => ({
      recipientId: sellerId,
      body: `🛒 New order received from ${order.user.firstName} ${order.user.lastName}. Order total: ¥${(order.totalAmount / 100).toFixed(2)}`,
      trigger: 'ORDER_PLACED',
      orderId,
    })),
  });
};

export const notifySellerOnOrderPaid = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { include: { userProfile: { include: { user: true } } } } } },
    },
  });

  if (!order) return;

  const sellerIds = new Set<string>();
  for (const item of order.items) {
    if (item.product.userProfile?.userId) {
      sellerIds.add(item.product.userProfile.userId);
    }
  }

  if (sellerIds.size === 0) return;

  await prisma.message.createMany({
    data: Array.from(sellerIds).map((sellerId) => ({
      recipientId: sellerId,
      body: `💰 Payment confirmed for order. Amount: ¥${(order.totalAmount / 100).toFixed(2)}. Ready to ship!`,
      trigger: 'ORDER_PAID',
      orderId,
    })),
  });
};

export const notifyBuyerOnOrderShipped = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) return;

  await prisma.message.create({
    data: {
      recipientId: order.userId,
      body: `📦 Your order has been shipped! Tracking: ${order.carrierName} - ${order.trackingNumber}`,
      trigger: 'ORDER_SHIPPED',
      orderId,
    },
  });
};

export const notifyBuyerOnOrderDelivered = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) return;

  await prisma.message.create({
    data: {
      recipientId: order.userId,
      body: `✅ Your order has been delivered. Thank you for your purchase!`,
      trigger: 'ORDER_DELIVERED',
      orderId,
    },
  });
};

export const notifyBuyerOnOrderCancelled = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) return;

  await prisma.message.create({
    data: {
      recipientId: order.userId,
      body: `❌ Your order has been cancelled. Reason: ${order.cancellationReason || 'N/A'}`,
      trigger: 'ORDER_CANCELLED',
      orderId,
    },
  });
};

export const notifySellerOnRefundRequested = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { include: { userProfile: { include: { user: true } } } } } },
      payment: true,
    },
  });

  if (!order || !order.payment) return;

  const sellerIds = new Set<string>();
  for (const item of order.items) {
    if (item.product.userProfile?.userId) {
      sellerIds.add(item.product.userProfile.userId);
    }
  }

  if (sellerIds.size === 0) return;

  await prisma.message.createMany({
    data: Array.from(sellerIds).map((sellerId) => ({
      recipientId: sellerId,
      body: `💸 Refund requested for order. Reason: ${order.payment!.refundReason || 'N/A'}. Please review.`,
      trigger: 'REFUND_REQUESTED',
      orderId,
    })),
  });
};

export const notifyBuyerOnRefundApproved = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order || !order.payment) return;

  await prisma.message.create({
    data: {
      recipientId: order.userId,
      body: `✅ Your refund has been approved. Amount: ¥${((order.payment.refundAmount || 0) / 100).toFixed(2)}`,
      trigger: 'REFUND_APPROVED',
      orderId,
    },
  });
};

export const notifyBuyerOnRefundRejected = async (orderId: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order || !order.payment) return;

  await prisma.message.create({
    data: {
      recipientId: order.userId,
      body: `❌ Your refund request was rejected. Reason: ${order.payment.refundRejectionReason || 'N/A'}`,
      trigger: 'REFUND_REJECTED',
      orderId,
    },
  });
};

