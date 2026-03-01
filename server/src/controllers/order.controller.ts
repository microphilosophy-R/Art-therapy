import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const createOrderSchema = z.object({
    province: z.string().min(1, 'Province is required'),
    city: z.string().min(1, 'City is required'),
    district: z.string().min(1, 'District is required'),
    addressDetail: z.string().min(5, 'Detailed address is required'),
    recipientName: z.string().min(1, 'Recipient name is required'),
    phone: z.string().min(11, 'Valid phone number required'),
});

const fulfillOrderSchema = z.object({
    carrierName: z.string().min(1, 'Carrier name is required'),
    trackingNumber: z.string().min(1, 'Tracking number is required'),
});

export const createOrder = async (req: Request, res: Response) => {
    const addressData = req.body as z.infer<typeof createOrderSchema>;

    // 1. Fetch cart items
    const cartItems = await prisma.cartItem.findMany({
        where: { userId: req.user!.id },
        include: { product: true },
    });

    if (cartItems.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
    }

    // 2. Validate stock and calculate total amount
    let totalAmount = 0;
    for (const item of cartItems) {
        if (item.product.stock < item.quantity) {
            return res.status(400).json({
                message: `Product ${item.product.title} has insufficient stock (remaining: ${item.product.stock})`
            });
        }
        // Assumes price is a Decimal in Prisma, convert to number or use Prisma's Decimal operations
        // Store amount in cents for payments
        const priceCents = Math.round(Number(item.product.price) * 100);
        totalAmount += priceCents * item.quantity;
    }

    // 3. Create order in a transaction to ensure atomicity
    const order = await prisma.$transaction(async (tx) => {
        // Create the Order
        const newOrder = await tx.order.create({
            data: {
                userId: req.user!.id,
                totalAmount,
                status: 'PENDING',
                ...addressData,
                items: {
                    create: cartItems.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: Math.round(Number(item.product.price) * 100),
                    })),
                },
            },
            include: { items: true },
        });

        // Update product stock
        for (const item of cartItems) {
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
            });
        }

        // Clear user's cart
        await tx.cartItem.deleteMany({
            where: { userId: req.user!.id },
        });

        return newOrder;
    });

    res.status(201).json(order);
};

export const getMyOrders = async (req: Request, res: Response) => {
    const orders = await prisma.order.findMany({
        where: { userId: req.user!.id },
        include: {
            items: {
                include: {
                    product: {
                        include: { images: { orderBy: { order: 'asc' }, take: 1 } }
                    }
                }
            },
            payment: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
};

export const getOrderById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    product: { include: { images: true } }
                }
            },
            payment: true,
        }
    });

    if (!order) {
        return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure user owns the order, OR user is an artist who has products in this order.
    // We'll do a simple check: is it the buyer?
    if (order.userId === req.user!.id) {
        return res.json(order);
    }

    // If not buyer, check if artist
    const artistProfile = await prisma.artistProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (artistProfile) {
        const hasArtistProduct = order.items.some(item => item.product.artistId === artistProfile.id);
        if (hasArtistProduct) {
            return res.json(order);
        }
    }

    return res.status(403).json({ message: 'Not authorized to view this order' });
};

// --- Artist Endpoints ---

export const getArtistOrders = async (req: Request, res: Response) => {
    const artistProfile = await prisma.artistProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (!artistProfile) {
        return res.status(403).json({ message: 'Artist profile required' });
    }

    // Find orders that contain ANY products from this artist
    const orders = await prisma.order.findMany({
        where: {
            items: {
                some: {
                    product: { artistId: artistProfile.id }
                }
            }
        },
        include: {
            items: {
                include: { product: true }
            },
            payment: true,
            user: { select: { firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
};

export const fulfillOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { carrierName, trackingNumber } = req.body as z.infer<typeof fulfillOrderSchema>;

    const artistProfile = await prisma.artistProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (!artistProfile) {
        return res.status(403).json({ message: 'Artist profile required' });
    }

    const order = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } } }
    });

    if (!order) {
        return res.status(404).json({ message: 'Order not found' });
    }

    // Validate this artist owns all products in this order. 
    // In a real marketplace, we might split orders by seller, but we'll assume a simplified flow.
    const hasOtherArtistProducts = order.items.some(item => item.product.artistId !== artistProfile.id);
    if (hasOtherArtistProducts) {
        return res.status(403).json({ message: 'Cannot fulfill order containing products from other artists. Support for split orders is currently unavailable.' });
    }

    if (order.status !== 'PAID') {
        return res.status(400).json({ message: 'Order must be PAID before it can be fulfilled.' });
    }

    const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
            status: 'SHIPPED',
            carrierName,
            trackingNumber
        },
        include: { items: { include: { product: true } } }
    });

    res.json(updatedOrder);
};

export const OrderController = {
    createOrderSchema,
    fulfillOrderSchema,
    createOrder,
    getMyOrders,
    getOrderById,
    getArtistOrders,
    fulfillOrder
};
