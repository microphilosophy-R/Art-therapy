import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { OrderController } from '../../controllers/shop/order.controller';

const router = Router();

router.use(authenticate);

// Client order routes
router.post('/', validate(OrderController.createOrderSchema), OrderController.createOrder);
router.get('/my-orders', OrderController.getMyOrders);
router.get('/:id', OrderController.getOrderById);

// Artist order routes (to view and fulfill orders for their products)
router.get('/artist/orders', authorize('ARTIST'), OrderController.getArtistOrders);
router.post('/artist/orders/:id/fulfill', authorize('ARTIST'), validate(OrderController.fulfillOrderSchema), OrderController.fulfillOrder);

export { router as orderRouter };
