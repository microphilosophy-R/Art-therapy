import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireCertificate } from '../../middleware/requireCertificate';
import { validate } from '../../middleware/validate';
import { OrderController } from '../../controllers/shop/order.controller';

const router = Router();

router.use(authenticate);

// Client order routes
router.post('/', validate(OrderController.createOrderSchema), OrderController.createOrder);
router.get('/my-orders', OrderController.getMyOrders);
router.get('/:id', OrderController.getOrderById);
router.post('/:id/confirm-delivery', OrderController.confirmDelivery);

// Seller order routes (to view and fulfill orders for their products)
router.get('/seller/orders', authorize('MEMBER', 'ADMIN'), requireCertificate('ARTIFICER'), OrderController.getArtistOrders);
router.post('/seller/orders/:id/fulfill', authorize('MEMBER', 'ADMIN'), requireCertificate('ARTIFICER'), validate(OrderController.fulfillOrderSchema), OrderController.fulfillOrder);

export { router as orderRouter };
