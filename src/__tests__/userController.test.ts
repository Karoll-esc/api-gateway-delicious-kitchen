import { Request, Response } from 'express';
import UserController from '../controllers/userController';
import userSyncService from '../services/userSyncService';
import admin from '../config/firebase';

// Mock del servicio de sincronización
jest.mock('../services/userSyncService');

// Mock de Firebase Admin para métodos que no usan userSyncService
jest.mock('../config/firebase', () => ({
  __esModule: true,
  default: {
    auth: jest.fn(),
  },
  db: {},
  USERS_COLLECTION: 'users',
}));

describe('UserController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    // Reset mocks antes de cada test (Independent)
    jest.clearAllMocks();

    // Setup de respuesta mock
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    } as Partial<Response>;

    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    // Mock de Firebase Auth para resetPassword y listUsers
    mockAuth = {
      updateUser: jest.fn(),
      listUsers: jest.fn(),
    };
    (admin.auth as jest.Mock).mockReturnValue(mockAuth);
  });

  describe('createUser', () => {
    // Fast: Sin dependencias externas, todo mockeado
    it('debería crear un usuario exitosamente con todos los datos requeridos', async () => {
      const userData = {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'Password123!',
        role: 'kitchen',
      };

      mockRequest.body = userData;
      
      const mockUser = {
        uid: 'user-123',
        email: userData.email,
        name: userData.name,
        role: 'KITCHEN' as const,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (userSyncService.createUser as jest.Mock).mockResolvedValue(mockUser);

      await UserController.createUser(mockRequest as Request, mockResponse as Response);

      // Self-validating: Verificaciones claras
      expect(userSyncService.createUser).toHaveBeenCalledWith({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: 'KITCHEN',
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario creado y sincronizado correctamente',
        uid: 'user-123',
      });
    });

    // Independent: No depende de otros tests
    it('debería retornar error 400 si falta el nombre', async () => {
      mockRequest.body = {
        email: 'juan@example.com',
        password: 'Password123!',
        role: 'kitchen',
      };

      await UserController.createUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.createUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Faltan datos requeridos (name, email, password, role)',
      });
    });

    it('debería retornar error 400 si falta el email', async () => {
      mockRequest.body = {
        name: 'Juan Pérez',
        password: 'Password123!',
        role: 'kitchen',
      };

      await UserController.createUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.createUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('debería retornar error 400 si falta la contraseña', async () => {
      mockRequest.body = {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        role: 'kitchen',
      };

      await UserController.createUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.createUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('debería retornar error 400 si falta el rol', async () => {
      mockRequest.body = {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'Password123!',
      };

      await UserController.createUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.createUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    // Repeatable: Siempre produce el mismo resultado
    it('debería manejar errores de Firebase Auth', async () => {
      mockRequest.body = {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'Password123!',
        role: 'kitchen',
      };

      const firebaseError = new Error('El email ya existe');
      (userSyncService.createUser as jest.Mock).mockRejectedValue(firebaseError);

      await UserController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'El email ya existe',
        error: firebaseError,
      });
    });

    it('debería crear usuario con rol de admin', async () => {
      mockRequest.body = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'AdminPass123!',
        role: 'admin',
      };

      const mockUser = {
        uid: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (userSyncService.createUser as jest.Mock).mockResolvedValue(mockUser);

      await UserController.createUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.createUser).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'AdminPass123!',
        name: 'Admin User',
        role: 'ADMIN',
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
    });
  });

  describe('editUser', () => {
    it('debería actualizar el nombre del usuario', async () => {
      mockRequest.params = { uid: 'user-123' };
      mockRequest.body = { name: 'Nuevo Nombre' };

      (userSyncService.updateUser as jest.Mock).mockResolvedValue(undefined);

      await UserController.editUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.updateUser).toHaveBeenCalledWith('user-123', {
        name: 'Nuevo Nombre',
        role: undefined,
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario actualizado y sincronizado correctamente',
      });
    });

    it('debería actualizar el rol del usuario', async () => {
      mockRequest.params = { uid: 'user-123' };
      mockRequest.body = { role: 'admin' };

      (userSyncService.updateUser as jest.Mock).mockResolvedValue(undefined);

      await UserController.editUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.updateUser).toHaveBeenCalledWith('user-123', {
        name: undefined,
        role: 'ADMIN',
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario actualizado y sincronizado correctamente',
      });
    });

    it('debería actualizar nombre y rol simultáneamente', async () => {
      mockRequest.params = { uid: 'user-123' };
      mockRequest.body = { name: 'Nuevo Nombre', role: 'admin' };

      (userSyncService.updateUser as jest.Mock).mockResolvedValue(undefined);

      await UserController.editUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.updateUser).toHaveBeenCalledWith('user-123', {
        name: 'Nuevo Nombre',
        role: 'ADMIN',
      });
    });

    it('debería retornar error 400 si falta el uid', async () => {
      mockRequest.params = {};
      mockRequest.body = { name: 'Nuevo Nombre' };

      await UserController.editUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.updateUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('debería retornar error 400 si no se proporciona nombre ni rol', async () => {
      mockRequest.params = { uid: 'user-123' };
      mockRequest.body = {};

      await UserController.editUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.updateUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('debería manejar errores de Firebase Auth al actualizar', async () => {
      mockRequest.params = { uid: 'user-not-found' };
      mockRequest.body = { name: 'Nuevo Nombre' };

      const firebaseError = new Error('Usuario no encontrado');
      (userSyncService.updateUser as jest.Mock).mockRejectedValue(firebaseError);

      await UserController.editUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no encontrado',
        error: firebaseError,
      });
    });
  });

  describe('disableUser', () => {
    it('debería desactivar un usuario exitosamente', async () => {
      mockRequest.params = { uid: 'user-123' };
      (userSyncService.disableUser as jest.Mock).mockResolvedValue(undefined);

      await UserController.disableUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.disableUser).toHaveBeenCalledWith('user-123');
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario desactivado y sincronizado correctamente',
      });
    });

    it('debería retornar error 400 si falta el uid', async () => {
      mockRequest.params = {};

      await UserController.disableUser(mockRequest as Request, mockResponse as Response);

      expect(userSyncService.disableUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Falta uid',
      });
    });

    it('debería manejar errores al desactivar usuario', async () => {
      mockRequest.params = { uid: 'user-123' };
      const firebaseError = new Error('Error al desactivar');
      (userSyncService.disableUser as jest.Mock).mockRejectedValue(firebaseError);

      await UserController.disableUser(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Error al desactivar',
        error: firebaseError,
      });
    });
  });

  describe('resetPassword', () => {
    it('debería restablecer la contraseña exitosamente', async () => {
      mockRequest.params = { uid: 'user-123' };
      mockRequest.body = { newPassword: 'NewPassword123!' };
      mockAuth.updateUser.mockResolvedValue(undefined);

      await UserController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockAuth.updateUser).toHaveBeenCalledWith('user-123', {
        password: 'NewPassword123!',
      });
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Contraseña restablecida',
      });
    });

    it('debería retornar error 400 si falta el uid', async () => {
      mockRequest.params = {};
      mockRequest.body = { newPassword: 'NewPassword123!' };

      await UserController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockAuth.updateUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('debería retornar error 400 si falta la nueva contraseña', async () => {
      mockRequest.params = { uid: 'user-123' };
      mockRequest.body = {};

      await UserController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockAuth.updateUser).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('debería manejar errores al restablecer contraseña', async () => {
      mockRequest.params = { uid: 'user-123' };
      mockRequest.body = { newPassword: 'NewPassword123!' };
      const firebaseError = new Error('Contraseña débil');
      mockAuth.updateUser.mockRejectedValue(firebaseError);

      await UserController.resetPassword(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Contraseña débil',
        error: firebaseError,
      });
    });
  });

  describe('listUsers', () => {
    const mockUsers = [
      {
        uid: 'user-1',
        displayName: 'Juan Pérez',
        email: 'juan@example.com',
        disabled: false,
        customClaims: { role: 'empleado' },
      },
      {
        uid: 'user-2',
        displayName: 'María García',
        email: 'maria@example.com',
        disabled: false,
        customClaims: { role: 'admin' },
      },
      {
        uid: 'user-3',
        displayName: 'Carlos López',
        email: 'carlos@example.com',
        disabled: true,
        customClaims: { role: 'empleado' },
      },
    ];

    it('debería listar todos los usuarios sin filtros', async () => {
      mockAuth.listUsers.mockResolvedValue({ users: mockUsers });

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      expect(mockAuth.listUsers).toHaveBeenCalledWith(1000);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            uid: 'user-1',
            name: 'Juan Pérez',
            email: 'juan@example.com',
            role: 'empleado',
            status: 'activo',
          },
          {
            uid: 'user-2',
            name: 'María García',
            email: 'maria@example.com',
            role: 'admin',
            status: 'activo',
          },
          {
            uid: 'user-3',
            name: 'Carlos López',
            email: 'carlos@example.com',
            role: 'empleado',
            status: 'desactivado',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1,
        },
      });
    });

    it('debería filtrar usuarios por nombre', async () => {
      mockAuth.listUsers.mockResolvedValue({ users: mockUsers });
      mockRequest.query = { name: 'juan' };

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [
            expect.objectContaining({
              name: 'Juan Pérez',
              email: 'juan@example.com',
            }),
          ],
        })
      );
    });

    it('debería filtrar usuarios por email', async () => {
      mockAuth.listUsers.mockResolvedValue({ users: mockUsers });
      mockRequest.query = { email: 'maria' };

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              email: 'maria@example.com',
            }),
          ],
        })
      );
    });

    it('debería filtrar usuarios por rol', async () => {
      mockAuth.listUsers.mockResolvedValue({ users: mockUsers });
      mockRequest.query = { role: 'admin' };

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              role: 'admin',
            }),
          ],
        })
      );
    });

    it('debería aplicar múltiples filtros simultáneamente', async () => {
      mockAuth.listUsers.mockResolvedValue({ users: mockUsers });
      mockRequest.query = { role: 'empleado', name: 'juan' };

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              name: 'Juan Pérez',
              role: 'empleado',
            }),
          ],
        })
      );
    });

    it('debería paginar correctamente - página 1', async () => {
      const manyUsers = Array.from({ length: 25 }, (_, i) => ({
        uid: `user-${i}`,
        displayName: `Usuario ${i}`,
        email: `user${i}@example.com`,
        disabled: false,
        customClaims: { role: 'empleado' },
      }));

      mockAuth.listUsers.mockResolvedValue({ users: manyUsers });
      mockRequest.query = { page: '1', limit: '10' };

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      expect(response.data).toHaveLength(10);
      expect(response.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('debería paginar correctamente - página 2', async () => {
      const manyUsers = Array.from({ length: 25 }, (_, i) => ({
        uid: `user-${i}`,
        displayName: `Usuario ${i}`,
        email: `user${i}@example.com`,
        disabled: false,
        customClaims: { role: 'empleado' },
      }));

      mockAuth.listUsers.mockResolvedValue({ users: manyUsers });
      mockRequest.query = { page: '2', limit: '10' };

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      expect(response.data).toHaveLength(10);
      expect(response.pagination.page).toBe(2);
    });

    it('debería usar valores por defecto para paginación', async () => {
      mockAuth.listUsers.mockResolvedValue({ users: mockUsers });
      mockRequest.query = {};

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      const response = mockJson.mock.calls[0][0];
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.limit).toBe(20);
    });

    it('debería asignar rol por defecto "empleado" si no existe customClaims', async () => {
      const usersWithoutRole = [
        {
          uid: 'user-1',
          displayName: 'Sin Rol',
          email: 'sinrol@example.com',
          disabled: false,
          customClaims: undefined,
        },
      ];

      mockAuth.listUsers.mockResolvedValue({ users: usersWithoutRole });

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              role: 'empleado',
            }),
          ],
        })
      );
    });

    it('debería manejar errores al listar usuarios', async () => {
      const firebaseError = new Error('Error al listar usuarios');
      mockAuth.listUsers.mockRejectedValue(firebaseError);

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Error al obtener usuarios',
        error: firebaseError,
      });
    });

    it('debería retornar array vacío si no hay coincidencias con los filtros', async () => {
      mockAuth.listUsers.mockResolvedValue({ users: mockUsers });
      mockRequest.query = { name: 'NoExiste' };

      await UserController.listUsers(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [],
        })
      );
    });
  });
});
