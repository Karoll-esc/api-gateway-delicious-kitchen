/**
 * Tests para analyticsController - Principios FIRST
 * 
 * Verifica el controlador de analytics que proxy requests al order service.
 */

import { Request, Response } from 'express';

// Mock del BaseHttpClient ANTES de importar el controlador
const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../services/baseHttpClient', () => ({
  BaseHttpClient: jest.fn().mockImplementation(() => ({
    get: mockGet,
    post: mockPost,
  })),
}));

// Ahora sí importar el controlador (después de los mocks)
import { getAdminAnalytics, postAdminAnalyticsExport } from '../controllers/analyticsController';

describe('AnalyticsController - Principios FIRST', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSetHeader: jest.Mock;
  let mockSend: jest.Mock;

  beforeEach(() => {
    // Reset mocks (Independent)
    jest.clearAllMocks();

    // Setup de respuesta mock
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockSetHeader = jest.fn();
    mockSend = jest.fn();
    mockResponse = {
      status: mockStatus,
      json: mockJson,
      setHeader: mockSetHeader,
      send: mockSend,
    } as Partial<Response>;

    mockRequest = {
      query: {},
      body: {},
    };
  });

  describe('getAdminAnalytics', () => {
    // Fast: Sin I/O real
    it('debería retornar datos de analytics exitosamente', async () => {
      mockRequest.query = {
        from: '2024-01-01',
        to: '2024-12-31',
        groupBy: 'month',
      };

      const analyticsData = {
        period: { from: '2024-01-01', to: '2024-12-31' },
        data: [
          { date: '2024-01', revenue: 10000, orders: 150 },
          { date: '2024-02', revenue: 12000, orders: 180 },
        ],
      };

      mockGet.mockResolvedValue({
        success: true,
        status: 200,
        data: analyticsData,
      });

      await getAdminAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(analyticsData);
    });

    // Repeatable: Validaciones consistentes
    it('debería retornar 400 si falta el parámetro "from"', async () => {
      mockRequest.query = {
        to: '2024-12-31',
        groupBy: 'month',
      };

      await getAdminAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'from' }),
        ]),
      });
    });

    it('debería retornar 400 si falta el parámetro "to"', async () => {
      mockRequest.query = {
        from: '2024-01-01',
        groupBy: 'month',
      };

      await getAdminAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'to' }),
        ]),
      });
    });

    it('debería retornar 400 si falta el parámetro "groupBy"', async () => {
      mockRequest.query = {
        from: '2024-01-01',
        to: '2024-12-31',
      };

      await getAdminAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'groupBy' }),
        ]),
      });
    });

    it('debería aceptar parámetro opcional "top"', async () => {
      mockRequest.query = {
        from: '2024-01-01',
        to: '2024-12-31',
        groupBy: 'day',
        top: '10',
      };

      mockGet.mockResolvedValue({
        success: true,
        status: 200,
        data: { period: {}, data: [] },
      });

      await getAdminAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('top=10')
      );
    });

    it('debería retornar 204 cuando no hay datos disponibles', async () => {
      mockRequest.query = {
        from: '2024-01-01',
        to: '2024-12-31',
        groupBy: 'month',
      };

      mockGet.mockResolvedValue({
        success: true,
        status: 200,
        data: null,
      });

      await getAdminAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(204);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'No hay datos disponibles para el período seleccionado',
      });
    });

    it('debería manejar errores del order service', async () => {
      mockRequest.query = {
        from: '2024-01-01',
        to: '2024-12-31',
        groupBy: 'month',
      };

      mockGet.mockResolvedValue({
        success: false,
        status: 500,
        error: { error: 'INTERNAL_ERROR' },
        message: 'Database error',
      });

      await getAdminAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'INTERNAL_ERROR',
      });
    });
  });

  describe('postAdminAnalyticsExport', () => {
    it('debería exportar analytics exitosamente', async () => {
      mockRequest.body = {
        from: '2024-01-01',
        to: '2024-12-31',
        groupBy: 'month',
        columns: ['date', 'revenue', 'orders'],
      };

      const csvData = 'date,revenue,orders\n2024-01,10000,150\n2024-02,12000,180';

      mockPost.mockResolvedValue({
        success: true,
        status: 200,
        data: csvData,
      });

      await postAdminAnalyticsExport(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockSetHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="analytics_20240101-20241231.csv"'
      );
      expect(mockSend).toHaveBeenCalledWith(csvData);
    });

    it('debería retornar 400 si falta "from" en el body', async () => {
      mockRequest.body = {
        to: '2024-12-31',
        groupBy: 'month',
      };

      await postAdminAnalyticsExport(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'from' }),
        ]),
      });
    });

    it('debería retornar 400 si falta "to" en el body', async () => {
      mockRequest.body = {
        from: '2024-01-01',
        groupBy: 'month',
      };

      await postAdminAnalyticsExport(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('debería retornar 400 si falta "groupBy" en el body', async () => {
      mockRequest.body = {
        from: '2024-01-01',
        to: '2024-12-31',
      };

      await postAdminAnalyticsExport(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('debería aceptar parámetros opcionales "top" y "columns"', async () => {
      mockRequest.body = {
        from: '2024-01-01',
        to: '2024-12-31',
        groupBy: 'week',
        top: 5,
        columns: ['date', 'revenue'],
      };

      const csvData = 'date,revenue\n2024-W01,5000';

      mockPost.mockResolvedValue({
        success: true,
        status: 200,
        data: csvData,
      });

      await postAdminAnalyticsExport(mockRequest as Request, mockResponse as Response);

      expect(mockPost).toHaveBeenCalledWith(
        '/internal/analytics/export',
        expect.objectContaining({
          top: 5,
          columns: ['date', 'revenue'],
        })
      );
      expect(mockSend).toHaveBeenCalledWith(csvData);
    });

    it('debería manejar errores del order service', async () => {
      mockRequest.body = {
        from: '2024-01-01',
        to: '2024-12-31',
        groupBy: 'month',
      };

      mockPost.mockResolvedValue({
        success: false,
        status: 500,
        error: { error: 'EXPORT_FAILED' },
        message: 'Failed to generate export',
      });

      await postAdminAnalyticsExport(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'EXPORT_FAILED',
      });
    });
  });

  describe('Validaciones múltiples campos faltantes', () => {
    it('debería retornar todos los errores de validación en getAdminAnalytics', async () => {
      mockRequest.query = {}; // Sin ningún parámetro

      await getAdminAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'from' }),
          expect.objectContaining({ field: 'to' }),
          expect.objectContaining({ field: 'groupBy' }),
        ]),
      });
    });

    it('debería retornar todos los errores de validación en postAdminAnalyticsExport', async () => {
      mockRequest.body = {}; // Sin ningún campo

      await postAdminAnalyticsExport(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'from' }),
          expect.objectContaining({ field: 'to' }),
          expect.objectContaining({ field: 'groupBy' }),
        ]),
      });
    });
  });
});
