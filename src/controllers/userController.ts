import { Request, Response } from 'express';
import admin from '../config/firebase';
import userSyncService from '../services/userSyncService';
import { normalizeRole, UserRole } from '../interfaces/IUser';

class UserController {
    /**
     * Crear usuario sincronizado en Auth + Firestore.
     * Implementa creación atómica con rollback automático.
     * @see HU-009 - Unificar Fuente de Verdad para Datos de Usuario
     */
    async createUser(req: Request, res: Response) {
      try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
          return res.status(400).json({ success: false, message: 'Faltan datos requeridos (name, email, password, role)' });
        }

        // Validar rol antes de procesar
        const normalizedRole = normalizeRole(role);
        if (!normalizedRole) {
          return res.status(400).json({ 
            success: false, 
            message: `Rol inválido: ${role}. Roles permitidos: ADMIN, KITCHEN, WAITER` 
          });
        }

        // Crear usuario sincronizado (Auth + Firestore) con rollback automático
        const user = await userSyncService.createUser({
          email,
          password,
          name,
          role: normalizedRole,
        });

        return res.status(201).json({ 
          success: true, 
          message: 'Usuario creado y sincronizado correctamente', 
          uid: user.uid 
        });
      } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || 'Error al crear usuario', error });
      }
    }

    /**
     * Editar usuario sincronizado (nombre, rol).
     * Actualiza Auth (displayName, custom claims) y Firestore atómicamente.
     * @see HU-009 - Unificar Fuente de Verdad para Datos de Usuario
     */
    async editUser(req: Request, res: Response) {
      try {
        const { uid } = req.params;
        const { name, role } = req.body;
        if (!uid || (!name && !role)) {
          return res.status(400).json({ success: false, message: 'Faltan datos requeridos (uid, name o role)' });
        }

        // Validar rol si se proporciona
        let normalizedRole: UserRole | undefined;
        if (role) {
          normalizedRole = normalizeRole(role) || undefined;
          if (!normalizedRole) {
            return res.status(400).json({ 
              success: false, 
              message: `Rol inválido: ${role}. Roles permitidos: ADMIN, KITCHEN, WAITER` 
            });
          }
        }

        // Actualizar usuario sincronizado (Auth + Firestore) con rollback automático
        await userSyncService.updateUser(uid, {
          name,
          role: normalizedRole,
        });

        return res.json({ success: true, message: 'Usuario actualizado y sincronizado correctamente' });
      } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || 'Error al editar usuario', error });
      }
    }

    /**
     * Desactivar usuario sincronizado.
     * Deshabilita en Auth (disabled: true) y marca inactivo en Firestore atómicamente.
     * @see HU-009 - Unificar Fuente de Verdad para Datos de Usuario
     */
    async disableUser(req: Request, res: Response) {
      try {
        const { uid } = req.params;
        if (!uid) {
          return res.status(400).json({ success: false, message: 'Falta uid' });
        }
        // No permitir que un admin se desactive a sí mismo
        if (req.user?.uid === uid) {
          return res.status(403).json({ success: false, message: 'No puedes desactivar tu propia cuenta' });
        }

        // Desactivar usuario sincronizado (Auth + Firestore) con rollback automático
        await userSyncService.disableUser(uid);

        return res.json({ success: true, message: 'Usuario desactivado y sincronizado correctamente' });
      } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || 'Error al desactivar usuario', error });
      }
    }

    /**
     * Reactivar usuario sincronizado.
     * Habilita en Auth (disabled: false) y marca activo en Firestore atómicamente.
     * @see HU-009 - Unificar Fuente de Verdad para Datos de Usuario
     */
    async enableUser(req: Request, res: Response) {
      try {
        const { uid } = req.params;
        if (!uid) {
          return res.status(400).json({ success: false, message: 'Falta uid' });
        }

        // Reactivar usuario sincronizado (Auth + Firestore) con rollback automático
        await userSyncService.enableUser(uid);

        return res.json({ success: true, message: 'Usuario reactivado y sincronizado correctamente' });
      } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || 'Error al reactivar usuario', error });
      }
    }

    /**
     * Ejecutar auditoría de sincronización Auth ↔ Firestore.
     * Detecta inconsistencias y genera reporte completo.
     * @see HU-009 - Unificar Fuente de Verdad para Datos de Usuario
     */
    async auditSync(req: Request, res: Response) {
      try {
        const auditResult = await userSyncService.auditSync();

        return res.json({ 
          success: true, 
          message: auditResult.summary.isConsistent 
            ? 'Los sistemas están sincronizados correctamente' 
            : 'Se detectaron inconsistencias entre Auth y Firestore',
          data: auditResult 
        });
      } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || 'Error al ejecutar auditoría', error });
      }
    }

    /**
     * Migrar usuarios existentes de Auth a Firestore.
     * Crea documentos en Firestore para usuarios que solo existen en Auth.
     * Normaliza roles a mayúsculas durante la migración.
     * @see HU-009 - Unificar Fuente de Verdad para Datos de Usuario
     */
    async migrateUsers(req: Request, res: Response) {
      try {
        const result = await userSyncService.migrateAuthToFirestore();

        return res.json({ 
          success: true, 
          message: `Migración completada: ${result.migrated} usuarios sincronizados`,
          data: result 
        });
      } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || 'Error al migrar usuarios', error });
      }
    }

    // Restablecer contraseña
    async resetPassword(req: Request, res: Response) {
      try {
        const { uid } = req.params;
        const { newPassword } = req.body;
        if (!uid || !newPassword) {
          return res.status(400).json({ success: false, message: 'Faltan datos requeridos (uid, newPassword)' });
        }
        await admin.auth().updateUser(uid, { password: newPassword });
        // TODO: Notificar al usuario si aplica
        return res.json({ success: true, message: 'Contraseña restablecida' });
      } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message || 'Error al restablecer contraseña', error });
      }
    }
  // List and search users with filters and pagination
  async listUsers(req: Request, res: Response) {
    try {
      // Parámetros de filtro
      const { name, email, role } = req.query;
      // Obtiene hasta 1000 usuarios de Firebase Auth (paginación básica de Firebase)
      const listUsersResult = await admin.auth().listUsers(1000);
      let users = listUsersResult.users.map((userRecord: admin.auth.UserRecord) => ({
        uid: userRecord.uid,
        name: userRecord.displayName,
        email: userRecord.email,
        role: userRecord.customClaims?.role || 'empleado',
        status: userRecord.disabled ? 'desactivado' : 'activo',
      }));

      // Filtros
      if (name) {
        users = users.filter((u: any) => u.name && u.name.toLowerCase().includes(String(name).toLowerCase()));
      }
      if (email) {
        users = users.filter((u: any) => u.email && u.email.toLowerCase().includes(String(email).toLowerCase()));
      }
      if (role) {
        users = users.filter((u: any) => u.role && u.role.toLowerCase() === String(role).toLowerCase());
      }

      // Paginación
      const page = parseInt(String(req.query.page || 1), 10);
      const limit = parseInt(String(req.query.limit || 20), 10);
      const start = (page - 1) * limit;
      const paginatedUsers = users.slice(start, start + limit);

      res.json({
        success: true,
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: users.length,
          totalPages: Math.ceil(users.length / limit),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener usuarios', error });
    }
  }
}

export default new UserController();
