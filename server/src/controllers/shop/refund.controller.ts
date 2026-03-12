import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';
import { refundAlipayOrder } from '../../services/alipay.service';
import { refundWechatOrder } from '../../services/wechat.service';
import { notifySellerOnRefundRequested, notifyBuyerOnRefundApproved, notifyBuyerOnRefundRejected } from '../../services/order-notification.service';

const requestRefundSchema = z.object({
  reason: z.string().min(5, 'Refund reason is required (minimum 5 characters)'),
});

const rejectRefundSchema = z.object({
  reason: z.string().min(5, 'Rejection reason is required (minimum 5 characters)'),
});

export const requestRefund = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body as z.infer<typeof requestRefundSchema>;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (order.userId !== req.user!.id) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (order.status !== 'PAID' && order.status !== 'SHIPPED') {
    return res.status(400).json({ message: 'Can only request refund for PAID or SHIPPED orders' });
  }

  if (!order.payment) {
    return res.status(400).json({ message: 'No payment found for this order' });
  }

  if (order.payment.refundRequestedAt) {
    return res.status(400).json({ message: 'Refund already requested' });
  }

  await prisma.productPayment.update({
    where: { id: order.payment.id },
    data: {
      refundRequestedAt: new Date(),
      refundReason: reason,
    },
  });

  await notifySellerOnRefundRequested(id).catch(() => {});

  res.json({ message: 'Refund request submitted' });
};

export const approveRefund = async (req: Request, res: Response) => {
  const { id } = req.params;

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!userProfile) {
    return res.status(403).json({ message: 'Seller profile required' });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      payment: true,
    },
  });

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const hasOtherSellerProducts = order.items.some(item => item.product.userProfileId !== userProfile.id);
  if (hasOtherSellerProducts) {
    return res.status(403).json({ message: 'Cannot approve refund for order with other sellers products' });
  }

  if (!order.payment || !order.payment.refundRequestedAt) {
    return res.status(400).json({ message: 'No refund request found' });
  }

  const refundAmount = order.totalAmount;
  let refundResult;

  if (order.payment.provider === 'ALIPAY') {
    refundResult = await refundAlipayOrder(
      order.payment.externalOrderId!,
      refundAmount,
      refundAmount,
      order.payment.refundReason || 'Customer requested refund'
    );
  } else if (order.payment.provider === 'WECHAT_PAY') {
    refundResult = await refundWechatOrder(
      order.payment.externalOrderId!,
      refundAmount,
      refundAmount,
      order.payment.refundReason || 'Customer requested refund'
    );
  } else {
    return res.status(400).json({ message: 'Unsupported payment provider for refund' });
  }

  if (!refundResult.success) {
    return res.status(500).json({ message: 'Refund processing failed', error: refundResult.error });
  }

  await prisma.$transaction(async (tx) => {
    const txAny = tx as any;

    await txAny.productPayment.update({
      where: { id: order.payment!.id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundAmount,
      },
    });

    await txAny.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: 'Refunded',
      },
    });

    for (const item of order.items) {
      await txAny.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  });

  await notifyBuyerOnRefundApproved(id).catch(() => {});

  res.json({ message: 'Refund approved and processed' });
};

export const rejectRefund = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body as z.infer<typeof rejectRefundSchema>;

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!userProfile) {
    return res.status(403).json({ message: 'Seller profile required' });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      payment: true,
    },
  });

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const hasOtherSellerProducts = order.items.some(item => item.product.userProfileId !== userProfile.id);
  if (hasOtherSellerProducts) {
    return res.status(403).json({ message: 'Cannot reject refund for order with other sellers products' });
  }

  if (!order.payment || !order.payment.refundRequestedAt) {
    return res.status(400).json({ message: 'No refund request found' });
  }

  await prisma.productPayment.update({
    where: { id: order.payment.id },
    data: {
      refundRejectedAt: new Date(),
      refundRejectionReason: reason,
    },
  });

  await notifyBuyerOnRefundRejected(id).catch(() => {});

  res.json({ message: 'Refund request rejected' });
};

export const RefundController = {
  requestRefundSchema,
  rejectRefundSchema,
  requestRefund,
  approveRefund,
  rejectRefund,
};

