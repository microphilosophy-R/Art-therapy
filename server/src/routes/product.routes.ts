import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { ProductController } from '../controllers/product.controller';

const router = Router();

// Public routes
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);

// Artist-only routes
router.use(authenticate);
router.use(authorize('ARTIST'));

router.post('/', validate(ProductController.createProductSchema), ProductController.createProduct);
router.put('/:id', validate(ProductController.updateProductSchema), ProductController.updateProduct);
router.delete('/:id', ProductController.deleteProduct);

export { router as productRouter };
