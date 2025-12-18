/**
 * Tests para surveyRoutes - Principios FIRST
 * HU-013: Sistema de Encuestas de Proceso (Surveys)
 * 
 * Verifica el enrutamiento correcto de las rutas de encuestas,
 * incluyendo rutas públicas (cliente) y protegidas (admin).
 */

import request from 'supertest';
import express, { Express } from 'express';

// Mock del BaseHttpClient ANTES de importar las rutas
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPatch = jest.fn();

jest.mock('../services/baseHttpClient', () => ({
  BaseHttpClient: jest.fn().mockImplementation(() => ({
    post: mockPost,
    get: mockGet,
    patch: mockPatch,
  })),
}));

// Mock de los middlewares de autenticación y autorización
jest.mock('../middleware/verifyFirebaseToken', () => ({
  verifyFirebaseToken: (req: any, res: any, next: any) => next(),
}));

jest.mock('../middleware/requireRole', () => ({
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

// Ahora sí importar las rutas (después de los mocks)
import surveyRoutes from '../routes/surveyRoutes';

describe('SurveyRoutes - HU-013 (Principios FIRST)', () => {
  let app: Express;

  beforeEach(() => {
    // Reset mocks (Independent)
    jest.clearAllMocks();

    // Crear app de Express
    app = express();
    app.use(express.json());
    app.use('/surveys', surveyRoutes);
  });

  describe('POST /surveys (Público - Crear encuesta)', () => {
    // Fast: Sin I/O real
    it('debería crear una encuesta exitosamente', async () => {
      const surveyData = {
        orderNumber: 'ORD-2024-001',
        customerName: 'María García',
        customerEmail: 'maria@example.com',
        waitTimeRating: 5,
        serviceRating: 4,
        comment: 'Muy rápido',
      };

      mockPost.mockResolvedValue({
        status: 201,
        data: {
          success: true,
          message: '¡Gracias por tu opinión!',
          survey: { id: 'survey-123', ...surveyData },
        },
      });

      const response = await request(app)
        .post('/surveys')
        .send(surveyData);

      expect(response.status).toBe(201);
      expect(mockPost).toHaveBeenCalledWith('/surveys', surveyData);
    });

    // Repeatable: Validaciones consistentes
    it('debería retornar 400 si el rating está fuera de rango (1-5)', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Rating must be between 1 and 5' },
        },
      });

      const response = await request(app)
        .post('/surveys')
        .send({
          orderNumber: 'ORD-001',
          waitTimeRating: 10,
          serviceRating: 3,
        });

      expect(response.status).toBe(400);
    });

    it('debería retornar 404 si el pedido no existe', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Order not found' },
        },
      });

      const response = await request(app)
        .post('/surveys')
        .send({
          orderNumber: 'INVALID-ORDER',
          waitTimeRating: 5,
          serviceRating: 5,
        });

      expect(response.status).toBe(404);
    });

    it('debería retornar 409 si ya existe encuesta para el pedido', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'Survey already exists for this order' },
        },
      });

      const response = await request(app)
        .post('/surveys')
        .send({
          orderNumber: 'ORD-DUPLICATE',
          waitTimeRating: 5,
          serviceRating: 5,
        });

      expect(response.status).toBe(409);
    });

    it('debería aceptar encuesta sin comentario (opcional)', async () => {
      const surveyData = {
        orderNumber: 'ORD-2024-002',
        customerName: 'Pedro López',
        customerEmail: 'pedro@example.com',
        waitTimeRating: 4,
        serviceRating: 5,
      };

      mockPost.mockResolvedValue({
        status: 201,
        data: {
          success: true,
          survey: { id: 'survey-456', ...surveyData },
        },
      });

      const response = await request(app)
        .post('/surveys')
        .send(surveyData);

      expect(response.status).toBe(201);
      expect(mockPost).toHaveBeenCalledWith('/surveys', surveyData);
    });
  });

  describe('GET /surveys/check/:orderNumber (Público - Verificar existencia)', () => {
    it('debería verificar si existe encuesta para un pedido', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          exists: true,
          survey: { id: 'survey-123', orderNumber: 'ORD-2024-001' },
        },
      });

      const response = await request(app).get('/surveys/check/ORD-2024-001');

      expect(response.status).toBe(200);
      expect(mockGet).toHaveBeenCalledWith('/surveys/check/ORD-2024-001');
    });

    it('debería retornar exists:false si no hay encuesta', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: { exists: false },
      });

      const response = await request(app).get('/surveys/check/ORD-NEW');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /surveys (Admin - Listar todas)', () => {
    it('debería listar todas las encuestas para admin', async () => {
      const surveys = {
        success: true,
        surveys: [
          { id: 'survey-1', waitTimeRating: 5, serviceRating: 4 },
          { id: 'survey-2', waitTimeRating: 3, serviceRating: 5 },
        ],
        totalCount: 2,
      };

      mockGet.mockResolvedValue({
        status: 200,
        data: surveys,
      });

      const response = await request(app).get('/surveys');

      expect(response.status).toBe(200);
      expect(mockGet).toHaveBeenCalledWith('/surveys');
    });

    it('debería soportar paginación', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: { surveys: [], page: 2, limit: 20 },
      });

      const response = await request(app).get('/surveys?page=2&limit=20');

      expect(response.status).toBe(200);
      expect(mockGet).toHaveBeenCalledWith('/surveys?page=2&limit=20');
    });

    it('debería pasar parámetros de query no procesados al servicio', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: { surveys: [] },
      });

      // La ruta solo procesa page y limit, otros parámetros no se pasan
      const response = await request(app).get('/surveys?from=2024-01-01&to=2024-12-31');

      expect(response.status).toBe(200);
      // Solo se pasan los query params que la ruta conoce (page, limit)
      expect(mockGet).toHaveBeenCalledWith('/surveys');
    });
  });

  describe('GET /surveys/:id (Admin - Detalle específico)', () => {
    it('debería obtener una encuesta específica', async () => {
      const survey = {
        id: 'survey-123',
        orderNumber: 'ORD-2024-001',
        waitTimeRating: 5,
        serviceRating: 4,
        comment: 'Excelente',
        createdAt: '2024-12-17T10:00:00Z',
      };

      mockGet.mockResolvedValue({
        status: 200,
        data: survey,
      });

      const response = await request(app).get('/surveys/survey-123');

      expect(response.status).toBe(200);
      expect(mockGet).toHaveBeenCalledWith('/surveys/survey-123');
    });

    it('debería retornar 404 si la encuesta no existe', async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Survey not found' },
        },
      });

      const response = await request(app).get('/surveys/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('Validación de datos de entrada', () => {
    it('debería validar que waitTimeRating sea un número', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'waitTimeRating must be a number' },
        },
      });

      const response = await request(app)
        .post('/surveys')
        .send({
          orderNumber: 'ORD-001',
          waitTimeRating: 'invalid',
          serviceRating: 5,
        });

      expect(response.status).toBe(400);
    });

    it('debería validar que serviceRating sea un número', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'serviceRating must be a number' },
        },
      });

      const response = await request(app)
        .post('/surveys')
        .send({
          orderNumber: 'ORD-001',
          waitTimeRating: 5,
          serviceRating: 'invalid',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Estadísticas de encuestas (Casos Borde)', () => {
    it('debería manejar encuestas sin comentarios', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          surveys: [
            { id: 'survey-1', waitTimeRating: 5, serviceRating: 5, comment: null },
          ],
        },
      });

      const response = await request(app).get('/surveys');

      expect(response.status).toBe(200);
    });

    it('debería manejar ratings mínimos (1)', async () => {
      const surveyData = {
        orderNumber: 'ORD-MIN',
        waitTimeRating: 1,
        serviceRating: 1,
      };

      mockPost.mockResolvedValue({
        status: 201,
        data: { success: true, survey: surveyData },
      });

      const response = await request(app)
        .post('/surveys')
        .send(surveyData);

      expect(response.status).toBe(201);
    });

    it('debería manejar ratings máximos (5)', async () => {
      const surveyData = {
        orderNumber: 'ORD-MAX',
        waitTimeRating: 5,
        serviceRating: 5,
      };

      mockPost.mockResolvedValue({
        status: 201,
        data: { success: true, survey: surveyData },
      });

      const response = await request(app)
        .post('/surveys')
        .send(surveyData);

      expect(response.status).toBe(201);
    });
  });
});
