/**
 * Tests unitarios para UserSyncService.
 * Valida la sincronización entre Firebase Auth y Firestore.
 * 
 * @see HU-009 - Unificar Fuente de Verdad para Datos de Usuario
 */

import userSyncService from '../services/userSyncService';
import admin from '../config/firebase';
import { db, USERS_COLLECTION } from '../config/firebase';
import { normalizeRole } from '../interfaces/IUser';

// Mock de Firebase Admin
jest.mock('../config/firebase', () => {
  const mockAuth = {
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
    listUsers: jest.fn(),
  };

  const mockDocRef = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  };

  const mockCollection = {
    doc: jest.fn(() => mockDocRef),
    get: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      auth: jest.fn(() => mockAuth),
    },
    db: {
      collection: jest.fn(() => mockCollection),
    },
    USERS_COLLECTION: 'users',
  };
});

describe('UserSyncService', () => {
  let mockAuth: any;
  let mockDocRef: any;
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAuth = admin.auth();
    mockCollection = db.collection(USERS_COLLECTION);
    mockDocRef = mockCollection.doc();
  });

  describe('normalizeRole', () => {
    it('debería normalizar roles válidos a mayúsculas', () => {
      expect(normalizeRole('admin')).toBe('ADMIN');
      expect(normalizeRole('ADMIN')).toBe('ADMIN');
      expect(normalizeRole('Admin')).toBe('ADMIN');
      expect(normalizeRole('kitchen')).toBe('KITCHEN');
    });

    it('debería retornar null para roles inválidos', () => {
      expect(normalizeRole('invalid')).toBeNull();
      expect(normalizeRole('superadmin')).toBeNull();
      expect(normalizeRole('')).toBeNull();
    });
  });

  describe('createUser - Escenario: Creación sincronizada', () => {
    /**
     * TC-HU009-001: Creación exitosa sincronizada
     * Given: Un administrador crea un nuevo usuario
     * When: Se completa el proceso de creación
     * Then: El usuario debe existir en Firebase Auth Y Firestore
     */
    it('debería crear usuario en Auth y Firestore de forma sincronizada', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'ADMIN' as const,
      };

      mockAuth.createUser.mockResolvedValue({ uid: 'user-123' });
      mockAuth.setCustomUserClaims.mockResolvedValue(undefined);
      mockDocRef.set.mockResolvedValue(undefined);

      const result = await userSyncService.createUser(userData);

      // Verificar creación en Auth
      expect(mockAuth.createUser).toHaveBeenCalledWith({
        displayName: userData.name,
        email: userData.email,
        password: userData.password,
        emailVerified: false,
        disabled: false,
      });

      // Verificar asignación de rol en custom claims
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('user-123', { role: 'ADMIN' });

      // Verificar creación en Firestore
      expect(mockCollection.doc).toHaveBeenCalledWith('user-123');
      expect(mockDocRef.set).toHaveBeenCalled();

      // Verificar respuesta
      expect(result.uid).toBe('user-123');
      expect(result.email).toBe(userData.email);
      expect(result.role).toBe('ADMIN');
    });

    /**
     * TC-HU009-002: Rollback si falla Firestore
     * Given: Se crea usuario en Auth exitosamente
     * When: Falla la creación en Firestore
     * Then: Debe hacer rollback eliminando de Auth
     */
    it('debería hacer rollback de Auth si falla Firestore', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'ADMIN' as const,
      };

      mockAuth.createUser.mockResolvedValue({ uid: 'user-123' });
      mockAuth.setCustomUserClaims.mockResolvedValue(undefined);
      mockAuth.deleteUser.mockResolvedValue(undefined);
      mockDocRef.set.mockRejectedValue(new Error('Firestore error'));

      await expect(userSyncService.createUser(userData)).rejects.toThrow('Firestore error');

      // Verificar rollback
      expect(mockAuth.deleteUser).toHaveBeenCalledWith('user-123');
    });

    /**
     * TC-HU009-003: Validación de rol inválido
     * Given: Se intenta crear usuario con rol inválido
     * When: Se procesa la creación
     * Then: Debe rechazar con error de validación
     */
    it('debería rechazar roles inválidos', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'INVALID' as any,
      };

      await expect(userSyncService.createUser(userData)).rejects.toThrow(
        'Rol inválido: INVALID. Roles permitidos: ADMIN, KITCHEN'
      );

      // No debe llamar a Auth ni Firestore
      expect(mockAuth.createUser).not.toHaveBeenCalled();
      expect(mockDocRef.set).not.toHaveBeenCalled();
    });
  });

  describe('updateUser - Escenario: Actualización sincronizada de rol', () => {
    /**
     * TC-HU009-004: Actualización de rol sincronizada
     * Given: Existe un usuario registrado en ambos sistemas
     * When: Un administrador actualiza el rol
     * Then: Debe actualizarse en Auth (claims) Y Firestore
     */
    it('debería actualizar rol en Auth y Firestore', async () => {
      mockAuth.getUser.mockResolvedValue({ 
        uid: 'user-123',
        displayName: 'Test User',
        customClaims: { role: 'KITCHEN' }
      });
      mockAuth.setCustomUserClaims.mockResolvedValue(undefined);
      mockDocRef.get.mockResolvedValue({ exists: true });
      mockDocRef.update.mockResolvedValue(undefined);

      await userSyncService.updateUser('user-123', { role: 'ADMIN' });

      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('user-123', { role: 'ADMIN' });
      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN' })
      );
    });

    /**
     * TC-HU009-005: Auto-sincronización si no existe en Firestore
     * Given: Usuario existe en Auth pero no en Firestore
     * When: Se actualiza el usuario
     * Then: Debe crear documento en Firestore automáticamente
     */
    it('debería crear documento en Firestore si no existe (auto-sync)', async () => {
      mockAuth.getUser.mockResolvedValue({ 
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        disabled: false,
        customClaims: { role: 'KITCHEN' }
      });
      mockAuth.updateUser.mockResolvedValue(undefined);
      mockDocRef.get.mockResolvedValue({ exists: false });
      mockDocRef.set.mockResolvedValue(undefined);

      await userSyncService.updateUser('user-123', { name: 'New Name' });

      // Debe crear documento nuevo en Firestore
      expect(mockDocRef.set).toHaveBeenCalled();
    });
  });

  describe('disableUser - Escenario: Desactivación sincronizada', () => {
    /**
     * TC-HU009-006: Desactivación atómica
     * Given: Existe un usuario activo en el sistema
     * When: Un administrador desactiva al usuario
     * Then: disabled=true en Auth Y status='inactive' en Firestore
     */
    it('debería desactivar en Auth y Firestore atómicamente', async () => {
      mockAuth.getUser.mockResolvedValue({ 
        uid: 'user-123',
        disabled: false
      });
      mockAuth.updateUser.mockResolvedValue(undefined);
      mockDocRef.get.mockResolvedValue({ exists: true });
      mockDocRef.update.mockResolvedValue(undefined);

      await userSyncService.disableUser('user-123');

      expect(mockAuth.updateUser).toHaveBeenCalledWith('user-123', { disabled: true });
      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'inactive' })
      );
    });

    /**
     * TC-HU009-007: Rollback si falla Firestore al desactivar
     * Given: Se desactiva en Auth exitosamente
     * When: Falla actualización en Firestore
     * Then: Debe reactivar en Auth (rollback)
     */
    it('debería hacer rollback reactivando Auth si falla Firestore', async () => {
      mockAuth.getUser.mockResolvedValue({ uid: 'user-123', disabled: false });
      mockAuth.updateUser.mockResolvedValue(undefined);
      mockDocRef.get.mockResolvedValue({ exists: true });
      mockDocRef.update.mockRejectedValue(new Error('Firestore error'));

      await expect(userSyncService.disableUser('user-123')).rejects.toThrow();

      // Rollback: reactivar en Auth
      expect(mockAuth.updateUser).toHaveBeenCalledWith('user-123', { disabled: false });
    });
  });

  describe('enableUser - Escenario: Reactivación sincronizada', () => {
    /**
     * TC-HU009-008: Reactivación atómica
     * Given: Existe un usuario desactivado
     * When: Se reactiva el usuario
     * Then: disabled=false en Auth Y status='active' en Firestore
     */
    it('debería reactivar en Auth y Firestore atómicamente', async () => {
      mockAuth.getUser.mockResolvedValue({ 
        uid: 'user-123',
        disabled: true
      });
      mockAuth.updateUser.mockResolvedValue(undefined);
      mockDocRef.get.mockResolvedValue({ exists: true });
      mockDocRef.update.mockResolvedValue(undefined);

      await userSyncService.enableUser('user-123');

      expect(mockAuth.updateUser).toHaveBeenCalledWith('user-123', { disabled: false });
      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });
  });

  describe('auditSync - Escenario: Detección de inconsistencias', () => {
    /**
     * TC-HU009-009: Detectar usuarios faltantes en Firestore
     * Given: Existen usuarios en Auth sin documento en Firestore
     * When: Se ejecuta auditoría
     * Then: Debe reportar usuarios faltantes en Firestore
     */
    it('debería detectar usuarios faltantes en Firestore', async () => {
      mockAuth.listUsers.mockResolvedValue({
        users: [
          { uid: 'user-1', email: 'user1@test.com', displayName: 'User 1' },
          { uid: 'user-2', email: 'user2@test.com', displayName: 'User 2' },
        ]
      });
      
      mockCollection.get.mockResolvedValue({
        docs: [
          { id: 'user-1', data: () => ({ uid: 'user-1', email: 'user1@test.com', name: 'User 1', role: 'ADMIN', status: 'active' }) }
        ]
      });

      const result = await userSyncService.auditSync();

      expect(result.missingInFirestore).toHaveLength(1);
      expect(result.missingInFirestore[0].uid).toBe('user-2');
      expect(result.summary.isConsistent).toBe(false);
    });

    /**
     * TC-HU009-010: Detectar documentos huérfanos en Firestore
     * Given: Existen documentos en Firestore sin usuario en Auth
     * When: Se ejecuta auditoría
     * Then: Debe reportar documentos huérfanos
     */
    it('debería detectar documentos huérfanos en Firestore', async () => {
      mockAuth.listUsers.mockResolvedValue({
        users: [
          { uid: 'user-1', email: 'user1@test.com', displayName: 'User 1', customClaims: { role: 'ADMIN' }, disabled: false }
        ]
      });
      
      mockCollection.get.mockResolvedValue({
        docs: [
          { id: 'user-1', data: () => ({ uid: 'user-1', email: 'user1@test.com', name: 'User 1', role: 'ADMIN', status: 'active' }) },
          { id: 'user-orphan', data: () => ({ uid: 'user-orphan', email: 'orphan@test.com', name: 'Orphan', role: 'KITCHEN', status: 'active' }) }
        ]
      });

      const result = await userSyncService.auditSync();

      expect(result.missingInAuth).toHaveLength(1);
      expect(result.missingInAuth[0].uid).toBe('user-orphan');
    });

    /**
     * TC-HU009-011: Detectar inconsistencias de rol
     * Given: El rol en Auth difiere del rol en Firestore
     * When: Se ejecuta auditoría
     * Then: Debe reportar inconsistencia de rol
     */
    it('debería detectar inconsistencias de rol', async () => {
      mockAuth.listUsers.mockResolvedValue({
        users: [
          { uid: 'user-1', email: 'user1@test.com', displayName: 'User 1', customClaims: { role: 'ADMIN' }, disabled: false }
        ]
      });
      
      mockCollection.get.mockResolvedValue({
        docs: [
          { id: 'user-1', data: () => ({ uid: 'user-1', email: 'user1@test.com', name: 'User 1', role: 'KITCHEN', status: 'active' }) }
        ]
      });

      const result = await userSyncService.auditSync();

      expect(result.inconsistencies).toContainEqual(
        expect.objectContaining({
          uid: 'user-1',
          field: 'role',
          authValue: 'ADMIN',
          firestoreValue: 'KITCHEN'
        })
      );
    });

    /**
     * TC-HU009-012: Sistema consistente
     * Given: Todos los usuarios están sincronizados correctamente
     * When: Se ejecuta auditoría
     * Then: isConsistent debe ser true
     */
    it('debería reportar sistema consistente cuando todo está sincronizado', async () => {
      mockAuth.listUsers.mockResolvedValue({
        users: [
          { uid: 'user-1', email: 'user1@test.com', displayName: 'User 1', customClaims: { role: 'ADMIN' }, disabled: false }
        ]
      });
      
      mockCollection.get.mockResolvedValue({
        docs: [
          { id: 'user-1', data: () => ({ uid: 'user-1', email: 'user1@test.com', name: 'User 1', role: 'ADMIN', status: 'active' }) }
        ]
      });

      const result = await userSyncService.auditSync();

      expect(result.summary.isConsistent).toBe(true);
      expect(result.missingInFirestore).toHaveLength(0);
      expect(result.missingInAuth).toHaveLength(0);
      expect(result.inconsistencies).toHaveLength(0);
    });
  });

  describe('migrateAuthToFirestore', () => {
    /**
     * TC-HU009-013: Migración de usuarios existentes
     * Given: Existen usuarios en Auth sin documento en Firestore
     * When: Se ejecuta migración
     * Then: Debe crear documentos en Firestore y normalizar roles
     */
    it('debería migrar usuarios de Auth a Firestore', async () => {
      mockAuth.listUsers.mockResolvedValue({
        users: [
          { uid: 'user-1', email: 'user1@test.com', displayName: 'User 1', customClaims: { role: 'admin' }, disabled: false },
          { uid: 'user-2', email: 'user2@test.com', displayName: 'User 2', customClaims: { role: 'KITCHEN' }, disabled: true }
        ]
      });
      
      mockDocRef.get.mockResolvedValue({ exists: false });
      mockDocRef.set.mockResolvedValue(undefined);
      mockAuth.setCustomUserClaims.mockResolvedValue(undefined);

      const result = await userSyncService.migrateAuthToFirestore();

      expect(result.migrated).toBe(2);
      expect(result.errors).toHaveLength(0);
      
      // Verificar normalización de rol
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('user-1', { role: 'ADMIN' });
    });

    /**
     * TC-HU009-014: Omitir usuarios ya migrados
     * Given: Usuario ya existe en Firestore
     * When: Se ejecuta migración
     * Then: Debe omitir ese usuario
     */
    it('debería omitir usuarios que ya existen en Firestore', async () => {
      mockAuth.listUsers.mockResolvedValue({
        users: [
          { uid: 'user-1', email: 'user1@test.com', displayName: 'User 1', customClaims: { role: 'ADMIN' }, disabled: false }
        ]
      });
      
      mockDocRef.get.mockResolvedValue({ exists: true });

      const result = await userSyncService.migrateAuthToFirestore();

      expect(result.migrated).toBe(0);
      expect(mockDocRef.set).not.toHaveBeenCalled();
    });
  });
});
