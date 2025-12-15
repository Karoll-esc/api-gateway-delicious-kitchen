import { Request, Response } from 'express';
import { kitchenService } from '../services/httpClient';
import { HttpResponse } from '../utils/httpResponse';

/**
 * Controlador para obtener todos los pedidos en cocina
 * GET /kitchen/orders
 */
export const getKitchenOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const result = await kitchenService.getKitchenOrders(status as string);
    
    // El Kitchen Service devuelve {success: true, count: number, data: []}
    // Necesitamos extraer correctamente los datos para evitar anidación
    if (result.success && result.data) {
      const serviceData = result.data as any;
      // Si tiene estructura {success, count, data}, extraemos solo el data
      if (serviceData && typeof serviceData === 'object' && 'data' in serviceData && Array.isArray(serviceData.data)) {
        res.status(200).json({
          success: true,
          count: serviceData.count || serviceData.data.length,
          data: serviceData.data
        });
      } else {
        // Si es directamente un array
        res.status(200).json({
          success: true,
          count: Array.isArray(serviceData) ? serviceData.length : 1,
          data: serviceData
        });
      }
    } else {
      HttpResponse.fromServiceResponse(res, result);
    }
  } catch (error) {
    console.error('Error en getKitchenOrders:', error);
    HttpResponse.error(res, 'Error interno del servidor al obtener los pedidos de cocina', 500);
  }
};

/**
 * Controlador para obtener un pedido específico de cocina
 * GET /kitchen/orders/:orderId
 */
export const getKitchenOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      HttpResponse.error(res, 'Order ID es requerido', 400);
      return;
    }

    const result = await kitchenService.getKitchenOrderById(orderId);
    HttpResponse.fromServiceResponse(res, result);
  } catch (error: any) {
    console.error('Error en getKitchenOrderById:', error);
    
    if (error.response?.status === 404) {
      HttpResponse.error(res, `Pedido ${req.params.orderId} no encontrado`, 404);
    } else {
      HttpResponse.error(res, 'Error interno del servidor al obtener el pedido', 500);
    }
  }
};

/**
 * Controlador para iniciar la preparación de un pedido
 * POST /kitchen/orders/:orderId/start-preparing
 */
export const startPreparing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      HttpResponse.error(res, 'Order ID es requerido', 400);
      return;
    }

    const result = await kitchenService.startPreparing(orderId);
    HttpResponse.fromServiceResponse(res, result);
  } catch (error: any) {
    console.error('Error en startPreparing:', error);
    
    if (error.response?.status === 404) {
      HttpResponse.error(res, `Pedido ${req.params.orderId} no encontrado`, 404);
    } else if (error.response?.status === 400) {
      const message = error.response?.data?.message || 'No se puede iniciar la preparación';
      HttpResponse.error(res, message, 400);
    } else {
      HttpResponse.error(res, 'Error interno del servidor al iniciar la preparación', 500);
    }
  }
};

/**
 * Controlador para marcar un pedido como listo
 * POST /kitchen/orders/:orderId/ready
 */
export const markAsReady = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      HttpResponse.error(res, 'Order ID es requerido', 400);
      return;
    }

    const result = await kitchenService.markAsReady(orderId);
    HttpResponse.fromServiceResponse(res, result);
  } catch (error: any) {
    console.error('Error en markAsReady:', error);
    
    if (error.response?.status === 404) {
      HttpResponse.error(res, `Pedido ${req.params.orderId} no encontrado`, 404);
    } else if (error.response?.status === 400) {
      const message = error.response?.data?.message || 'No se puede marcar como listo';
      HttpResponse.error(res, message, 400);
    } else {
      HttpResponse.error(res, 'Error interno del servidor al marcar el pedido como listo', 500);
    }
  }
};

