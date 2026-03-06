import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const legacyAddressSchema = z
    .object({
        province: z.string().min(1, 'Province is required'),
        city: z.string().min(1, 'City is required'),
        district: z.string().min(1, 'District is required'),
        addressDetail: z.string().min(5, 'Detailed address is required').optional(),
        details: z.string().min(5, 'Detailed address is required').optional(),
        recipientName: z.string().min(1, 'Recipient name is required'),
        phone: z.string().min(11, 'Valid phone number required').optional(),
        mobile: z.string().min(11, 'Valid phone number required').optional(),
        postalCode: z.string().max(20).optional().nullable(),
        tag: z.enum(['HOME', 'COMPANY', 'SCHOOL', 'PARENTS', 'OTHER']).optional(),
    })
    .superRefine((val, ctx) => {
        if (!val.addressDetail && !val.details) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Detailed address is required',
                path: ['addressDetail'],
            });
        }
        if (!val.phone && !val.mobile) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Valid phone number required',
                path: ['phone'],
            });
        }
    });

const createOrderSchema = z.union([
    z.object({ addressId: z.string().min(1, 'Address ID is required') }),
    legacyAddressSchema,
    z.object({ shippingAddress: legacyAddressSchema }),
]);

const fulfillOrderSchema = z.object({
    carrierName: z.string().min(1, 'Carrier name is required'),
    trackingNumber: z.string().min(1, 'Tracking number is required'),
});
const prismaAny = prisma as any;

type NormalizedOrderAddress = {
    memberAddressId: string | null;
    province: string;
    city: string;
    district: string;
    addressDetail: string;
    recipientName: string;
    phone: string;
    postalCode: string | null;
    addressTag: 'HOME' | 'COMPANY' | 'SCHOOL' | 'PARENTS' | 'OTHER' | null;
};

const mapOrderResponse = (order: any) => ({
    ...order,
    shippingAddress: {
        province: order.province,
        city: order.city,
        district: order.district,
        addressDetail: order.addressDetail,
        details: order.addressDetail,
        recipientName: order.recipientName,
        phone: order.phone,
        mobile: order.phone,
        postalCode: order.postalCode ?? null,
        tag: order.addressTag ?? null,
    },
});

const normalizeOrderAddress = async (
    userId: string,
    payload: z.infer<typeof createOrderSchema>,
): Promise<NormalizedOrderAddress> => {
    if ('addressId' in payload) {
        const memberAddress = await prismaAny.memberAddress.findFirst({
            where: { id: payload.addressId, userId },
        });
        if (!memberAddress) throw new Error('ADDRESS_NOT_FOUND');
        return {
            memberAddressId: memberAddress.id,
            province: memberAddress.province,
            city: memberAddress.city,
            district: memberAddress.district,
            addressDetail: memberAddress.addressDetail,
            recipientName: memberAddress.recipientName,
            phone: memberAddress.mobile,
            postalCode: memberAddress.postalCode ?? null,
            addressTag: memberAddress.tag,
        };
    }

    const legacy = 'shippingAddress' in payload ? payload.shippingAddress : payload;
    return {
        memberAddressId: null,
        province: legacy.province.trim(),
        city: legacy.city.trim(),
        district: legacy.district.trim(),
        addressDetail: (legacy.addressDetail ?? legacy.details ?? '').trim(),
        recipientName: legacy.recipientName.trim(),
        phone: (legacy.phone ?? legacy.mobile ?? '').trim(),
        postalCode: legacy.postalCode?.trim() || null,
        addressTag: legacy.tag ?? null,
    };
};

export const createOrder = async (req: Request, res: Response) => {
    const input = req.body as z.infer<typeof createOrderSchema>;
    let addressData: NormalizedOrderAddress;
    try {
        addressData = await normalizeOrderAddress(req.user!.id, input);
    } catch (error) {
        if (error instanceof Error && error.message === 'ADDRESS_NOT_FOUND') {
            return res.status(404).json({ message: 'Address not found' });
        }
        throw error;
    }

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
        const txAny = tx as any;
        // Create the Order
        const newOrder = await txAny.order.create({
            data: {
                userId: req.user!.id,
                totalAmount,
                status: 'PENDING',
                memberAddressId: addressData.memberAddressId,
                province: addressData.province,
                city: addressData.city,
                district: addressData.district,
                addressDetail: addressData.addressDetail,
                recipientName: addressData.recipientName,
                phone: addressData.phone,
                postalCode: addressData.postalCode,
                addressTag: addressData.addressTag,
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
            await txAny.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
            });
        }

        // Clear user's cart
        await txAny.cartItem.deleteMany({
            where: { userId: req.user!.id },
        });

        return newOrder;
    });

    res.status(201).json(mapOrderResponse(order));
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

    res.json(orders.map(mapOrderResponse));
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

    // Ensure user owns the order, OR user is a seller who has products in this order.
    // We'll do a simple check: is it the buyer?
    if (order.userId === req.user!.id) {
        return res.json(mapOrderResponse(order));
    }

    // If not buyer, check if seller
    const userProfile = await prisma.userProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (userProfile) {
        const hasSellerProduct = order.items.some(item => item.product.userProfileId === userProfile.id);
        if (hasSellerProduct) {
            return res.json(mapOrderResponse(order));
        }
    }

    return res.status(403).json({ message: 'Not authorized to view this order' });
};

// --- Seller Endpoints ---

export const getArtistOrders = async (req: Request, res: Response) => {
    const userProfile = await prisma.userProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (!userProfile) {
        return res.status(403).json({ message: 'Seller profile required' });
    }

    // Find orders that contain any products from this seller
    const orders = await prisma.order.findMany({
        where: {
            items: {
                some: {
                    product: { userProfileId: userProfile.id }
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

    res.json(orders.map(mapOrderResponse));
};

export const fulfillOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { carrierName, trackingNumber } = req.body as z.infer<typeof fulfillOrderSchema>;

    const userProfile = await prisma.userProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (!userProfile) {
        return res.status(403).json({ message: 'Seller profile required' });
    }

    const order = await prisma.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } } }
    });

    if (!order) {
        return res.status(404).json({ message: 'Order not found' });
    }

    // Validate this seller owns all products in this order.
    // In a real marketplace, we might split orders by seller, but we'll assume a simplified flow.
    const hasOtherSellerProducts = order.items.some(item => item.product.userProfileId !== userProfile.id);
    if (hasOtherSellerProducts) {
        return res.status(403).json({ message: 'Cannot fulfill order containing products from other sellers. Support for split orders is currently unavailable.' });
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

    res.json(mapOrderResponse(updatedOrder));
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
