# Scripts Administrativos - API Gateway

Este directorio contiene scripts administrativos para operaciones de gestión del sistema que deben ejecutarse **únicamente desde el servidor** por razones de seguridad.

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Requisitos Previos](#requisitos-previos)
- [Scripts Disponibles](#scripts-disponibles)
  - [setCustomUserClaim.ts](#setcustomuserclaimts)
- [Roles del Sistema](#roles-del-sistema)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Troubleshooting](#troubleshooting)
- [Mejores Prácticas](#mejores-prácticas)

---

## 📖 Descripción General

Los scripts administrativos permiten realizar operaciones privilegiadas en Firebase Authentication que requieren credenciales de administrador. Estos scripts **NO deben** ejecutarse desde el frontend ni estar expuestos al cliente.

### ¿Qué son los Custom Claims?

Los **custom claims** son datos personalizados que Firebase Auth almacena en el token JWT de un usuario. Características principales:

- **Firmados criptográficamente**: No pueden ser falsificados por el cliente
- **Incluidos en el token**: El backend puede leerlos sin consultas adicionales
- **Validados automáticamente**: Firebase valida la autenticidad del claim
- **Uso principal**: Almacenar roles y permisos de usuarios

Ejemplo de token JWT decodificado con custom claims:

```json
{
  "uid": "abc123xyz",
  "email": "admin@restaurant.com",
  "role": "admin",
  "iat": 1702742400,
  "exp": 1702746000
}
```

---

## ✅ Requisitos Previos

1. **Node.js**: Versión 18 o superior
2. **Credenciales Firebase**: Archivo `serviceAccountKey.json` o variables de entorno configuradas
3. **Acceso al servidor**: SSH o acceso físico al servidor de backend
4. **Permisos**: Credenciales de administrador de Firebase

### Configuración de Firebase

Asegúrate de tener configuradas las credenciales de Firebase Admin SDK:

**Opción 1: Archivo de credenciales**
```bash
# Coloca serviceAccountKey.json en la raíz del proyecto API Gateway
cp /path/to/serviceAccountKey.json ./serviceAccountKey.json
```

**Opción 2: Variables de entorno**
```bash
export FIREBASE_PROJECT_ID=tu-proyecto-id
export FIREBASE_CLIENT_EMAIL=firebase-adminsdk@tu-proyecto.iam.gserviceaccount.com
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 🛠️ Scripts Disponibles

### `setCustomUserClaim.ts`

Asigna custom claims (como roles) a usuarios existentes en Firebase Authentication.

#### Sintaxis

```bash
npm run set-claim <userId> <claimKey> <claimValue>
```

#### Parámetros

| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| `userId` | string | UID del usuario en Firebase Auth | ✅ Sí |
| `claimKey` | string | Nombre del claim a asignar (ej: `role`) | ✅ Sí |
| `claimValue` | string | Valor del claim (ej: `admin`, `kitchen`, `client`) | ✅ Sí |

#### Validaciones Automáticas

El script realiza las siguientes validaciones:

1. ✅ Verifica que el usuario exista en Firebase Auth
2. ✅ Valida que el rol sea uno de los permitidos (si `claimKey` es `role`)
3. ✅ Normaliza valores a minúsculas para consistencia
4. ✅ Muestra claims actuales antes de modificar

---

## 👥 Roles del Sistema

El sistema Delicious Kitchen maneja tres roles principales:

### 1. **Admin** (Administrador)

**Permisos:**
- ✅ Acceso completo a todas las funcionalidades
- ✅ Gestión de usuarios (crear, editar, desactivar)
- ✅ Panel de cocina (visualización)
- ✅ Reportes y analytics
- ✅ Gestión de reseñas (aprobar/ocultar)

**Casos de uso:**
- Gerente del restaurante
- Supervisor de operaciones
- Personal de administración

---

### 2. **Kitchen** (Cocina)

**Permisos:**
- ✅ Acceso al panel de cocina
- ✅ Cambiar estados de pedidos (preparación, listo)
- ❌ Sin acceso a gestión de usuarios
- ❌ Sin acceso a reportes
- ❌ Sin acceso a gestión de reseñas

**Casos de uso:**
- Cocineros
- Personal de cocina
- Chefs

---

### 3. **Client** (Cliente Registrado)

**Permisos:**
- ✅ Historial de pedidos personalizado (a futuro)
- ✅ Gestión de perfil (a futuro)
- ✅ Dejar reseñas vinculadas a identidad 
- ✅ Notificaciones mejoradas (a futuro)
- ✅ Posibilidad de reordenar favoritos (a futuro)
- ❌ Sin acceso a panel administrativo
- ❌ Sin acceso a panel de cocina

**Casos de uso:**
- Clientes frecuentes que desean crear cuenta
- Usuarios que prefieren tener historial de pedidos

**Nota:** Los clientes también pueden realizar pedidos **sin registro** (flujo anónimo existente).

---

## 📚 Ejemplos de Uso

### Ejemplo 1: Asignar rol de Administrador

```bash
# Navegar al directorio del API Gateway
cd api-gateway-delicious-kitchen

# Asignar rol admin a un usuario
npm run set-claim vK9WOe6wvKYLRg0woDChXlsvqxy1 role admin
```

**Salida esperada:**
```
╔════════════════════════════════════════════════════════════╗
║  Script de Asignación de Custom Claims - Firebase Auth    ║
║  Delicious Kitchen - Backend Administrative Tool           ║
╚════════════════════════════════════════════════════════════╝

🔐 Iniciando asignación de custom claim...

📋 Validando existencia del usuario: vK9WOe6wvKYLRg0woDChXlsvqxy1
✅ Usuario encontrado

🔍 Validando claim: role = admin
✅ Claim válido

📊 Claims actuales:
{}

✅ Custom claim asignado exitosamente

📊 Claims actualizados:
{
  "role": "admin"
}

📝 Detalles del usuario:
   - UID: vK9WOe6wvKYLRg0woDChXlsvqxy1
   - Email: admin@restaurant.com
   - Nombre: Administrator
   - Estado: ✅ Activo

⚠️  IMPORTANTE: El usuario debe cerrar sesión y volver a iniciar para que los cambios surtan efecto.
```

---

### Ejemplo 2: Asignar rol de Cocina

```bash
npm run set-claim abc123xyz456 role kitchen
```

**Salida esperada:**
```
🔐 Iniciando asignación de custom claim...

📋 Validando existencia del usuario: abc123xyz456
✅ Usuario encontrado

🔍 Validando claim: role = kitchen
✅ Claim válido

📊 Claims actuales:
{}

✅ Custom claim asignado exitosamente

📊 Claims actualizados:
{
  "role": "kitchen"
}

📝 Detalles del usuario:
   - UID: abc123xyz456
   - Email: chef@restaurant.com
   - Nombre: Chef Principal
   - Estado: ✅ Activo

⚠️  IMPORTANTE: El usuario debe cerrar sesión y volver a iniciar para que los cambios surtan efecto.
```

---

### Ejemplo 3: Asignar rol de Cliente

```bash
npm run set-claim user789client role client
```

**Salida esperada:**
```
🔐 Iniciando asignación de custom claim...

📋 Validando existencia del usuario: user789client
✅ Usuario encontrado

🔍 Validando claim: role = client
✅ Claim válido

📊 Claims actuales:
{}

✅ Custom claim asignado exitosamente

📊 Claims actualizados:
{
  "role": "client"
}

📝 Detalles del usuario:
   - UID: user789client
   - Email: cliente@ejemplo.com
   - Nombre: Juan Pérez
   - Estado: ✅ Activo

⚠️  IMPORTANTE: El usuario debe cerrar sesión y volver a iniciar para que los cambios surtan efecto.
```

---

### Ejemplo 4: Asignar custom claim personalizado

```bash
# Asignar un claim personalizado (no de rol)
npm run set-claim user123 subscription premium
```

---

## 🔧 Troubleshooting

### Error: "Usuario no encontrado"

**Problema:**
```
❌ Error al asignar custom claim:
   Usuario con UID "abc123" no encontrado en Firebase Authentication
```

**Solución:**
1. Verifica que el UID sea correcto
2. Asegúrate de que el usuario existe en Firebase Console > Authentication
3. Copia el UID directamente desde Firebase Console para evitar errores de tipeo

---

### Error: "Rol no válido"

**Problema:**
```
❌ Error al asignar custom claim:
   Rol "manager" no es válido.
   Roles permitidos: admin, kitchen, client
```

**Solución:**
- Usa solo los roles permitidos: `admin`, `kitchen` o `client`
- Verifica la ortografía del rol
- Los roles no son case-sensitive (se normalizan automáticamente a minúsculas)

---

### Error: "Argumentos insuficientes"

**Problema:**
```
❌ Error fatal:
   Argumentos insuficientes.

   Uso: npm run set-claim <userId> <claimKey> <claimValue>
   Ejemplo: npm run set-claim abc123 role admin
```

**Solución:**
- Proporciona los 3 argumentos requeridos: `userId`, `claimKey` y `claimValue`
- No olvides ningún parámetro

---

### Error: "Firebase no inicializado"

**Problema:**
```
❌ Error al asignar custom claim:
   Error initializing Firebase Admin SDK
```

**Solución:**
1. Verifica que `serviceAccountKey.json` existe en la raíz del proyecto
2. O asegúrate de tener las variables de entorno configuradas:
   ```bash
   echo $FIREBASE_PROJECT_ID
   echo $FIREBASE_CLIENT_EMAIL
   ```
3. Verifica que las credenciales sean válidas
4. Revisa los permisos del archivo `serviceAccountKey.json`

---

### Error: "Permission denied"

**Problema:**
```
❌ Error al asignar custom claim:
   Permission denied: Insufficient permissions
```

**Solución:**
- Verifica que las credenciales de Firebase tengan permisos de administrador
- Asegúrate de estar usando credenciales de Firebase Admin SDK (no de cliente)
- Revisa los permisos en Firebase Console > Project Settings > Service Accounts

---

## ✨ Mejores Prácticas

### Seguridad

1. ⚠️ **NUNCA ejecutes estos scripts desde el frontend**
2. 🔒 **Protege el archivo `serviceAccountKey.json`**
   - Añádelo a `.gitignore`
   - No lo subas a repositorios públicos
   - Usa permisos de archivo restrictivos: `chmod 600 serviceAccountKey.json`
3. 🔐 **Usa variables de entorno en producción**
   - Evita archivos de credenciales en servidores
   - Usa sistemas de gestión de secretos (AWS Secrets Manager, Azure Key Vault, etc.)

---

### Operación

1. 📝 **Documenta cada cambio de rol**
   - Mantén un registro de quién asignó qué rol y cuándo
   - Considera usar un sistema de auditoría

2. 🔄 **Informa al usuario sobre cambios**
   - Notifica al usuario cuando su rol cambie
   - Recuerda que debe cerrar sesión y volver a iniciar

3. ✅ **Valida antes de asignar**
   - Confirma que el usuario correcto recibirá el rol
   - Verifica el UID en Firebase Console antes de ejecutar

4. 🧪 **Prueba en desarrollo primero**
   - Usa cuentas de prueba antes de modificar usuarios reales
   - Verifica que el rol asignado otorgue los permisos esperados

---

### Mantenimiento

1. 📊 **Auditoría periódica de roles**
   - Revisa regularmente los usuarios con rol `admin`
   - Elimina roles de usuarios inactivos
   - Valida que los roles asignados sean correctos

2. 🔍 **Monitorea cambios de custom claims**
   - Configura logging para cambios de claims críticos
   - Revisa logs de Firebase para detectar actividad sospechosa

3. 📚 **Mantén la documentación actualizada**
   - Si agregas nuevos roles, actualiza este README
   - Documenta cualquier cambio en el comportamiento del script

---

## 📞 Soporte

Si encuentras problemas no documentados aquí:

1. Revisa los logs detallados del script (incluye stack trace en modo desarrollo)
2. Verifica la configuración de Firebase en `src/config/firebase.ts`
3. Consulta la documentación oficial de Firebase Admin SDK: https://firebase.google.com/docs/auth/admin
4. Contacta al equipo de desarrollo de Delicious Kitchen

---

## 🔄 Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 2.0.0 | 2025-12-16 | Migración del frontend al backend, soporte para 3 roles (admin, kitchen, client), TypeScript, validaciones mejoradas |
| 1.0.0 | 2024-12-11 | Versión inicial (JavaScript, solo rol ADMIN, ejecutado desde frontend) |

---

**⚠️ RECORDATORIO CRÍTICO:** Este script contiene operaciones privilegiadas. Úsalo con responsabilidad y solo cuando sea absolutamente necesario.
