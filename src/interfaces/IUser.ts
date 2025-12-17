/**
 * Interfaz que define la estructura del documento de usuario en Firestore.
 * Esta es la fuente de verdad autoritativa para datos de usuario,
 * sincronizada con Firebase Auth.
 * 
 * @see HU-009 - Unificar Fuente de Verdad para Datos de Usuario
 */

/**
 * Roles permitidos en el sistema.
 * Normalizados a mayúsculas para consistencia.
 */
export type UserRole = 'ADMIN' | 'KITCHEN' | 'WAITER';

/**
 * Estados posibles de un usuario.
 */
export type UserStatus = 'active' | 'inactive';

/**
 * Estructura del documento de usuario en Firestore.
 * Compatible con estructura existente del otro equipo (usa 'name' en lugar de 'displayName').
 */
export interface IUser {
  /** UID único del usuario (mismo que Firebase Auth) */
  uid: string;
  
  /** Correo electrónico del usuario */
  email: string;
  
  /** Nombre completo del usuario (compatible con estructura existente) */
  name: string;
  
  /** Rol del usuario en el sistema */
  role: UserRole;
  
  /** Estado del usuario (activo/inactivo) */
  status: UserStatus;
  
  /** Fecha de creación del registro */
  createdAt: Date;
  
  /** Fecha de última actualización */
  updatedAt: Date;
}

/**
 * Datos requeridos para crear un nuevo usuario.
 */
export interface ICreateUserData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

/**
 * Datos opcionales para actualizar un usuario.
 */
export interface IUpdateUserData {
  name?: string;
  role?: UserRole;
}

/**
 * Resultado de la auditoría de sincronización entre Auth y Firestore.
 */
export interface ISyncAuditResult {
  /** Usuarios que existen en Auth pero no en Firestore */
  missingInFirestore: Array<{
    uid: string;
    email: string | undefined;
    name: string | undefined;
  }>;
  
  /** Documentos en Firestore sin usuario correspondiente en Auth */
  missingInAuth: Array<{
    uid: string;
    email: string;
    name: string;
  }>;
  
  /** Usuarios con datos inconsistentes entre sistemas */
  inconsistencies: Array<{
    uid: string;
    field: string;
    authValue: string | boolean | undefined;
    firestoreValue: string | boolean | undefined;
  }>;
  
  /** Resumen de la auditoría */
  summary: {
    totalInAuth: number;
    totalInFirestore: number;
    missingInFirestoreCount: number;
    missingInAuthCount: number;
    inconsistenciesCount: number;
    isConsistent: boolean;
  };
}

/**
 * Valida y normaliza un rol a mayúsculas.
 * @param role - Rol a normalizar
 * @returns Rol normalizado o null si es inválido
 */
export function normalizeRole(role: string): UserRole | null {
  const normalized = role?.toUpperCase() as UserRole;
  const validRoles: UserRole[] = ['ADMIN', 'KITCHEN', 'WAITER'];
  return validRoles.includes(normalized) ? normalized : null;
}
