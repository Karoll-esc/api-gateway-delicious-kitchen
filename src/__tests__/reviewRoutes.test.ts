/**
 * Tests para reviewRoutes - Principios FIRST
 * 
 * Verifica el enrutamiento correcto de las rutas de reseñas (reviews),
 * incluyendo rutas públicas y protegidas por autenticación.
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
import reviewRoutes from '../routes/reviewRoutes';

describe('ReviewRoutes - Principios FIRST', () => {
  let app: Express;

  beforeEach(() => {
    // Reset mocks (Independent)
    jest.clearAllMocks();

    // Crear app de Express
    app = express();
    app.use(express.json());
    app.use('/reviews', reviewRoutes);
  });

  describe('POST /reviews (Público)', () => {
    // Fast: Sin I/O real
    it('debería crear una reseña exitosamente', async () => {
      const reviewData = {
        orderNumber: 'ORD-2024-001',
        customerName: 'Juan Pérez',
        customerEmail: 'juan@example.com',
        rating: 5,
        comment: 'Excelente servicio',
      };

      mockPost.mockResolvedValue({
        status: 201,
        data: {
          success: true,
          review: { id: 'review-123', ...reviewData },
        },
      });

      const response = await request(app)
        .post('/reviews')
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(mockPost).toHaveBeenCalledWith('/reviews', reviewData);
    });

    it('debería manejar errores al crear reseña', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Invalid rating' },
        },
      });

      const response = await request(app)
        .post('/reviews')
        .send({ rating: 10 });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /reviews (Público - listar aprobadas)', () => {
    it('debería listar reseñas aprobadas', async () => {
      const approvedReviews = {
        success: true,
        reviews: [
          { id: 'review-1', rating: 5, status: 'approved' },
          { id: 'review-2', rating: 4, status: 'approved' },
        ],
      };

      mockGet.mockResolvedValue({
        status: 200,
        data: approvedReviews,
      });

      const response = await request(app).get('/reviews');

      expect(response.status).toBe(200);
      expect(mockGet).toHaveBeenCalledWith('/reviews');
    });

    it('debería manejar paginación', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: { reviews: [], page: 2, limit: 10 },
      });

      const response = await request(app).get('/reviews?page=2&limit=10');

      expect(response.status).toBe(200);
      expect(mockGet).toHaveBeenCalledWith('/reviews?page=2&limit=10');
    });
  });

  describe('GET /reviews/:id (Público)', () => {
    it('debería obtener una reseña específica', async () => {
      const review = {
        id: 'review-123',
        rating: 5,
        comment: 'Excelente',
        status: 'approved',
      };

      mockGet.mockResolvedValue({
        status: 200,
        data: review,
      });

      const response = await request(app).get('/reviews/review-123');

      expect(response.status).toBe(200);
      expect(mockGet).toHaveBeenCalledWith('/reviews/review-123');
    });

    it('debería retornar 404 si la reseña no existe', async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 404,
          data: { message: 'Review not found' },
        },
      });

      const response = await request(app).get('/reviews/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /reviews/:id/status (Admin)', () => {
    it('debería cambiar el estado de una reseña', async () => {
      mockPatch.mockResolvedValue({
        status: 200,
        data: {
          success: true,
          review: { id: 'review-123', status: 'approved' },
        },
      });

      const response = await request(app)
        .patch('/reviews/review-123/status')
        .send({ status: 'approved' });

      expect(response.status).toBe(200);
      expect(mockPatch).toHaveBeenCalledWith(
        '/reviews/review-123/status',
        { status: 'approved' }
      );
    });

    it('debería rechazar estados inválidos', async () => {
      mockPatch.mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Invalid status' },
        },
      });

      const response = await request(app)
        .patch('/reviews/review-123/status')
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /reviews/admin/reviews (Admin - todas las reseñas)', () => {
    it('debería listar todas las reseñas incluyendo pendientes', async () => {
      const allReviews = {
        reviews: [
          { id: 'review-1', status: 'pending' },
          { id: 'review-2', status: 'approved' },
          { id: 'review-3', status: 'rejected' },
        ],
      };

      mockGet.mockResolvedValue({
        status: 200,
        data: allReviews,
      });

      const response = await request(app).get('/reviews/admin/reviews');

      expect(response.status).toBe(200);
      expect(mockGet).toHaveBeenCalledWith('/reviews/admin/reviews');
    });

    it('debería permitir filtrar por estado', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: { reviews: [] },
      });

      const response = await request(app).get('/reviews/admin/reviews?status=pending');

      expect(response.status).toBe(200);
      // La ruta construye el query string internamente
      expect(mockGet).toHaveBeenCalled();
    });
  });
});
