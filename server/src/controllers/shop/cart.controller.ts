import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const addToCartSchema = z.object({
    productId: z.string(),
    quantity: z.number().int().positive().default(1),
});

const updateCartItemSchema = z.object({
    quantity: z.number().int().positive(),
});

export const getCart = async (req: Request, res: Response) => {
    const cartItems = await prisma.cartItem.findMany({
        where: { userId: req.user!.id },
        include: {
            product: {
                include: {
                    images: { orderBy: { order: 'asc' }, take: 1 },
                    artist: {
                        include: {
                            user: { select: { firstName: true, lastName: true } }
                        }
                    }
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    res.json(cartItems);
};

export const addToCart = async (req: Request, res: Response) => {
    const { productId, quantity } = req.body as z.infer<typeof addToCartSchema>;

    const product = await prisma.product.findUnique({
        where: { id: productId },
    });

    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
        return res.status(400).json({ message: 'Not enough stock available' });
    }

    // Check if item already exists in cart, then update quantity or create new
    const existingCartItem = await prisma.cartItem.findUnique({
        where: {
            userId_productId: {
                userId: req.user!.id,
                productId,
            },
        },
    });

    if (existingCartItem) {
        const newQuantity = existingCartItem.quantity + quantity;
        if (newQuantity > product.stock) {
            return res.status(400).json({ message: 'Cannot add more, exceeds available stock' });
        }

        const updatedCartItem = await prisma.cartItem.update({
            where: { id: existingCartItem.id },
            data: { quantity: newQuantity },
            include: { product: { include: { images: true } } },
        });
        return res.json(updatedCartItem);
    }

    const newCartItem = await prisma.cartItem.create({
        data: {
            userId: req.user!.id,
            productId,
            quantity,
        },
        include: { product: { include: { images: true } } },
    });

    res.status(201).json(newCartItem);
};

export const updateCartItem = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { quantity } = req.body as z.infer<typeof updateCartItemSchema>;

    const cartItem = await prisma.cartItem.findUnique({
        where: { id },
        include: { product: true },
    });

    if (!cartItem) {
        return res.status(404).json({ message: 'Cart item not found' });
    }

    if (cartItem.userId !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    if (cartItem.product.stock < quantity) {
        return res.status(400).json({ message: 'Requested quantity exceeds available stock' });
    }

    const updatedCartItem = await prisma.cartItem.update({
        where: { id },
        data: { quantity },
        include: { product: { include: { images: true } } },
    });

    res.json(updatedCartItem);
};

export const removeFromCart = async (req: Request, res: Response) => {
    const { id } = req.params;

    const cartItem = await prisma.cartItem.findUnique({
        where: { id },
    });

    if (!cartItem) {
        return res.status(404).json({ message: 'Cart item not found' });
    }

    if (cartItem.userId !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    await prisma.cartItem.delete({
        where: { id },
    });

    res.status(204).send();
};

export const clearCart = async (req: Request, res: Response) => {
    await prisma.cartItem.deleteMany({
        where: { userId: req.user!.id },
    });

    res.status(204).send();
};

export const CartController = {
    addToCartSchema,
    updateCartItemSchema,
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
};
