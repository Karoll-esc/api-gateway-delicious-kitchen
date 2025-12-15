import admin from 'firebase-admin';
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

export default admin;
