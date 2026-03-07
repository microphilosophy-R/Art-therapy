import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireCertificate } from '../../middleware/requireCertificate';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../middleware/asyncHandler';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate';
import { ProductController } from '../../controllers/shop/product.controller';
import { createProductSchema, updateProductSchema } from '../../schemas/product.schemas';

const router = Router();

// Public routes
router.get('/', optionalAuthenticate, asyncHandler(ProductController.getProducts));
router.get('/:id', optionalAuthenticate, asyncHandler(ProductController.getProductById));

// Artist or MEMBER with ARTIFICER cert
router.use(authenticate);
router.use(authorize('MEMBER', 'ADMIN'));
router.use(requireCertificate('ARTIFICER'));

router.post('/', validate(createProductSchema), asyncHandler(ProductController.createProduct));
router.put('/:id', validate(updateProductSchema), asyncHandler(ProductController.updateProduct));
router.delete('/:id', asyncHandler(ProductController.deleteProduct));
router.post('/:id/submit', asyncHandler(ProductController.submitProductForReview));

export { router as productRouter };
