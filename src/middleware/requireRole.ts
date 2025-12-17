import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './verifyFirebaseToken';
import { HttpResponse } from '../utils/httpResponse';

/**
 * Middleware para validar que el usuario tenga uno de los roles requeridos
 * 
 * Este middleware debe usarse después de verifyFirebaseToken para garantizar
 * que req.user esté poblado con la información del usuario autenticado.
 * 
 * @param allowedRoles - Array de roles permitidos (ej: ['ADMIN', 'KITCHEN'])
 * 
 * @returns Middleware function que valida el rol del usuario
 * 
 * @example
 * router.get('/admin/users', verifyFirebaseToken, requireRole(['ADMIN']), userController.getUsers);
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Verificar que el usuario esté autenticado (req.user debe existir)
    if (!req.user) {
      HttpResponse.unauthorized(res, 'Usuario no autenticado');
      return;
    }

    // Verificar que el usuario tenga un rol asignado
    if (!req.user.role) {
      HttpResponse.forbidden(res, 'El usuario no tiene un rol asignado');
      return;
    }

    // Normalizar roles a mayúsculas para comparación case-insensitive
    const userRole = req.user.role.toUpperCase();
    const normalizedAllowedRoles = allowedRoles.map(role => role.toUpperCase());

    // Validar que el rol del usuario esté en la lista de roles permitidos
    if (!normalizedAllowedRoles.includes(userRole)) {
      HttpResponse.forbidden(
        res,
        `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      );
      return;
    }

    // El usuario tiene un rol válido, continuar al siguiente middleware
    next();
  };
};
