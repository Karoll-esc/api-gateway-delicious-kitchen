import { Router } from 'express';
import { Request, Response } from 'express';
import { config } from '../config';
import { BaseHttpClient } from '../services/baseHttpClient';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';
import { requireRole } from '../middleware/requireRole';

/**
 * Rutas para el sistema de encuestas de proceso (proxy a order-service)
 * HU-013: Sistema de Encuestas de Proceso (Surveys)
 *
 * Endpoints públicos (cliente):
 * - POST /surveys - Crear encuesta (PÚBLICO - durante preparación/ready)
 * - GET /surveys/check/:orderNumber - Verificar si existe encuesta (PÚBLICO)
 * 
 * Endpoints protegidos (admin):
 * - GET /surveys - Listar todas las encuestas (ADMIN - vista feedback interno)
 * - GET /surveys/:id - Obtener encuesta específica (ADMIN)
 * 
 * Nota: Las encuestas no requieren moderación, son feedback interno del proceso.
 */
const router = Router();

const ORDER_SERVICE_URL = config.services.orderService.url;
const httpClient = new BaseHttpClient(ORDER_SERVICE_URL);

// ========== Endpoints Públicos (Cliente) ==========

/**
 * POST /surveys - Crear nueva encuesta de proceso (PÚBLICO)
 * Body: { orderNumber, customerName, customerEmail, waitTimeRating, serviceRating, comment? }
 * 
 * Respuestas:
 * - 201: Encuesta creada ("¡Gracias por tu opinión!")
 * - 400: Ratings fuera de rango (1-5) o estado inválido del pedido
 * - 404: Pedido no encontrado
 * - 409: Ya existe encuesta para el pedido
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const response = await httpClient.post<any>('/surveys', req.body);
    res.status(response.status || 201).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Error al crear encuesta';
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * GET /surveys/check/:orderNumber - Verificar si existe encuesta (PÚBLICO)
 * Útil para el frontend para decidir si mostrar el formulario
 * 
 * Respuestas:
 * - 200: { success: true, hasSurvey: boolean }
 */
router.get('/check/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const response = await httpClient.get<any>(`/surveys/check/${orderNumber}`);
    res.status(response.status || 200).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Error al verificar encuesta';
    res.status(status).json({
      success: false,
      message
    });
  }
});

// ========== Endpoints Protegidos (Admin) ==========

/**
 * GET /surveys - Obtener todas las encuestas (ADMIN - PROTEGIDA)
 * Query params: page?, limit?
 * 
 * Este endpoint es para la vista de admin que muestra el feedback
 * de los clientes durante el proceso de preparación.
 */
router.get('/', verifyFirebaseToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const queryParams = new URLSearchParams();

    if (page) queryParams.append('page', page as string);
    if (limit) queryParams.append('limit', limit as string);

    const queryString = queryParams.toString() ? '?' + queryParams.toString() : '';
    const response = await httpClient.get<any>(`/surveys${queryString}`);
    res.status(response.status || 200).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Error al obtener encuestas';
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * GET /surveys/:id - Obtener encuesta específica (ADMIN - PROTEGIDA)
 */
router.get('/:id', verifyFirebaseToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await httpClient.get<any>(`/surveys/${id}`);
    res.status(response.status || 200).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Error al obtener encuesta';
    res.status(status).json({
      success: false,
      message
    });
  }
});

export default router;
