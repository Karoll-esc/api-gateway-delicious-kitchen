/**
 * Tests para requireRole middleware - Principios FIRST
 * HU-005+: Control de Acceso Basado en Roles (RBAC)
 * 
 * Este middleware valida que el usuario tenga los permisos necesarios
 * para acceder a recursos protegidos según su rol.
 */

import { Response, NextFunction } from 'express';
import { requireRole } from '../middleware/requireRole';
import { AuthenticatedRequest } from '../middleware/verifyFirebaseToken';

describe('requireRole Middleware - RBAC (HU-005+)', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

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
      user: undefined,
    };

    mockNext = jest.fn();
  });

  describe('Casos Positivos (TC-005-P01, TC-005-P02)', () => {
    // Fast: Sin I/O, solo lógica
    it('debería permitir acceso cuando el usuario tiene el rol ADMIN', () => {
      mockRequest.user = {
        uid: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Self-validating: Verificaciones claras
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('debería permitir acceso cuando el usuario tiene rol KITCHEN', () => {
      mockRequest.user = {
        uid: 'chef-456',
        email: 'chef@example.com',
        role: 'KITCHEN',
        emailVerified: true,
      };

      const middleware = requireRole(['KITCHEN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('debería permitir acceso cuando el rol está en la lista de permitidos', () => {
      mockRequest.user = {
        uid: 'kitchen-789',
        email: 'kitchen@example.com',
        role: 'KITCHEN',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN', 'KITCHEN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    // Repeatable: Case-insensitive
    it('debería permitir acceso con rol en minúsculas (case-insensitive)', () => {
      mockRequest.user = {
        uid: 'admin-lower',
        email: 'lower@example.com',
        role: 'admin',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería permitir acceso con rol en mayúsculas cuando allowedRoles está en minúsculas', () => {
      mockRequest.user = {
        uid: 'admin-upper',
        email: 'upper@example.com',
        role: 'ADMIN',
        emailVerified: true,
      };

      const middleware = requireRole(['admin']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Casos Negativos (TC-005-N01, TC-005-N02, TC-005-N03)', () => {
    it('debería retornar 401 si req.user no existe (no autenticado)', () => {
      mockRequest.user = undefined;

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 403 si el usuario no tiene rol asignado', () => {
      mockRequest.user = {
        uid: 'no-role-user',
        email: 'norole@example.com',
        emailVerified: true,
        // Sin rol asignado
      };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'El usuario no tiene un rol asignado',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 403 si el usuario tiene rol pero no está en la lista permitida', () => {
      mockRequest.user = {
        uid: 'client-001',
        email: 'client@example.com',
        role: 'USER',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN', 'KITCHEN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Acceso denegado. Se requiere uno de los siguientes roles: ADMIN, KITCHEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 403 si el rol es inválido', () => {
      mockRequest.user = {
        uid: 'invalid-role',
        email: 'invalid@example.com',
        role: 'SUPERUSER',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería retornar 403 cuando KITCHEN intenta acceder a ruta de ADMIN', () => {
      mockRequest.user = {
        uid: 'kitchen-002',
        email: 'chef2@example.com',
        role: 'KITCHEN',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Acceso denegado. Se requiere uno de los siguientes roles: ADMIN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Casos de Borde (TC-005-B01, TC-005-B02)', () => {
    it('debería manejar roles con espacios en blanco', () => {
      mockRequest.user = {
        uid: 'space-user',
        email: 'space@example.com',
        role: '  ADMIN  ',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // El trim no se aplica automáticamente, debería fallar
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería manejar array vacío de roles permitidos', () => {
      mockRequest.user = {
        uid: 'admin-empty',
        email: 'admin@example.com',
        role: 'ADMIN',
        emailVerified: true,
      };

      const middleware = requireRole([]);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería manejar un solo rol en el array', () => {
      mockRequest.user = {
        uid: 'single-admin',
        email: 'single@example.com',
        role: 'ADMIN',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería manejar múltiples roles permitidos', () => {
      mockRequest.user = {
        uid: 'multi-kitchen',
        email: 'multi@example.com',
        role: 'KITCHEN',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN', 'KITCHEN', 'MANAGER']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería manejar rol null', () => {
      mockRequest.user = {
        uid: 'null-role',
        email: 'null@example.com',
        role: null as any,
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería manejar rol undefined', () => {
      mockRequest.user = {
        uid: 'undefined-role',
        email: 'undefined@example.com',
        role: undefined,
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Múltiples Roles (TC-005-M01)', () => {
    it('debería permitir ADMIN en ruta que acepta ADMIN o KITCHEN', () => {
      mockRequest.user = {
        uid: 'admin-multi',
        email: 'admin@example.com',
        role: 'ADMIN',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN', 'KITCHEN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería permitir KITCHEN en ruta que acepta ADMIN o KITCHEN', () => {
      mockRequest.user = {
        uid: 'kitchen-multi',
        email: 'kitchen@example.com',
        role: 'KITCHEN',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN', 'KITCHEN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('debería rechazar USER en ruta que acepta solo ADMIN o KITCHEN', () => {
      mockRequest.user = {
        uid: 'user-multi',
        email: 'user@example.com',
        role: 'USER',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN', 'KITCHEN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Independencia (Independent)', () => {
    it('no debería afectar el objeto req.user', () => {
      const originalUser = {
        uid: 'preserve-user',
        email: 'preserve@example.com',
        role: 'ADMIN',
        emailVerified: true,
      };

      mockRequest.user = { ...originalUser };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(originalUser);
    });

    it('cada instancia del middleware debería ser independiente', () => {
      const adminOnly = requireRole(['ADMIN']);
      const kitchenOnly = requireRole(['KITCHEN']);

      mockRequest.user = {
        uid: 'admin-instance',
        email: 'admin@example.com',
        role: 'ADMIN',
        emailVerified: true,
      };

      adminOnly(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      kitchenOnly(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Mensaje de Error (Timely)', () => {
    it('debería incluir lista de roles requeridos en mensaje de error', () => {
      mockRequest.user = {
        uid: 'error-message',
        email: 'error@example.com',
        role: 'USER',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN', 'KITCHEN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('ADMIN, KITCHEN'),
      });
    });

    it('debería mostrar mensaje claro cuando no hay rol asignado', () => {
      mockRequest.user = {
        uid: 'no-role',
        email: 'norole@example.com',
        emailVerified: true,
      };

      const middleware = requireRole(['ADMIN']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'El usuario no tiene un rol asignado',
      });
    });
  });
});
