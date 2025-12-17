import { Router } from 'express';
import { Request, Response } from 'express';
import { config } from '../config';
import { BaseHttpClient } from '../services/baseHttpClient';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';
import { requireRole } from '../middleware/requireRole';

/**
 * Rutas para el sistema de reseñas (proxy a order-service)
 *
 * Endpoints públicos:
 * - POST /reviews - Crear reseña (PÚBLICO)
 * - GET /reviews - Listar reseñas aprobadas (PÚBLICO)
 * - GET /reviews/:id - Obtener reseña específica (PÚBLICO)
 * 
 * Endpoints protegidos (admin):
 * - PATCH /reviews/:id/status - Cambiar estado (ADMIN)
 * - GET /admin/reviews - Listar todas las reseñas (ADMIN)
 */
const router = Router();

const ORDER_SERVICE_URL = config.services.orderService.url;
const httpClient = new BaseHttpClient(ORDER_SERVICE_URL);

/**
 * POST /reviews - Crear nueva reseña (PÚBLICO)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const response = await httpClient.post<any>('/reviews', req.body);

    res.status(response.status || 201).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Error creating review';
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * GET /reviews - Obtener reseñas aprobadas (PÚBLICO)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const queryParams = new URLSearchParams();

    if (page) queryParams.append('page', page as string);
    if (limit) queryParams.append('limit', limit as string);

    const queryString = queryParams.toString() ? '?' + queryParams.toString() : '';
    const response = await httpClient.get<any>(`/reviews${queryString}`);
    res.status(response.status || 200).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Error fetching reviews';
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * GET /admin/reviews - Obtener todas las reseñas (ADMIN - PROTEGIDA)
 * IMPORTANTE: Debe ir ANTES de /:id para que no lo capture
 */
router.get('/admin/reviews', verifyFirebaseToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    const queryParams = new URLSearchParams();

    if (page) queryParams.append('page', page as string);
    if (limit) queryParams.append('limit', limit as string);

    const queryString = queryParams.toString() ? '?' + queryParams.toString() : '';
    const response = await httpClient.get<any>(`/reviews/admin/reviews${queryString}`);
    res.status(response.status || 200).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Error fetching admin reviews';
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * GET /reviews/:id - Obtener reseña específica (PÚBLICO)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await httpClient.get<any>(`/reviews/${id}`);
    res.status(response.status || 200).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Error fetching review';
    res.status(status).json({
      success: false,
      message
    });
  }
});

/**
 * PATCH /reviews/:id/status - Cambiar estado de reseña (ADMIN - PROTEGIDA)
 */
router.patch('/:id/status', verifyFirebaseToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const response = await httpClient.patch<any>(
      `/reviews/${id}/status`,
      req.body
    );
    res.status(response.status || 200).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || 'Error updating review status';
    res.status(status).json({
      success: false,
      message
    });
  }
});

export default router;
