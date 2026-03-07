import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { ProductCategory, ProductStatus } from '@prisma/client';
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

const isProductPubliclyReleased = (product: {
    status: ProductStatus;
    reviewedAt: Date | null;
    submittedAt: Date | null;
}) => product.status === 'PUBLISHED' && product.reviewedAt !== null && product.submittedAt !== null;

export const getProducts = async (req: Request, res: Response) => {
    const { category, sellerId, artistId, search, status, page = '1', limit = '10' } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);

    try {
        const where: any = {};
        const requestedSellerProfileId = (sellerId || artistId) as string | undefined;
        const requestedStatus = typeof status === 'string' ? status : undefined;

        let requesterProfileId: string | null = null;
        if (req.user?.id) {
            const profile = await prisma.userProfile.findUnique({
                where: { userId: req.user.id },
                select: { id: true },
            });
            requesterProfileId = profile?.id ?? null;
        }

        const canViewNonPublic =
            req.user?.role === 'ADMIN' ||
            (!!requestedSellerProfileId && !!requesterProfileId && requestedSellerProfileId === requesterProfileId);

        if (category && Object.values(ProductCategory).includes(category as ProductCategory)) {
            where.category = category as ProductCategory;
        }

        if (requestedSellerProfileId) {
            where.userProfileId = requestedSellerProfileId;
        }

        if (search) {
            where.OR = [
                { title: { contains: search as string, mode: 'insensitive' } },
                { description: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        if (requestedStatus) {
            if (canViewNonPublic) {
                where.status = requestedStatus;
            } else if (requestedStatus !== 'PUBLISHED') {
                return res.json({
                    data: [],
                    pagination: {
                        total: 0,
                        page: pageNumber,
                        limit: pageSize,
                        totalPages: 0,
                    },
                });
            } else {
                where.status = 'PUBLISHED';
            }
        } else if (!canViewNonPublic) {
            where.status = 'PUBLISHED';
        }

        if (!canViewNonPublic) {
            where.reviewedAt = { not: null };
            where.submittedAt = { not: null };
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
    } catch (error) {
        const err = error as { name?: string; code?: string; message?: string };
        console.error('[ProductController.getProducts] Query failed', {
            query: {
                category: category ?? null,
                sellerId: sellerId ?? null,
                artistId: artistId ?? null,
                hasSearch: typeof search === 'string' ? search.length > 0 : false,
                page: pageNumber,
                limit: pageSize,
            },
            error: {
                name: err.name ?? 'UnknownError',
                code: err.code ?? null,
                message: err.message ?? String(error),
            },
        });
        throw error;
    }
};

export const getProductById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
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

        const canViewNonPublic =
            req.user?.role === 'ADMIN' ||
            (req.user?.id != null && product.userProfile?.userId === req.user.id);

        if (!canViewNonPublic && !isProductPubliclyReleased(product)) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        const err = error as { name?: string; code?: string; message?: string };
        console.error('[ProductController.getProductById] Query failed', {
            productId: id,
            error: {
                name: err.name ?? 'UnknownError',
                code: err.code ?? null,
                message: err.message ?? String(error),
            },
        });
        throw error;
    }
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

    const createData = {
        userProfileId: userProfile.id,
        title: titleI18n.zh,
        titleI18n,
        description: descriptionI18n.zh,
        descriptionI18n,
        defaultPosterId: data.defaultPosterId ?? null,
        posterUrl: data.posterUrl ?? null,
        videoUrl: data.videoUrl ?? null,
        price: data.price,
        stock: data.stock,
        category: data.category,
        images: data.images
            ? {
                create: data.images.map((url, index) => ({
                    url,
                    order: index,
                })),
            }
            : undefined,
    };

    const product = await prisma.product.create({
        data: createData,
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

    const updateData: any = {
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
        ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl } : {}),
        images: data.images ? {
            create: data.images.map((url: string, index: number) => ({
                url,
                order: index,
            })),
        } : undefined,
    };

    if (data.defaultPosterId !== undefined) {
        updateData.defaultPosterId = data.defaultPosterId;
        if (data.defaultPosterId != null) {
            updateData.posterUrl = null;
        }
    }
    if (data.posterUrl !== undefined) {
        updateData.posterUrl = data.posterUrl;
        if (data.posterUrl != null) {
            updateData.defaultPosterId = null;
        }
    }

    const product = await prisma.product.update({
        where: { id },
        data: updateData,
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
    if (product.status !== 'PENDING_REVIEW') {
        return res.status(400).json({ message: 'Only pending products can be reviewed' });
    }

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
