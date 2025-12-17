/**
 * Script de migración de usuarios de Firebase Auth a Firestore.
 * Ejecuta la sincronización inicial de usuarios existentes.
 * 
 * Uso: npx ts-node scripts/migrateUsersToFirestore.ts
 * 
 * @see HU-009 - Unificar Fuente de Verdad para Datos de Usuario
 */

import admin from '../src/config/firebase';
import { db, USERS_COLLECTION } from '../src/config/firebase';
import { normalizeRole } from '../src/interfaces/IUser';
import { FieldValue } from 'firebase-admin/firestore';

async function migrateUsers(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🚀 Iniciando migración de usuarios Auth → Firestore');
  console.log('='.repeat(60));

  try {
    // Obtener todos los usuarios de Auth
    const authUsers = await admin.auth().listUsers(1000);
    console.log(`\n📊 Total de usuarios en Firebase Auth: ${authUsers.users.length}`);

    let migrated = 0;
    let skipped = 0;
    let rolesNormalized = 0;
    const errors: string[] = [];

    for (const authUser of authUsers.users) {
      const userDocRef = db.collection(USERS_COLLECTION).doc(authUser.uid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        console.log(`⏭️  Usuario ${authUser.email} ya existe en Firestore - omitido`);
        skipped++;
        continue;
      }

      try {
        // Normalizar rol a mayúsculas
        const rawRole = authUser.customClaims?.role || 'WAITER';
        const normalizedRole = normalizeRole(rawRole) || 'WAITER';

        // Actualizar custom claim con rol normalizado si es diferente
        if (rawRole.toUpperCase() !== rawRole) {
          await admin.auth().setCustomUserClaims(authUser.uid, { role: normalizedRole });
          console.log(`🔄 Rol normalizado: ${rawRole} → ${normalizedRole} para ${authUser.email}`);
          rolesNormalized++;
        }

        // Crear documento en Firestore (compatible con estructura existente)
        await userDocRef.set({
          uid: authUser.uid,
          email: authUser.email || '',
          name: authUser.displayName || '',
          role: normalizedRole,
          status: authUser.disabled ? 'inactive' : 'active',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`✅ Migrado: ${authUser.email} (${normalizedRole})`);
        migrated++;

      } catch (error: any) {
        console.error(`❌ Error migrando ${authUser.email}: ${error.message}`);
        errors.push(`${authUser.email}: ${error.message}`);
      }
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Usuarios migrados: ${migrated}`);
    console.log(`⏭️  Usuarios omitidos (ya existían): ${skipped}`);
    console.log(`🔄 Roles normalizados: ${rolesNormalized}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errores (${errors.length}):`);
      errors.forEach(err => console.log(`   - ${err}`));
    }

    console.log('\n✨ Migración completada');

  } catch (error: any) {
    console.error('\n💥 Error fatal durante la migración:', error.message);
    process.exit(1);
  }
}

// Ejecutar migración
migrateUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
