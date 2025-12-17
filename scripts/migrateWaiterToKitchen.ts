/**
 * Script de migración: WAITER → KITCHEN
 * 
 * Este script migra todos los usuarios con rol WAITER a rol KITCHEN
 * tanto en Firebase Authentication (custom claims) como en Firestore.
 * 
 * IMPORTANTE: Ejecutar este script ANTES de eliminar el rol WAITER del código.
 * 
 * @author Delicious Kitchen Team
 * @version 1.0.0
 * @date 2025-12-17
 */

import admin from '../src/config/firebase';

/**
 * Estadísticas de la migración
 */
interface MigrationStats {
  totalProcessed: number;
  successfulMigrations: number;
  alreadyMigrated: number;
  errors: number;
  errorDetails: Array<{ uid: string; email: string; error: string }>;
}

/**
 * Obtiene todos los usuarios de Firebase Authentication
 * @returns Lista de usuarios
 */
async function getAllAuthUsers(): Promise<admin.auth.UserRecord[]> {
  const users: admin.auth.UserRecord[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const listUsersResult = await admin.auth().listUsers(1000, pageToken);
      users.push(...listUsersResult.users);
      pageToken = listUsersResult.pageToken;
    } while (pageToken);

    return users;
  } catch (error: any) {
    console.error('❌ Error al obtener usuarios de Firebase Auth:', error.message);
    throw error;
  }
}

/**
 * Migra el rol de un usuario en Firebase Auth
 * @param user - Usuario de Firebase Auth
 * @returns True si se migró, false si ya tenía otro rol
 */
async function migrateAuthUser(user: admin.auth.UserRecord): Promise<boolean> {
  const currentRole = user.customClaims?.role;

  // Si el rol es WAITER (en cualquier variante de mayúsculas/minúsculas)
  if (currentRole && currentRole.toUpperCase() === 'WAITER') {
    const newClaims = {
      ...user.customClaims,
      role: 'KITCHEN',
    };

    await admin.auth().setCustomUserClaims(user.uid, newClaims);
    console.log(`  ✅ Auth migrado: ${user.email} (${currentRole} → KITCHEN)`);
    return true;
  }

  return false;
}

/**
 * Migra el rol de un usuario en Firestore
 * @param uid - UID del usuario
 * @param email - Email del usuario (para logging)
 */
async function migrateFirestoreUser(uid: string, email: string): Promise<void> {
  try {
    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const currentRole = userData?.role;

      if (currentRole && currentRole.toUpperCase() === 'WAITER') {
        await userRef.update({
          role: 'KITCHEN',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  ✅ Firestore migrado: ${email} (${currentRole} → KITCHEN)`);
      }
    }
  } catch (error: any) {
    // Si el documento no existe en Firestore, no es un error crítico
    if (error.code !== 'not-found') {
      throw error;
    }
  }
}

/**
 * Ejecuta la migración completa
 */
async function runMigration(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalProcessed: 0,
    successfulMigrations: 0,
    alreadyMigrated: 0,
    errors: 0,
    errorDetails: [],
  };

  console.log('\n🔄 Iniciando migración WAITER → KITCHEN...\n');

  try {
    // Obtener todos los usuarios
    console.log('📋 Obteniendo lista de usuarios de Firebase Auth...');
    const users = await getAllAuthUsers();
    stats.totalProcessed = users.length;
    console.log(`✅ ${users.length} usuarios encontrados\n`);

    // Procesar cada usuario
    for (const user of users) {
      try {
        const wasMigrated = await migrateAuthUser(user);

        if (wasMigrated) {
          // También migrar en Firestore
          await migrateFirestoreUser(user.uid, user.email || user.uid);
          stats.successfulMigrations++;
        } else {
          const currentRole = user.customClaims?.role || 'sin rol';
          if (currentRole.toUpperCase() !== 'WAITER') {
            stats.alreadyMigrated++;
          }
        }
      } catch (error: any) {
        stats.errors++;
        stats.errorDetails.push({
          uid: user.uid,
          email: user.email || 'sin email',
          error: error.message,
        });
        console.error(`  ❌ Error al migrar ${user.email}: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.error('\n❌ Error fatal en la migración:', error.message);
    throw error;
  }

  return stats;
}

/**
 * Muestra el reporte final de la migración
 */
function showReport(stats: MigrationStats): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           REPORTE DE MIGRACIÓN WAITER → KITCHEN            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Estadísticas:\n`);
  console.log(`   Total de usuarios procesados:    ${stats.totalProcessed}`);
  console.log(`   ✅ Migraciones exitosas:          ${stats.successfulMigrations}`);
  console.log(`   ⏭️  Ya tenían otro rol:            ${stats.alreadyMigrated}`);
  console.log(`   ❌ Errores:                        ${stats.errors}\n`);

  if (stats.errors > 0 && stats.errorDetails.length > 0) {
    console.log('⚠️  DETALLES DE ERRORES:\n');
    stats.errorDetails.forEach((detail, index) => {
      console.log(`   ${index + 1}. ${detail.email} (${detail.uid})`);
      console.log(`      Error: ${detail.error}\n`);
    });
  }

  if (stats.successfulMigrations > 0) {
    console.log('✅ Migración completada exitosamente');
    console.log('⚠️  IMPORTANTE: Los usuarios deben cerrar sesión y volver a iniciar');
    console.log('   sesión para que los cambios surtan efecto.\n');
  } else if (stats.errors === 0) {
    console.log('✅ No se encontraron usuarios con rol WAITER para migrar\n');
  }
}

/**
 * Función principal
 */
async function main(): Promise<void> {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Script de Migración de Roles - Firebase Auth/Firestore   ║');
    console.log('║  WAITER → KITCHEN                                          ║');
    console.log('║  Delicious Kitchen - Backend Administrative Tool           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Confirmar ejecución
    console.log('⚠️  Este script migrará todos los usuarios con rol WAITER a KITCHEN');
    console.log('   en Firebase Authentication y Firestore.\n');

    // Ejecutar migración
    const stats = await runMigration();

    // Mostrar reporte
    showReport(stats);

    process.exit(stats.errors > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\n❌ Error fatal:\n');
    console.error(`   ${error.message}\n`);
    
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Ejecutar script
main();
