import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireCertificate } from '../../middleware/requireCertificate';
import { validate } from '../../middleware/validate';
import { ProductController } from '../../controllers/shop/product.controller';
import { createProductSchema, updateProductSchema } from '../../schemas/product.schemas';

const router = Router();

// Public routes
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);

// Artist or MEMBER with ARTIFICER cert
router.use(authenticate);
router.use(authorize('MEMBER', 'ADMIN'));
router.use(requireCertificate('ARTIFICER'));

router.post('/', validate(createProductSchema), ProductController.createProduct);
router.put('/:id', validate(updateProductSchema), ProductController.updateProduct);
router.delete('/:id', ProductController.deleteProduct);
router.post('/:id/submit', ProductController.submitProductForReview);

export { router as productRouter };
