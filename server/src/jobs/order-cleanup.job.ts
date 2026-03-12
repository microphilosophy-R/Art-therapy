import { prisma } from '../lib/prisma';
import { notifyBuyerOnOrderCancelled } from '../services/order-notification.service';

export const cancelUnpaidOrders = async () => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const unpaidOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: twentyFourHoursAgo },
      OR: [
        { payment: null },
        { payment: { status: { not: 'SUCCEEDED' } } },
      ],
    },
    include: { items: true },
  });

  for (const order of unpaidOrders) {
    await prisma.$transaction(async (tx) => {
      const txAny = tx as any;

      await txAny.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: 'Payment timeout',
        },
      });

      for (const item of order.items) {
        await txAny.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    await notifyBuyerOnOrderCancelled(order.id).catch(() => {});
  }

  console.log(`[OrderCleanup] Cancelled ${unpaidOrders.length} unpaid orders`);
};
