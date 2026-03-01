import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { CartController } from '../controllers/cart.controller';

const router = Router();

router.use(authenticate);

router.get('/', CartController.getCart);
router.post('/', validate(CartController.addToCartSchema), CartController.addToCart);
router.put('/:id', validate(CartController.updateCartItemSchema), CartController.updateCartItem);
router.delete('/:id', CartController.removeFromCart);
router.delete('/', CartController.clearCart);

export { router as cartRouter };
