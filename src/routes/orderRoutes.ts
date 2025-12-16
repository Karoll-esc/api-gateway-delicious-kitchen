import { Router } from 'express';
import { 
  createOrder, 
  getOrderById,
  cancelOrder,
  getOrderCancellation
} from '../controllers/orderController';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';

const router = Router();

// Aplicar autenticación a todas las rutas de pedidos
// Cualquier usuario autenticado puede crear y gestionar sus propios pedidos
// La validación de propiedad del pedido se realiza en los controladores
router.use(verifyFirebaseToken);

// POST /orders - Crear un nuevo pedido
router.post('/', createOrder);

// GET /orders/:id - Obtener un pedido por su ID
router.get('/:id', getOrderById);

// POST /orders/:id/cancel - Cancelar un pedido
router.post('/:id/cancel', cancelOrder);

// GET /orders/:id/cancellation - Obtener historial de cancelación
router.get('/:id/cancellation', getOrderCancellation);

export default router;

