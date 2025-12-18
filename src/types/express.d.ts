/**
 * Extensión de tipos de Express para agregar propiedades personalizadas
 * 
 * Este archivo extiende la interfaz Request de Express para incluir
 * información del usuario autenticado mediante Firebase.
 */

declare namespace Express {
  export interface Request {
    /**
     * Información del usuario autenticado mediante Firebase
     * 
     * Poblado por el middleware verifyFirebaseToken después de validar
     * el token JWT proporcionado en el header Authorization.
     */
    user?: {
      /** UID único del usuario en Firebase */
      uid: string;
      /** Email del usuario (puede ser undefined si no está disponible) */
      email?: string;
      /** Rol del usuario extraído de custom claims (por defecto 'USER') */
      role?: string;
      /** Indica si el email del usuario ha sido verificado */
      emailVerified?: boolean;
    };
  }
}
