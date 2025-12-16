import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';
import { HttpResponse } from '../utils/httpResponse';

/**
 * Interfaz extendida de Request con información del usuario autenticado
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
    emailVerified?: boolean;
  };
}

/**
 * Middleware para verificar el token de Firebase en cada request
 * 
 * Extrae el token del header Authorization (formato: "Bearer <token>"),
 * lo valida contra Firebase Admin SDK y extrae la información del usuario,
 * incluyendo custom claims como el rol.
 * 
 * @param req - Request de Express
 * @param res - Response de Express
 * @param next - NextFunction para continuar al siguiente middleware
 * 
 * @returns void - Retorna error 401 si el token no es válido o no existe
 */
export const verifyFirebaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extraer el token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      HttpResponse.unauthorized(res, 'Token de autenticación no proporcionado');
      return;
    }

    // Obtener el token sin el prefijo "Bearer "
    const token = authHeader.split('Bearer ')[1];

    if (!token || token.trim() === '') {
      HttpResponse.unauthorized(res, 'Token de autenticación inválido');
      return;
    }

    // Verificar el token con Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Extraer información del usuario incluyendo custom claims
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'USER', // Custom claim para el rol
      emailVerified: decodedToken.email_verified,
    };

    // Continuar al siguiente middleware
    next();
  } catch (error: any) {
    // Manejo de errores específicos de Firebase
    if (error.code === 'auth/id-token-expired') {
      HttpResponse.unauthorized(res, 'El token de autenticación ha expirado');
      return;
    }

    if (error.code === 'auth/id-token-revoked') {
      HttpResponse.unauthorized(res, 'El token de autenticación ha sido revocado');
      return;
    }

    if (error.code === 'auth/argument-error') {
      HttpResponse.unauthorized(res, 'Token de autenticación con formato inválido');
      return;
    }

    // Error genérico de autenticación
    HttpResponse.unauthorized(res, 'Token de autenticación inválido');
  }
};
