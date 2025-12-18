/**
 * Tests para verifyFirebaseToken middleware - Principios FIRST
 * HU-004: Validar Tokens de Firebase en Cada Request del Backend
 * 
 * Este middleware es crítico para la seguridad del sistema.
 * Valida que todos los requests autenticados tengan un token válido de Firebase.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken, AuthenticatedRequest } from '../middleware/verifyFirebaseToken';
import admin from '../config/firebase';

// Mock de Firebase Admin
jest.mock('../config/firebase', () => ({
  __esModule: true,
  default: {
    auth: jest.fn(),
  },
  db: {},
  USERS_COLLECTION: 'users',
}));

describe('verifyFirebaseToken Middleware - Seguridad (HU-004)', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    // Reset mocks (Independent)
    jest.clearAllMocks();

    // Setup de respuesta mock
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    } as Partial<Response>;

    mockRequest = {
      headers: {},
    };

    mockNext = jest.fn();

    // Mock de Firebase Auth
    mockAuth = {
      verifyIdToken: jest.fn(),
    };
    (admin.auth as jest.Mock).mockReturnValue(mockAuth);
  });

  describe('Casos Positivos (TC-004-P01, TC-004-P02)', () => {
    // Fast: Sin I/O real
    it('debería permitir acceso con token válido y extraer información del usuario', async () => {
      const validToken = 'valid.jwt.token';
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      const decodedToken = {
        uid: 'user-123',
        email: 'user@example.com',
        role: 'ADMIN',
        email_verified: true,
      };

      mockAuth.verifyIdToken.mockResolvedValue(decodedToken);

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Self-validating: Verificaciones claras
      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith(validToken);
      expect(mockRequest.user).toEqual({
        uid: 'user-123',
        email: 'user@example.com',
        role: 'ADMIN',
        emailVerified: true,
      });
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    // Repeatable: Mismo resultado siempre
    it('debería asignar rol por defecto USER si no existe custom claim', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      const decodedToken = {
        uid: 'user-456',
        email: 'client@example.com',
        email_verified: false,
        // Sin custom claim 'role'
      };

      mockAuth.verifyIdToken.mockResolvedValue(decodedToken);

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user?.role).toBe('USER');
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería manejar tokens con roles personalizados', async () => {
      mockRequest.headers = {
        authorization: 'Bearer kitchen.token',
      };

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'kitchen-001',
        email: 'chef@example.com',
        role: 'KITCHEN',
        email_verified: true,
      });

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user?.role).toBe('KITCHEN');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Casos Negativos (TC-004-N01, TC-004-N02, TC-004-N03)', () => {
    it('debería retornar 401 si no hay header Authorization', async () => {
      mockRequest.headers = {}; // Sin Authorization header

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token de autenticación no proporcionado',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si el header no empieza con "Bearer "', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token123',
      };

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token de autenticación no proporcionado',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si el token está vacío', async () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token de autenticación inválido',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si el token solo contiene espacios', async () => {
      mockRequest.headers = {
        authorization: 'Bearer    ',
      };

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token de autenticación inválido',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si el token ha expirado', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired.token',
      };

      const expiredError = new Error('Token has expired');
      (expiredError as any).code = 'auth/id-token-expired';
      mockAuth.verifyIdToken.mockRejectedValue(expiredError);

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'El token de autenticación ha expirado',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si el token es inválido', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.malformed.token',
      };

      const invalidError = new Error('Invalid token');
      mockAuth.verifyIdToken.mockRejectedValue(invalidError);

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token de autenticación inválido',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 401 si el usuario ha sido eliminado', async () => {
      mockRequest.headers = {
        authorization: 'Bearer deleted.user.token',
      };

      const userNotFoundError = new Error('User not found');
      (userNotFoundError as any).code = 'auth/user-not-found';
      mockAuth.verifyIdToken.mockRejectedValue(userNotFoundError);

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Casos de Borde (TC-004-B01, TC-004-B02)', () => {
    it('debería manejar tokens muy largos', async () => {
      const longToken = 'a'.repeat(10000);
      mockRequest.headers = {
        authorization: `Bearer ${longToken}`,
      };

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'user-789',
        email: 'test@example.com',
      });

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith(longToken);
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería manejar múltiples espacios después de Bearer', async () => {
      mockRequest.headers = {
        authorization: 'Bearer     valid.token.here',
      };

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'user-999',
        email: 'spaces@example.com',
      });

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('    valid.token.here');
      expect(mockNext).toHaveBeenCalled();
    });

    it('debería manejar header con case diferente (authorization vs Authorization)', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid.token',
      };

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'user-case',
        email: 'case@example.com',
      });

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería rechazar header con "bearer" en minúsculas', async () => {
      mockRequest.headers = {
        authorization: 'bearer lowercase.token',
      };

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Independencia (Independent)', () => {
    it('no debería persistir req.user entre requests', async () => {
      const firstRequest = { headers: { authorization: 'Bearer token1' } } as AuthenticatedRequest;
      const secondRequest = { headers: { authorization: 'Bearer token2' } } as AuthenticatedRequest;

      mockAuth.verifyIdToken
        .mockResolvedValueOnce({ uid: 'user-1', email: 'user1@example.com' })
        .mockResolvedValueOnce({ uid: 'user-2', email: 'user2@example.com' });

      await verifyFirebaseToken(firstRequest, mockResponse as Response, mockNext);
      await verifyFirebaseToken(secondRequest, mockResponse as Response, mockNext);

      expect(firstRequest.user?.uid).toBe('user-1');
      expect(secondRequest.user?.uid).toBe('user-2');
      expect(firstRequest.user).not.toBe(secondRequest.user);
    });
  });

  describe('Seguridad (Timely)', () => {
    it('debería llamar a Firebase verifyIdToken exactamente una vez por request', async () => {
      mockRequest.headers = {
        authorization: 'Bearer security.token',
      };

      mockAuth.verifyIdToken.mockResolvedValue({
        uid: 'secure-user',
        email: 'secure@example.com',
      });

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockAuth.verifyIdToken).toHaveBeenCalledTimes(1);
    });

    it('no debería exponer información sensible en errores', async () => {
      mockRequest.headers = {
        authorization: 'Bearer sensitive.token',
      };

      const sensitiveError = new Error('Internal Firebase error with sensitive data');
      mockAuth.verifyIdToken.mockRejectedValue(sensitiveError);

      await verifyFirebaseToken(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.not.stringContaining('sensitive data'),
        })
      );
    });
  });
});
