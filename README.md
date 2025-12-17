# 🚪 API Gateway

API Gateway para el sistema de pedidos de restaurante. Punto de entrada único que enruta las peticiones a los servicios backend correspondientes.

## 📋 Descripción

El API Gateway actúa como el único punto de entrada para todas las peticiones del frontend, proporcionando:

- **Enrutamiento** de peticiones a los servicios backend apropiados
- **Autenticación y Autorización** con Firebase Authentication
- **Control de acceso basado en roles** (ADMIN, KITCHEN, CLIENT)
- **Validación** de datos de entrada
- **Manejo centralizado de errores**
- **Health checks** para monitoreo
- **CORS** configurado para el frontend

## 🏗️ Arquitectura

```
Frontend → API Gateway (Auth + RBAC) → Order Service / Kitchen Service
                ↓
         Firebase Admin SDK
```

### Roles del Sistema

- **ADMIN**: Acceso completo a gestión de usuarios, análisis, reseñas y encuestas
- **KITCHEN**: Acceso al panel de cocina y gestión de pedidos
- **CLIENT**: Acceso limitado para crear pedidos y consultar estado

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Cuenta de Firebase con proyecto configurado
- serviceAccountKey.json de Firebase

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Colocar serviceAccountKey.json en la raíz
# (descargar desde Firebase Console)

# Iniciar en modo desarrollo
npm run dev
```

El servidor iniciará en `http://localhost:3000`

### Con Docker

```bash
# Construir imagen
docker build -t api-gateway .

# Ejecutar contenedor
docker run -p 3000:3000 \
  -e ORDER_SERVICE_URL=http://order-service:3001 \
  -e KITCHEN_SERVICE_URL=http://kitchen-service:3002 \
  -v $(pwd)/serviceAccountKey.json:/app/serviceAccountKey.json \
  api-gateway
```

### Con Docker Compose

```bash
# Desde la carpeta infrastructure-delicious-kitchen
cd ../infrastructure-delicious-kitchen
docker-compose up api-gateway
```

## 📡 Endpoints

### 🔓 Endpoints Públicos (sin autenticación)

#### Health Check
```
GET /health
```

Retorna el estado del API Gateway y verifica conectividad con servicios backend.

**Respuesta:**
```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2025-11-19T20:00:00.000Z",
  "environment": "development",
  "version": "1.0.0",
  "services": {
    "orderService": {
      "url": "http://localhost:3001",
      "status": "available"
    },
    "kitchenService": {
      "url": "http://localhost:3002",
      "status": "available"
    }
  }
}
```

#### Crear Pedido
```
POST /orders
```

Crea un nuevo pedido en el sistema.

**Body:**
```json
{
  "orderItems": [
    {
      "dishName": "Pizza Margherita",
      "quantity": 2,
      "unitPrice": 15.99
    }
  ],
  "customerName": "Juan Pérez",
  "customerEmail": "juan.perez@example.com",
  "notes": "Sin cebolla, por favor"
}
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Pedido creado exitosamente",
  "data": {
    "id": "order-123",
    "orderItems": [...],
    "status": "pending",
    "createdAt": "2025-11-19T20:00:00.000Z"
  }
}
```

#### Obtener Pedido por ID
```
GET /orders/:id
```

Obtiene el estado de un pedido específico.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "orderItems": [...],
    "status": "preparing",
    "customerName": "Juan Pérez",
    "customerEmail": "juan.perez@example.com",
    "createdAt": "2025-11-19T20:00:00.000Z",
    "updatedAt": "2025-11-19T20:05:00.000Z"
  }
}
```

#### Crear Reseña
```
POST /reviews
```

Permite a un cliente crear una reseña de producto/servicio.

**Body:**
```json
{
  "orderNumber": "ORD-123",
  "customerName": "Juan Pérez",
  "customerEmail": "juan@example.com",
  "rating": 5,
  "comment": "Excelente servicio"
}
```

#### Listar Reseñas Aprobadas
```
GET /reviews?page=1&limit=10
```

Obtiene las reseñas aprobadas (visibles públicamente).

#### Crear Encuesta de Proceso
```
POST /surveys
```

Permite al cliente enviar feedback durante la preparación del pedido.

**Body:**
```json
{
  "orderNumber": "ORD-123",
  "customerName": "Juan Pérez",
  "customerEmail": "juan@example.com",
  "waitTimeRating": 4,
  "serviceRating": 5,
  "comment": "Buen servicio"
}
```

#### Verificar Encuesta Existente
```
GET /surveys/check/:orderNumber
```

Verifica si ya existe una encuesta para el pedido.

### 🔐 Endpoints Protegidos (requieren autenticación)

**Nota**: Todos los endpoints protegidos requieren header:
```
Authorization: Bearer <firebase-token>
```

#### Gestión de Cocina (Rol: KITCHEN)

##### Obtener Pedidos en Cocina
```
GET /kitchen/orders
```

Obtiene todos los pedidos que están siendo procesados en cocina.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "kitchen-order-1",
      "orderId": "order-123",
      "orderItems": [...],
      "status": "preparing",
      "createdAt": "2025-11-19T20:00:00.000Z"
    }
  }
}
```

#### Gestión de Usuarios (Rol: ADMIN)

##### Listar Usuarios
```
GET /users?name=&email=&role=&page=1&limit=10
```

Lista usuarios con filtros opcionales.

##### Crear Usuario
```
POST /users
```

Crea un nuevo usuario con rol asignado.

##### Editar Usuario
```
PUT /users/:uid
```

Modifica nombre o rol de un usuario existente.

##### Desactivar Usuario
```
PATCH /users/:uid/disable
```

Deshabilita el acceso de un usuario.

##### Reactivar Usuario
```
PATCH /users/:uid/enable
```

Reactiva un usuario previamente deshabilitado.

##### Restablecer Contraseña
```
POST /users/:uid/reset-password
```

Envía email de restablecimiento de contraseña.

##### Auditoría de Sincronización
```
GET /users/audit/sync
```

Verifica sincronización entre Firebase Auth y Firestore.

##### Migración de Usuarios
```
POST /users/migrate
```

Migra usuarios de Firebase Auth a Firestore.

#### Gestión de Reseñas (Rol: ADMIN)

##### Listar Todas las Reseñas
```
GET /reviews/admin/reviews?page=1&limit=10
```

Obtiene todas las reseñas (aprobadas, pendientes, ocultas).

##### Cambiar Estado de Reseña
```
PATCH /reviews/:id/status
```

Aprueba u oculta una reseña.

**Body:**
```json
{
  "status": "approved" // o "hidden"
}
```

#### Gestión de Encuestas (Rol: ADMIN)

##### Listar Todas las Encuestas
```
GET /surveys?page=1&limit=10
```

Obtiene todas las encuestas de proceso (feedback interno).

##### Obtener Encuesta Específica
```
GET /surveys/:id
```

Detalle de una encuesta en particular.

#### Análisis y Reportes (Rol: ADMIN)

##### Obtener Analíticas
```
GET /admin/analytics?from=2025-01-01&to=2025-12-31&groupBy=month&top=5
```

Obtiene métricas y estadísticas del sistema.

**Query Params:**
- `from`: Fecha inicio (YYYY-MM-DD)
- `to`: Fecha fin (YYYY-MM-DD)
- `groupBy`: Agrupación (day, week, month, year)
- `top` (opcional): Top N productos

##### Exportar Analíticas
```
POST /admin/analytics/export
```

Genera reporte exportable de analíticas.

## ⚙️ Variables de Entorno

Copia `.env.example` a `.env` y configura:

```env
# Server
PORT=3000
NODE_ENV=development

# Services
ORDER_SERVICE_URL=http://localhost:3001
KITCHEN_SERVICE_URL=http://localhost:3002

# Timeouts (opcional)
ORDER_SERVICE_TIMEOUT=10000
KITCHEN_SERVICE_TIMEOUT=10000

# CORS (opcional)
CORS_ENABLED=true
CORS_ORIGIN=*

# Firebase Admin SDK
# Nota: También requiere serviceAccountKey.json en la raíz del proyecto
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

### 🔥 Configuración de Firebase

El API Gateway utiliza **Firebase Admin SDK** para autenticación y gestión de usuarios.

**Requisitos:**

1. Coloca tu `serviceAccountKey.json` en la raíz del proyecto
2. Este archivo contiene las credenciales del proyecto Firebase
3. **NUNCA** commitees este archivo al repositorio (ya está en .gitignore)

**Obtener serviceAccountKey.json:**

1. Ve a Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Guarda el archivo como `serviceAccountKey.json` en la raíz del proyecto

## 📁 Estructura del Proyecto

```
src/
├── app.ts                 # Aplicación principal Express
├── config/                # Configuración centralizada
│   ├── index.ts          # Configuración de servicios y servidor
│   └── firebase.ts       # Inicialización de Firebase Admin SDK
├── controllers/           # Controladores de endpoints
│   ├── orderController.ts
│   ├── kitchenController.ts
│   ├── userController.ts
│   └── analyticsController.ts
├── middleware/            # Middlewares de autenticación y autorización
│   ├── verifyFirebaseToken.ts  # Verifica JWT de Firebase
│   └── requireRole.ts          # Valida roles de usuario
├── routes/                # Definición de rutas
│   ├── orderRoutes.ts
│   ├── kitchenRoutes.ts
│   ├── userRoutes.ts
│   ├── reviewRoutes.ts
│   ├── surveyRoutes.ts
│   └── analyticsRoutes.ts
├── services/              # Clientes HTTP para servicios backend
│   ├── baseHttpClient.ts
│   ├── httpClient.ts
│   └── userSyncService.ts
├── interfaces/            # Interfaces TypeScript
│   ├── IServiceClient.ts
│   └── IUser.ts
├── types/                 # Tipos TypeScript
│   ├── index.ts
│   └── express.d.ts      # Extensiones de tipos Express
├── utils/                 # Utilidades reutilizables
│   ├── httpResponse.ts
│   └── validators.ts
└── validators/            # Validadores específicos
    └── orderValidator.ts
scripts/                   # Scripts administrativos
├── setCustomUserClaim.ts  # Asignar roles/claims a usuarios
├── migrateUsersToFirestore.ts    # Migración Auth → Firestore
└── migrateWaiterToKitchen.ts     # Migración de rol waiter → kitchen
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Tests con cobertura
npm run test:coverage
```

### Tests Disponibles

- **Unit Tests**: Validadores, utils, middlewares
- **Integration Tests**: Flujos completos de autenticación y autorización
- **Coverage**: Cobertura de código actualizada

## 🛠️ Scripts Disponibles

- `npm run dev` - Inicia en modo desarrollo con hot-reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia el servidor en producción
- `npm run lint` - Ejecuta ESLint
- `npm test` - Ejecuta tests unitarios
- `npm run test:coverage` - Ejecuta tests con reporte de cobertura

### Scripts Administrativos

- `npm run set-claim` - Asigna custom claims a usuarios (ver sección Scripts Administrativos)
- `npm run migrate-waiter` - Migra rol 'waiter' a 'kitchen' en usuarios existentes

## 🔐 Scripts Administrativos

El API Gateway incluye scripts administrativos para operaciones privilegiadas que deben ejecutarse **únicamente desde el servidor**.

### Asignación de Custom Claims

Permite asignar roles (`admin`, `kitchen`, `client`) y otros custom claims a usuarios en Firebase Authentication.

**Ubicación:** `scripts/setCustomUserClaim.ts`

**Uso:**
```bash
npm run set-claim <userId> <claimKey> <claimValue>
```

**Ejemplos:**
```bash
# Asignar rol de administrador
npm run set-claim vK9WOe6wvKYLRg0woDChXlsvqxy1 role admin

# Asignar rol de cocina
npm run set-claim abc123xyz456 role kitchen

# Asignar rol de cliente
npm run set-claim user789client role client
```

**Documentación completa:** Ver [scripts/README.md](scripts/README.md) para:
- Descripción de custom claims
- Roles del sistema (admin, kitchen, client)
- Ejemplos de uso detallados
- Troubleshooting
- Mejores prácticas de seguridad

⚠️ **IMPORTANTE:** Estos scripts requieren credenciales de Firebase Admin SDK y NO deben ejecutarse desde el frontend.

## 🔒 Validaciones

El API Gateway valida:

### Pedidos (Orders)
- ✅ `orderItems` debe ser un array con al menos 1 elemento
- ✅ Cada `orderLineItem` debe tener:
  - `dishName` (string, requerido)
  - `quantity` (number > 0, requerido)
  - `unitPrice` (number > 0, requerido)
- ✅ `customerName` es requerido
- ✅ `customerEmail` debe tener formato válido de email

### Reseñas (Reviews)
- ✅ `orderNumber` es requerido
- ✅ `rating` debe estar entre 1 y 5
- ✅ `customerName` y `customerEmail` son requeridos
- ✅ Estado debe ser: 'pending', 'approved' o 'hidden'

### Encuestas (Surveys)
- ✅ `orderNumber` es requerido
- ✅ `waitTimeRating` y `serviceRating` deben estar entre 1 y 5
- ✅ Solo se puede crear una encuesta por pedido
- ✅ Pedido debe estar en estado 'preparing' o 'ready'

### Autenticación y Autorización
- ✅ Token JWT válido de Firebase en header `Authorization: Bearer <token>`
- ✅ Usuario debe tener rol asignado
- ✅ Rol del usuario debe coincidir con roles permitidos del endpoint

## 📝 Principios Aplicados

- **SOLID**: Separación de responsabilidades
  - **Single Responsibility**: Cada controlador, servicio y middleware tiene una única responsabilidad
  - **Dependency Inversion**: Uso de interfaces (IServiceClient) para desacoplar implementaciones
  - **Interface Segregation**: Interfaces específicas para cada tipo de servicio
- **DRY**: Código reutilizable (BaseHttpClient, HttpResponse, Validators)
- **KISS**: Código simple y directo
- **Type Safety**: TypeScript con tipos bien definidos

## ✨ Características Principales

### 🔐 Sistema de Autenticación y Autorización
- Integración con Firebase Authentication
- Control de acceso basado en roles (RBAC)
- Middleware reutilizable para autenticación y autorización
- Gestión de custom claims en Firebase

### 📊 Sistema de Gestión
- **Usuarios**: CRUD completo con roles y permisos
- **Pedidos**: Creación y seguimiento de estado
- **Cocina**: Panel de gestión para preparación de pedidos
- **Reseñas**: Sistema de moderación (aprobar/ocultar)
- **Encuestas**: Feedback de proceso durante preparación
- **Análisis**: Métricas y reportes del sistema

### 🛡️ Seguridad y Validación
- Validación exhaustiva de datos de entrada
- Manejo centralizado de errores
- Sanitización de respuestas
- Rate limiting (configurable)
- CORS configurado por entorno

### 🔄 Sincronización de Datos
- Sincronización automática Firebase Auth ↔ Firestore
- Auditoría de estado de sincronización
- Scripts de migración para datos existentes

## 🐛 Manejo de Errores

El API Gateway maneja errores de forma consistente:

- **400 Bad Request**: Validación fallida
- **401 Unauthorized**: Token no proporcionado o inválido
- **403 Forbidden**: Usuario autenticado pero sin permisos suficientes (rol incorrecto)
- **404 Not Found**: Recurso no encontrado
- **409 Conflict**: Conflicto de recursos (ej: encuesta duplicada)
- **503 Service Unavailable**: Servicio backend no disponible
- **500 Internal Server Error**: Error interno

Todas las respuestas de error siguen el formato:

```json
{
  "success": false,
  "message": "Descripción del error",
  "error": {} // Solo en desarrollo
}
```

### Errores Específicos de Autenticación

```json
{
  "success": false,
  "message": "Token de autenticación no proporcionado"
}
```

```json
{
  "success": false,
  "message": "Acceso denegado. Se requiere uno de los siguientes roles: ADMIN"
}
```

## 📚 Dependencias Principales

- **express**: Framework web
- **axios**: Cliente HTTP para comunicarse con servicios backend
- **cors**: Middleware para CORS
- **firebase-admin**: SDK de Firebase para autenticación y gestión de usuarios
- **typescript**: Tipado estático

## 🔐 Seguridad

### Middleware de Autenticación

**verifyFirebaseToken**: Valida el token JWT de Firebase en cada request protegido
- Extrae token del header `Authorization: Bearer <token>`
- Valida contra Firebase Admin SDK
- Extrae información del usuario (uid, email, role, emailVerified)
- Adjunta `req.user` para uso en controladores

### Middleware de Autorización

**requireRole(['ADMIN', 'KITCHEN'])**: Valida que el usuario tenga uno de los roles permitidos
- Debe usarse después de `verifyFirebaseToken`
- Compara el rol del usuario contra lista de roles permitidos
- Retorna 403 si el rol no coincide

### Ejemplo de Uso

```typescript
// Solo ADMIN puede acceder
router.get('/users', verifyFirebaseToken, requireRole(['ADMIN']), userController.listUsers);

// ADMIN o KITCHEN pueden acceder
router.get('/kitchen/orders', verifyFirebaseToken, requireRole(['ADMIN', 'KITCHEN']), ...);
```

## � Troubleshooting

### Error: "Token de autenticación no proporcionado"

**Causa**: No se envió el header `Authorization` o no tiene el formato correcto.

**Solución**:
```bash
# Formato correcto
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6...
```

### Error: "El usuario no tiene un rol asignado"

**Causa**: El usuario existe en Firebase Auth pero no tiene custom claim de rol.

**Solución**:
```bash
# Asignar rol usando script administrativo
npm run set-claim <userId> role admin
```

### Error: "ECONNREFUSED" al conectar con servicios

**Causa**: Los servicios backend (order-service, kitchen-service) no están corriendo.

**Solución**:
```bash
# Verificar que los servicios estén corriendo
docker ps
# o
cd ../order-service && npm run dev
cd ../kitchen-service && npm run dev
```

### Error: "Firebase credential error"

**Causa**: El archivo `serviceAccountKey.json` no existe o no es válido.

**Solución**:
1. Descarga el archivo desde Firebase Console
2. Colócalo en la raíz del proyecto api-gateway
3. Verifica que el archivo tenga permisos de lectura

### Usuarios duplicados Auth vs Firestore

**Causa**: Desincronización entre Firebase Auth y Firestore.

**Solución**:
```bash
# Verificar estado de sincronización
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/users/audit/sync

# Migrar usuarios faltantes
curl -X POST -H "Authorization: Bearer <admin-token>" \
  http://localhost:3000/users/migrate
```

## �🔗 Servicios Relacionados

- [Order Service](../order-service/README.md) - Gestión de pedidos
- [Kitchen Service](../kitchen-service/README.md) - Procesamiento en cocina
- [Notification Service](../notification-service/README.md) - Notificaciones

