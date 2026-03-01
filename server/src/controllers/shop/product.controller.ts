import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';
import { ProductCategory } from '@prisma/client';

const createProductSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(100),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    price: z.number().positive('Price must be positive'),
    stock: z.number().int().nonnegative('Stock cannot be negative'),
    category: z.nativeEnum(ProductCategory),
    images: z.array(z.string().url()).min(1, 'At least one image is required').max(10, 'Maximum 10 images allowed'),
});

const updateProductSchema = createProductSchema.partial();

export const getProducts = async (req: Request, res: Response) => {
    const { category, artistId, search, page = '1', limit = '10' } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);

    const where: any = {};

    if (category && Object.values(ProductCategory).includes(category as ProductCategory)) {
        where.category = category as ProductCategory;
    }

    if (artistId) {
        where.artistId = artistId as string;
    }

    if (search) {
        where.OR = [
            { title: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
        ];
    }

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            include: {
                images: { orderBy: { order: 'asc' } },
                artist: {
                    include: {
                        user: { select: { firstName: true, lastName: true, avatarUrl: true } }
                    }
                }
            },
            skip: (pageNumber - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.product.count({ where }),
    ]);

    res.json({
        data: products,
        pagination: {
            total,
            page: pageNumber,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize),
        },
    });
};

export const getProductById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            images: { orderBy: { order: 'asc' } },
            artist: {
                include: {
                    user: { select: { firstName: true, lastName: true, avatarUrl: true } }
                }
            }
        }
    });

    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
};

export const createProduct = async (req: Request, res: Response) => {
    const data = req.body as z.infer<typeof createProductSchema>;

    // Verify artist profile exists
    const artistProfile = await prisma.artistProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (!artistProfile) {
        return res.status(403).json({ message: 'Artist profile required to create products' });
    }

    if (artistProfile.profileStatus !== 'APPROVED') {
        return res.status(403).json({ message: 'Artist profile must be approved to create products' });
    }

    const product = await prisma.product.create({
        data: {
            artistId: artistProfile.id,
            title: data.title,
            description: data.description,
            price: data.price,
            stock: data.stock,
            category: data.category,
            images: {
                create: data.images.map((url, index) => ({
                    url,
                    order: index,
                })),
            },
        },
        include: { images: true }
    });

    res.status(201).json(product);
};

export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body as z.infer<typeof updateProductSchema>;

    const artistProfile = await prisma.artistProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (!artistProfile) {
        return res.status(403).json({ message: 'Artist profile required' });
    }

    const existingProduct = await prisma.product.findUnique({ where: { id } });

    if (!existingProduct) {
        return res.status(404).json({ message: 'Product not found' });
    }

    if (existingProduct.artistId !== artistProfile.id) {
        return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    // Handle images update if provided
    if (data.images) {
        await prisma.productImage.deleteMany({ where: { productId: id } });
    }

    const product = await prisma.product.update({
        where: { id },
        data: {
            ...data,
            images: data.images ? {
                create: data.images.map((url, index) => ({
                    url,
                    order: index,
                })),
            } : undefined,
        },
        include: { images: true }
    });

    res.json(product);
};

export const deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;

    const artistProfile = await prisma.artistProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (!artistProfile) {
        return res.status(403).json({ message: 'Artist profile required' });
    }

    const existingProduct = await prisma.product.findUnique({ where: { id } });

    if (!existingProduct) {
        return res.status(404).json({ message: 'Product not found' });
    }

    if (existingProduct.artistId !== artistProfile.id) {
        return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    await prisma.product.delete({ where: { id } });

    res.status(204).send();
};

export const ProductController = {
    createProductSchema,
    updateProductSchema,
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
};
