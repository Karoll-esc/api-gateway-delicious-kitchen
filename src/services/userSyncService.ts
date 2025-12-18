/**
 * Servicio de sincronización de usuarios entre Firebase Auth y Firestore.
 * Implementa operaciones atómicas con rollback para garantizar consistencia.
 * 
 * @see HU-009 - Unificar Fuente de Verdad para Datos de Usuario
 */

import admin from '../config/firebase';
import { db, USERS_COLLECTION } from '../config/firebase';
import { 
  IUser, 
  ICreateUserData, 
  IUpdateUserData, 
  ISyncAuditResult,
  UserRole,
  normalizeRole 
} from '../interfaces/IUser';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Servicio que maneja la sincronización bidireccional entre Firebase Auth y Firestore.
 * Todas las operaciones son atómicas: si falla una parte, se revierte todo.
 */
class UserSyncService {
  
  /**
   * Crea un usuario en ambos sistemas (Auth + Firestore) de forma atómica.
   * Si falla la creación en Firestore, elimina el usuario de Auth (rollback).
   * 
   * @param data - Datos del usuario a crear
   * @returns Usuario creado con su UID
   * @throws Error si falla la creación en cualquier sistema
   */
  async createUser(data: ICreateUserData): Promise<IUser> {
    const { email, password, name, role } = data;
    
    // Validar y normalizar el rol
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      throw new Error(`Rol inválido: ${role}. Roles permitidos: ADMIN, KITCHEN`);
    }

    let userRecord: admin.auth.UserRecord | null = null;

    try {
      // Paso 1: Crear usuario en Firebase Auth
      userRecord = await admin.auth().createUser({
        displayName: name,
        email,
        password,
        emailVerified: false,
        disabled: false,
      });

      // Paso 2: Asignar custom claim de rol (normalizado a mayúsculas)
      await admin.auth().setCustomUserClaims(userRecord.uid, { role: normalizedRole });

      // Paso 3: Crear documento en Firestore
      const now = new Date();
      const userData: IUser = {
        uid: userRecord.uid,
        email,
        name,
        role: normalizedRole,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await db.collection(USERS_COLLECTION).doc(userRecord.uid).set({
        ...userData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return userData;

    } catch (error) {
      // Rollback: Si se creó en Auth pero falló Firestore, eliminar de Auth
      if (userRecord) {
        try {
          await admin.auth().deleteUser(userRecord.uid);
          console.error(`[UserSyncService] Rollback: Usuario ${userRecord.uid} eliminado de Auth tras fallo en Firestore`);
        } catch (rollbackError) {
          console.error(`[UserSyncService] Error en rollback: No se pudo eliminar usuario ${userRecord.uid} de Auth`, rollbackError);
        }
      }
      throw error;
    }
  }

  /**
   * Actualiza datos de usuario en ambos sistemas de forma atómica.
   * Actualiza custom claims en Auth y documento en Firestore.
   * 
   * @param uid - UID del usuario a actualizar
   * @param data - Datos a actualizar (name y/o role)
   * @throws Error si el usuario no existe o falla la actualización
   */
  async updateUser(uid: string, data: IUpdateUserData): Promise<void> {
    const { name, role } = data;

    // Verificar que el usuario existe en Auth
    const userRecord = await admin.auth().getUser(uid);
    if (!userRecord) {
      throw new Error(`Usuario con UID ${uid} no encontrado en Auth`);
    }

    // Validar rol si se proporciona
    let normalizedRole: UserRole | undefined;
    if (role) {
      normalizedRole = normalizeRole(role) || undefined;
      if (!normalizedRole) {
        throw new Error(`Rol inválido: ${role}. Roles permitidos: ADMIN, KITCHEN, WAITER`);
      }
    }

    // Guardar estado anterior para posible rollback
    const previousName = userRecord.displayName;
    const previousRole = userRecord.customClaims?.role;

    try {
      // Paso 1: Actualizar en Firebase Auth
      if (name) {
        await admin.auth().updateUser(uid, { displayName: name });
      }
      if (normalizedRole) {
        await admin.auth().setCustomUserClaims(uid, { role: normalizedRole });
      }

      // Paso 2: Actualizar en Firestore
      const firestoreUpdate: Record<string, any> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (name) firestoreUpdate.name = name;
      if (normalizedRole) firestoreUpdate.role = normalizedRole;

      const userDocRef = db.collection(USERS_COLLECTION).doc(uid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        await userDocRef.update(firestoreUpdate);
      } else {
        // Si no existe en Firestore, crear documento (auto-sincronización)
        const authUser = await admin.auth().getUser(uid);
        await userDocRef.set({
          uid,
          email: authUser.email || '',
          name: name || authUser.displayName || '',
          role: normalizedRole || previousRole || 'KITCHEN',
          status: authUser.disabled ? 'inactive' : 'active',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

    } catch (error) {
      // Rollback: Restaurar estado anterior en Auth
      try {
        if (name && previousName !== undefined) {
          await admin.auth().updateUser(uid, { displayName: previousName });
        }
        if (normalizedRole && previousRole !== undefined) {
          await admin.auth().setCustomUserClaims(uid, { role: previousRole });
        }
        console.error(`[UserSyncService] Rollback: Usuario ${uid} restaurado en Auth tras fallo en Firestore`);
      } catch (rollbackError) {
        console.error(`[UserSyncService] Error en rollback de actualización para ${uid}`, rollbackError);
      }
      throw error;
    }
  }

  /**
   * Desactiva un usuario en ambos sistemas de forma atómica.
   * 
   * @param uid - UID del usuario a desactivar
   * @throws Error si el usuario no existe o falla la desactivación
   */
  async disableUser(uid: string): Promise<void> {
    // Verificar que el usuario existe
    const userRecord = await admin.auth().getUser(uid);
    if (!userRecord) {
      throw new Error(`Usuario con UID ${uid} no encontrado`);
    }

    try {
      // Paso 1: Desactivar en Firebase Auth
      await admin.auth().updateUser(uid, { disabled: true });

      // Paso 2: Marcar como inactivo en Firestore
      const userDocRef = db.collection(USERS_COLLECTION).doc(uid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        await userDocRef.update({
          status: 'inactive',
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Crear documento si no existe (auto-sincronización)
        await userDocRef.set({
          uid,
          email: userRecord.email || '',
          name: userRecord.displayName || '',
          role: userRecord.customClaims?.role || 'KITCHEN',
          status: 'inactive',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

    } catch (error) {
      // Rollback: Reactivar en Auth si falló Firestore
      try {
        await admin.auth().updateUser(uid, { disabled: false });
        console.error(`[UserSyncService] Rollback: Usuario ${uid} reactivado en Auth tras fallo en Firestore`);
      } catch (rollbackError) {
        console.error(`[UserSyncService] Error en rollback de desactivación para ${uid}`, rollbackError);
      }
      throw error;
    }
  }

  /**
   * Reactiva un usuario en ambos sistemas de forma atómica.
   * 
   * @param uid - UID del usuario a reactivar
   * @throws Error si el usuario no existe o falla la reactivación
   */
  async enableUser(uid: string): Promise<void> {
    // Verificar que el usuario existe
    const userRecord = await admin.auth().getUser(uid);
    if (!userRecord) {
      throw new Error(`Usuario con UID ${uid} no encontrado`);
    }

    try {
      // Paso 1: Activar en Firebase Auth
      await admin.auth().updateUser(uid, { disabled: false });

      // Paso 2: Marcar como activo en Firestore
      const userDocRef = db.collection(USERS_COLLECTION).doc(uid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        await userDocRef.update({
          status: 'active',
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Crear documento si no existe (auto-sincronización)
        await userDocRef.set({
          uid,
          email: userRecord.email || '',
          name: userRecord.displayName || '',
          role: userRecord.customClaims?.role || 'KITCHEN',
          status: 'active',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

    } catch (error) {
      // Rollback: Desactivar en Auth si falló Firestore
      try {
        await admin.auth().updateUser(uid, { disabled: true });
        console.error(`[UserSyncService] Rollback: Usuario ${uid} desactivado en Auth tras fallo en Firestore`);
      } catch (rollbackError) {
        console.error(`[UserSyncService] Error en rollback de activación para ${uid}`, rollbackError);
      }
      throw error;
    }
  }

  /**
   * Ejecuta una auditoría de sincronización entre Firebase Auth y Firestore.
   * Detecta inconsistencias y genera un reporte completo.
   * 
   * @returns Resultado de la auditoría con usuarios faltantes e inconsistencias
   */
  async auditSync(): Promise<ISyncAuditResult> {
    const result: ISyncAuditResult = {
      missingInFirestore: [],
      missingInAuth: [],
      inconsistencies: [],
      summary: {
        totalInAuth: 0,
        totalInFirestore: 0,
        missingInFirestoreCount: 0,
        missingInAuthCount: 0,
        inconsistenciesCount: 0,
        isConsistent: true,
      },
    };

    // Obtener todos los usuarios de Auth
    const authUsers = await admin.auth().listUsers(1000);
    const authUsersMap = new Map<string, admin.auth.UserRecord>();
    authUsers.users.forEach(user => authUsersMap.set(user.uid, user));
    result.summary.totalInAuth = authUsers.users.length;

    // Obtener todos los documentos de Firestore
    const firestoreSnapshot = await db.collection(USERS_COLLECTION).get();
    const firestoreUsersMap = new Map<string, IUser>();
    firestoreSnapshot.docs.forEach(doc => {
      firestoreUsersMap.set(doc.id, doc.data() as IUser);
    });
    result.summary.totalInFirestore = firestoreSnapshot.docs.length;

    // Detectar usuarios en Auth que no están en Firestore
    for (const [uid, authUser] of authUsersMap) {
      if (!firestoreUsersMap.has(uid)) {
        result.missingInFirestore.push({
          uid,
          email: authUser.email,
          name: authUser.displayName,
        });
      }
    }

    // Detectar documentos en Firestore sin usuario en Auth
    for (const [uid, firestoreUser] of firestoreUsersMap) {
      if (!authUsersMap.has(uid)) {
        result.missingInAuth.push({
          uid,
          email: firestoreUser.email,
          name: firestoreUser.name,
        });
      }
    }

    // Detectar inconsistencias en datos comunes
    for (const [uid, authUser] of authUsersMap) {
      const firestoreUser = firestoreUsersMap.get(uid);
      if (firestoreUser) {
        // Comparar name (displayName en Auth vs name en Firestore)
        if (authUser.displayName !== firestoreUser.name) {
          result.inconsistencies.push({
            uid,
            field: 'name',
            authValue: authUser.displayName,
            firestoreValue: firestoreUser.name,
          });
        }

        // Comparar rol (normalizar para comparación justa)
        const authRole = authUser.customClaims?.role?.toUpperCase();
        const firestoreRole = firestoreUser.role?.toUpperCase();
        if (authRole !== firestoreRole) {
          result.inconsistencies.push({
            uid,
            field: 'role',
            authValue: authUser.customClaims?.role,
            firestoreValue: firestoreUser.role,
          });
        }

        // Comparar estado (disabled en Auth vs status en Firestore)
        const authDisabled = authUser.disabled;
        const firestoreInactive = firestoreUser.status === 'inactive';
        if (authDisabled !== firestoreInactive) {
          result.inconsistencies.push({
            uid,
            field: 'status',
            authValue: authDisabled ? 'inactive' : 'active',
            firestoreValue: firestoreUser.status,
          });
        }
      }
    }

    // Actualizar resumen
    result.summary.missingInFirestoreCount = result.missingInFirestore.length;
    result.summary.missingInAuthCount = result.missingInAuth.length;
    result.summary.inconsistenciesCount = result.inconsistencies.length;
    result.summary.isConsistent = 
      result.summary.missingInFirestoreCount === 0 &&
      result.summary.missingInAuthCount === 0 &&
      result.summary.inconsistenciesCount === 0;

    return result;
  }

  /**
   * Migra todos los usuarios existentes de Auth a Firestore.
   * Solo crea documentos para usuarios que no existen en Firestore.
   * Normaliza los roles a mayúsculas durante la migración.
   * 
   * @returns Número de usuarios migrados
   */
  async migrateAuthToFirestore(): Promise<{ migrated: number; errors: string[] }> {
    const errors: string[] = [];
    let migrated = 0;

    const authUsers = await admin.auth().listUsers(1000);

    for (const authUser of authUsers.users) {
      const userDocRef = db.collection(USERS_COLLECTION).doc(authUser.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        try {
          // Normalizar rol a mayúsculas
          const rawRole = authUser.customClaims?.role || 'WAITER';
          const normalizedRole = normalizeRole(rawRole) || 'WAITER';

          // Actualizar custom claim con rol normalizado si es diferente
          if (rawRole !== normalizedRole) {
            await admin.auth().setCustomUserClaims(authUser.uid, { role: normalizedRole });
          }

          await userDocRef.set({
            uid: authUser.uid,
            email: authUser.email || '',
            name: authUser.displayName || '',
            role: normalizedRole,
            status: authUser.disabled ? 'inactive' : 'active',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          migrated++;
        } catch (error: any) {
          errors.push(`Error migrando ${authUser.uid}: ${error.message}`);
        }
      }
    }

    return { migrated, errors };
  }
}

export default new UserSyncService();
