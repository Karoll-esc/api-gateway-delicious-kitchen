/**
 * Tests para analyticsRoutes - Principios FIRST
 * 
 * Verifica el enrutamiento correcto de las rutas de analytics,
 * incluyendo middleware de autenticación y autorización.
 */

import request from 'supertest';
import express, { Express } from 'express';
import analyticsRoutes from '../routes/analyticsRoutes';
import * as analyticsController from '../controllers/analyticsController';

// Mock del controlador
jest.mock('../controllers/analyticsController');

// Mock de los middlewares de autenticación y autorización
jest.mock('../middleware/verifyFirebaseToken', () => ({
  verifyFirebaseToken: (req: any, res: any, next: any) => next(),
}));

jest.mock('../middleware/requireRole', () => ({
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

describe('AnalyticsRoutes - Principios FIRST', () => {
  let app: Express;

  beforeEach(() => {
    // Reset mocks (Independent)
    jest.clearAllMocks();

    // Crear app de Express
    app = express();
    app.use(express.json());
    app.use('/analytics', analyticsRoutes);
  });

  describe('GET /analytics/admin/analytics', () => {
    // Fast: Sin I/O real
    it('debería llamar a getAdminAnalytics cuando se hace GET', async () => {
      (analyticsController.getAdminAnalytics as jest.Mock).mockImplementation((req, res) => {
        res.status(200).json({ success: true, data: [] });
      });

      const response = await request(app).get('/analytics/admin/analytics?from=2024-01-01&to=2024-12-31&groupBy=month');

      expect(analyticsController.getAdminAnalytics).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('debería pasar query params correctamente', async () => {
      let capturedQuery: any;
      (analyticsController.getAdminAnalytics as jest.Mock).mockImplementation((req, res) => {
        capturedQuery = req.query;
        res.status(200).json({ success: true });
      });

      await request(app).get('/analytics/admin/analytics?from=2024-01-01&to=2024-12-31&groupBy=day&top=10');

      expect(capturedQuery.from).toBe('2024-01-01');
      expect(capturedQuery.to).toBe('2024-12-31');
      expect(capturedQuery.groupBy).toBe('day');
      expect(capturedQuery.top).toBe('10');
    });
  });

  describe('POST /analytics/admin/analytics/export', () => {
    it('debería llamar a postAdminAnalyticsExport cuando se hace POST', async () => {
      (analyticsController.postAdminAnalyticsExport as jest.Mock).mockImplementation((req, res) => {
        res.status(200).json({ success: true, exportUrl: 'http://example.com/export.csv' });
      });

      const exportData = {
        from: '2024-01-01',
        to: '2024-12-31',
        groupBy: 'month',
        columns: ['date', 'revenue', 'orders'],
      };

      const response = await request(app)
        .post('/analytics/admin/analytics/export')
        .send(exportData);

      expect(analyticsController.postAdminAnalyticsExport).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('debería pasar el body correctamente al controlador', async () => {
      let capturedBody: any;
      (analyticsController.postAdminAnalyticsExport as jest.Mock).mockImplementation((req, res) => {
        capturedBody = req.body;
        res.status(200).json({ success: true });
      });

      const exportData = {
        from: '2024-06-01',
        to: '2024-06-30',
        groupBy: 'week',
        top: 5,
        columns: ['date', 'revenue'],
      };

      await request(app)
        .post('/analytics/admin/analytics/export')
        .send(exportData);

      expect(capturedBody).toEqual(exportData);
    });
  });

  describe('Rutas no existentes', () => {
    it('debería retornar 404 para rutas no definidas', async () => {
      const response = await request(app).get('/analytics/invalid-route');
      expect(response.status).toBe(404);
    });

    it('debería retornar 404 para métodos no permitidos', async () => {
      const response = await request(app).delete('/analytics/admin/analytics');
      expect(response.status).toBe(404);
    });
  });
});
