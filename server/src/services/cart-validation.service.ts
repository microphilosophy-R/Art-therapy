import { prisma } from '../lib/prisma';

export interface CartValidationResult {
  valid: boolean;
  errors: string[];
  totalAmount: number;
}

export const validateCartForCheckout = async (userId: string): Promise<CartValidationResult> => {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });

  const errors: string[] = [];

  if (cartItems.length === 0) {
    return { valid: false, errors: ['Cart is empty'], totalAmount: 0 };
  }

  let totalAmount = 0;

  for (const item of cartItems) {
    if (!item.product) {
      errors.push(`Product not found`);
      continue;
    }

    if (item.product.status !== 'PUBLISHED') {
      errors.push(`Product "${item.product.title}" is no longer available`);
      continue;
    }

    if (item.product.stock < item.quantity) {
      errors.push(
        `Product "${item.product.title}" has insufficient stock (available: ${item.product.stock}, requested: ${item.quantity})`
      );
      continue;
    }

    const priceCents = Math.round(Number(item.product.price) * 100);
    totalAmount += priceCents * item.quantity;
  }

  return {
    valid: errors.length === 0,
    errors,
    totalAmount,
  };
};
