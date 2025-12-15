import { Router } from 'express';
import { 
  getKitchenOrders, 
  getKitchenOrderById, 
  startPreparing, 
  markAsReady 
} from '../controllers/kitchenController';

const router = Router();

// GET /kitchen/orders - Obtener todos los pedidos en cocina
router.get('/orders', getKitchenOrders);

// GET /kitchen/orders/:orderId - Obtener un pedido específico
router.get('/orders/:orderId', getKitchenOrderById);

// POST /kitchen/orders/:orderId/start-preparing - Iniciar preparación
router.post('/orders/:orderId/start-preparing', startPreparing);

// POST /kitchen/orders/:orderId/ready - Marcar como listo
router.post('/orders/:orderId/ready', markAsReady);

export default router;

