import { Router } from 'express';
import { 
  createOrder, 
  getOrderById,
  cancelOrder,
  getOrderCancellation
} from '../controllers/orderController';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';

const router = Router();

/**
 * RUTAS PÚBLICAS (sin autenticación)
 * Los clientes anónimos pueden crear y consultar pedidos
 */

// POST /orders - Crear un nuevo pedido (PÚBLICO)
router.post('/', createOrder);

// GET /orders/:id - Obtener un pedido por su ID (PÚBLICO)
router.get('/:id', getOrderById);

// POST /orders/:id/cancel - Cancelar un pedido (PÚBLICO)
router.post('/:id/cancel', cancelOrder);

// GET /orders/:id/cancellation - Obtener historial de cancelación (PÚBLICO)
router.get('/:id/cancellation', getOrderCancellation);

export default router;

