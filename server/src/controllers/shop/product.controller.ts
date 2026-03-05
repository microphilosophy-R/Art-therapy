import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ProductCategory } from '@prisma/client';
import {
    createProductSchema,
    updateProductSchema,
    type CreateProductInput,
    type UpdateProductInput,
} from '../../schemas/product.schemas';

const toLocalizedRequired = (
    i18n: { zh?: string; en?: string } | undefined,
    fallback: string | undefined,
) => {
    const zh = i18n?.zh ?? fallback ?? '';
    const en = i18n?.en ?? fallback ?? '';
    return { zh, en };
};

export const getProducts = async (req: Request, res: Response) => {
    const { category, sellerId, artistId, search, page = '1', limit = '10' } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);

    const where: any = {};

    if (category && Object.values(ProductCategory).includes(category as ProductCategory)) {
        where.category = category as ProductCategory;
    }

    if (sellerId || artistId) {
        where.userProfileId = (sellerId || artistId) as string;
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
                userProfile: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
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
            userProfile: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
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
    const data = req.body as CreateProductInput;
    const titleI18n = toLocalizedRequired((data as any).titleI18n, (data as any).title);
    const descriptionI18n = toLocalizedRequired((data as any).descriptionI18n, (data as any).description);

    const userProfile = await prisma.userProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (!userProfile) {
        return res.status(403).json({ message: 'User profile required to create products' });
    }

    const product = await prisma.product.create({
        data: {
            userProfileId: userProfile.id,
            title: titleI18n.zh,
            titleI18n,
            description: descriptionI18n.zh,
            descriptionI18n,
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
    const data = req.body as UpdateProductInput;

    const userProfile = await prisma.userProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (!userProfile) {
        return res.status(403).json({ message: 'User profile required' });
    }

    const existingProduct = await prisma.product.findUnique({ where: { id } });

    if (!existingProduct) {
        return res.status(404).json({ message: 'Product not found' });
    }

    if (existingProduct.userProfileId !== userProfile.id) {
        return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    // Handle images update if provided
    if (data.images) {
        await prisma.productImage.deleteMany({ where: { productId: id } });
    }

    const product = await prisma.product.update({
        where: { id },
        data: {
            ...(data.title !== undefined || (data as any).titleI18n !== undefined
                ? {
                    titleI18n: toLocalizedRequired((data as any).titleI18n, data.title ?? existingProduct.title),
                    title: toLocalizedRequired((data as any).titleI18n, data.title ?? existingProduct.title).zh,
                }
                : {}),
            ...(data.description !== undefined || (data as any).descriptionI18n !== undefined
                ? {
                    descriptionI18n: toLocalizedRequired(
                        (data as any).descriptionI18n,
                        data.description ?? existingProduct.description,
                    ),
                    description: toLocalizedRequired(
                        (data as any).descriptionI18n,
                        data.description ?? existingProduct.description,
                    ).zh,
                }
                : {}),
            ...(data.price !== undefined ? { price: data.price } : {}),
            ...(data.stock !== undefined ? { stock: data.stock } : {}),
            ...(data.category !== undefined ? { category: data.category } : {}),
            images: data.images ? {
                create: data.images.map((url: string, index: number) => ({
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

    const userProfile = await prisma.userProfile.findUnique({
        where: { userId: req.user!.id }
    });

    if (!userProfile) {
        return res.status(403).json({ message: 'User profile required' });
    }

    const existingProduct = await prisma.product.findUnique({ where: { id } });

    if (!existingProduct) {
        return res.status(404).json({ message: 'Product not found' });
    }

    if (existingProduct.userProfileId !== userProfile.id) {
        return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    await prisma.product.delete({ where: { id } });

    res.status(204).send();
};

export const submitProductForReview = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userProfile = await prisma.userProfile.findUnique({ where: { userId: req.user!.id } });
    if (!userProfile) return res.status(403).json({ message: 'User profile required' });

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.userProfileId !== userProfile.id) return res.status(403).json({ message: 'Not authorized' });
    if (product.status !== 'DRAFT') return res.status(400).json({ message: 'Only draft products can be submitted' });

    await prisma.product.update({
        where: { id },
        data: { status: 'PENDING_REVIEW', submittedAt: new Date() }
    });

    res.json({ message: 'Product submitted for review' });
};

export const reviewProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await prisma.product.update({
        where: { id },
        data: {
            status: action === 'APPROVE' ? 'PUBLISHED' : 'REJECTED',
            reviewedAt: new Date(),
            rejectionReason: action === 'REJECT' ? reason : null
        }
    });

    res.json({ message: `Product ${action === 'APPROVE' ? 'approved' : 'rejected'}` });
};

export const getPendingProducts = async (req: Request, res: Response) => {
    const products = await prisma.product.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: {
            images: { orderBy: { order: 'asc' } },
            userProfile: {
                include: { user: { select: { firstName: true, lastName: true } } }
            }
        },
        orderBy: { submittedAt: 'asc' }
    });

    res.json({ data: products });
};

export const ProductController = {
    createProductSchema,
    updateProductSchema,
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    submitProductForReview,
    reviewProduct,
    getPendingProducts,
};
