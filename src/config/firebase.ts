import admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import path from 'path';

// Inicialización de Firebase Admin SDK
if (!admin.apps.length) {
  // Primero intentar con credenciales de variables de entorno
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Si no hay variables de entorno, usar el archivo
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
  }
}

/**
 * Instancia de Firestore para operaciones de base de datos.
 * Utilizada para sincronización de datos de usuario (HU-009).
 */
export const db: Firestore = getFirestore();

/**
 * Nombre de la colección de usuarios en Firestore.
 * Centralizado para evitar errores de tipeo.
 */
export const USERS_COLLECTION = 'users';

export default admin;
