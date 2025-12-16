/**
 * Script administrativo para asignar custom claims a usuarios en Firebase Authentication
 * 
 * Este script permite asignar roles u otros claims personalizados a usuarios autenticados.
 * DEBE ejecutarse ÚNICAMENTE desde el servidor (backend) por razones de seguridad.
 * 
 * @author Delicious Kitchen Team
 * @version 2.0.0
 * @date 2025-12-16
 */

import admin from '../src/config/firebase';

/**
 * Roles permitidos en el sistema
 * - admin: Acceso completo a todas las funcionalidades
 * - kitchen: Acceso solo al panel de cocina
 * - client: Usuario registrado con historial y perfil
 */
const ALLOWED_ROLES = ['admin', 'kitchen', 'client'] as const;
type AllowedRole = typeof ALLOWED_ROLES[number];

/**
 * Interfaz para los argumentos del script
 */
interface ScriptArguments {
  userId: string;
  claimKey: string;
  claimValue: string;
}

/**
 * Parsea y valida los argumentos de línea de comandos
 * @returns Argumentos parseados
 * @throws Error si faltan argumentos o son inválidos
 */
function parseArguments(): ScriptArguments {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    throw new Error(
      'Argumentos insuficientes.\n\n' +
      'Uso: npm run set-claim <userId> <claimKey> <claimValue>\n' +
      'Ejemplo: npm run set-claim abc123 role admin'
    );
  }

  const [userId, claimKey, claimValue] = args;

  // Validar que no sean strings vacíos
  if (!userId.trim() || !claimKey.trim() || !claimValue.trim()) {
    throw new Error('Los argumentos no pueden estar vacíos');
  }

  return { userId, claimKey, claimValue };
}

/**
 * Valida que el usuario exista en Firebase Auth
 * @param userId - UID del usuario
 * @returns True si el usuario existe
 * @throws Error si el usuario no existe
 */
async function validateUserExists(userId: string): Promise<boolean> {
  try {
    await admin.auth().getUser(userId);
    return true;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error(`Usuario con UID "${userId}" no encontrado en Firebase Authentication`);
    }
    throw error;
  }
}

/**
 * Valida que el rol sea uno de los permitidos
 * @param claimKey - Clave del claim
 * @param claimValue - Valor del claim
 * @throws Error si es un claim de rol inválido
 */
function validateRoleClaim(claimKey: string, claimValue: string): void {
  if (claimKey.toLowerCase() === 'role') {
    const normalizedValue = claimValue.toLowerCase();
    if (!ALLOWED_ROLES.includes(normalizedValue as AllowedRole)) {
      throw new Error(
        `Rol "${claimValue}" no es válido.\n` +
        `Roles permitidos: ${ALLOWED_ROLES.join(', ')}`
      );
    }
  }
}

/**
 * Asigna un custom claim a un usuario
 * @param userId - UID del usuario
 * @param claimKey - Clave del claim a asignar
 * @param claimValue - Valor del claim
 */
async function setCustomUserClaim(
  userId: string,
  claimKey: string,
  claimValue: string
): Promise<void> {
  try {
    console.log('\n🔐 Iniciando asignación de custom claim...\n');

    // 1. Validar que el usuario exista
    console.log(`📋 Validando existencia del usuario: ${userId}`);
    await validateUserExists(userId);
    console.log('✅ Usuario encontrado\n');

    // 2. Validar el rol si aplica
    console.log(`🔍 Validando claim: ${claimKey} = ${claimValue}`);
    validateRoleClaim(claimKey, claimValue);
    console.log('✅ Claim válido\n');

    // 3. Obtener claims actuales
    const user = await admin.auth().getUser(userId);
    const currentClaims = user.customClaims || {};

    console.log('📊 Claims actuales:');
    console.log(JSON.stringify(currentClaims, null, 2));
    console.log('');

    // 4. Asignar el nuevo claim
    const newClaims = {
      ...currentClaims,
      [claimKey]: claimValue.toLowerCase(),
    };

    await admin.auth().setCustomUserClaims(userId, newClaims);

    console.log('✅ Custom claim asignado exitosamente\n');
    console.log('📊 Claims actualizados:');
    console.log(JSON.stringify(newClaims, null, 2));
    console.log('\n');
    console.log('📝 Detalles del usuario:');
    console.log(`   - UID: ${user.uid}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Nombre: ${user.displayName || 'No definido'}`);
    console.log(`   - Estado: ${user.disabled ? '❌ Deshabilitado' : '✅ Activo'}`);
    console.log('\n');
    console.log('⚠️  IMPORTANTE: El usuario debe cerrar sesión y volver a iniciar para que los cambios surtan efecto.');
    console.log('');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error al asignar custom claim:\n');
    console.error(`   ${error.message}\n`);
    
    if (error.code) {
      console.error(`   Código de error: ${error.code}\n`);
    }

    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

/**
 * Función principal
 */
async function main(): Promise<void> {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Script de Asignación de Custom Claims - Firebase Auth    ║');
    console.log('║  Delicious Kitchen - Backend Administrative Tool           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Parsear argumentos
    const { userId, claimKey, claimValue } = parseArguments();

    // Ejecutar asignación
    await setCustomUserClaim(userId, claimKey, claimValue);
  } catch (error: any) {
    console.error('\n❌ Error fatal:\n');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

// Ejecutar script
main();
