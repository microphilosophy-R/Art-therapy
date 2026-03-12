import { prisma } from '../lib/prisma';
import { notifyBuyerOnOrderDelivered } from '../services/order-notification.service';

export const autoConfirmDelivery = async () => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const shippedOrders = await prisma.order.findMany({
    where: {
      status: 'SHIPPED',
      shippedAt: { lt: sevenDaysAgo },
    },
  });

  for (const order of shippedOrders) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    await notifyBuyerOnOrderDelivered(order.id).catch(() => {});
  }

  console.log(`[AutoDelivery] Auto-confirmed ${shippedOrders.length} orders as delivered`);
};
