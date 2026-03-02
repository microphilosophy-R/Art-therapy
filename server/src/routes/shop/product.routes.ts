import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireCertificate } from '../../middleware/requireCertificate';
import { validate } from '../../middleware/validate';
import { ProductController } from '../../controllers/shop/product.controller';

const router = Router();

// Public routes
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);

// Artist or MEMBER with ARTIFICER cert
router.use(authenticate);
router.use(authorize('ARTIST', 'MEMBER'));
router.use(requireCertificate('ARTIFICER'));

router.post('/', validate(ProductController.createProductSchema), ProductController.createProduct);
router.put('/:id', validate(ProductController.updateProductSchema), ProductController.updateProduct);
router.delete('/:id', ProductController.deleteProduct);

export { router as productRouter };
