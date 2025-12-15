# 🚪 API Gateway

API Gateway para el sistema de pedidos de restaurante. Punto de entrada único que enruta las peticiones a los servicios backend correspondientes.

## 📋 Descripción

El API Gateway actúa como el único punto de entrada para todas las peticiones del frontend, proporcionando:

- **Enrutamiento** de peticiones a los servicios backend apropiados
- **Validación** de datos de entrada
- **Manejo centralizado de errores**
- **Health checks** para monitoreo
- **CORS** configurado para el frontend

## 🏗️ Arquitectura

```
Frontend → API Gateway → Order Service / Kitchen Service
```

## 🚀 Inicio Rápido

### Desarrollo Local

```bash
# Instalar dependencias
npm install

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
  api-gateway
```

## 📡 Endpoints

### Health Check
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

### Crear Pedido
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

### Obtener Pedido por ID
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

### Obtener Pedidos en Cocina
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
  ]
}
```

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
```

## 📁 Estructura del Proyecto

```
src/
├── app.ts                 # Aplicación principal Express
├── config/                # Configuración centralizada
│   └── index.ts
├── controllers/           # Controladores de endpoints
│   ├── orderController.ts
│   └── kitchenController.ts
├── routes/                # Definición de rutas
│   ├── orderRoutes.ts
│   └── kitchenRoutes.ts
├── services/              # Clientes HTTP para servicios backend
│   ├── baseHttpClient.ts
│   └── httpClient.ts
├── types/                 # Tipos TypeScript
│   └── index.ts
├── utils/                 # Utilidades reutilizables
│   ├── httpResponse.ts
│   └── validators.ts
└── validators/            # Validadores específicos
    └── orderValidator.ts
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch
```

## 🛠️ Scripts Disponibles

- `npm run dev` - Inicia en modo desarrollo con hot-reload
- `npm run build` - Compila TypeScript a JavaScript
- `npm start` - Inicia el servidor en producción
- `npm run lint` - Ejecuta ESLint

## 🔒 Validaciones

El API Gateway valida:

- ✅ `orderItems` debe ser un array con al menos 1 elemento
- ✅ Cada `orderLineItem` debe tener:
  - `dishName` (string, requerido)
  - `quantity` (number > 0, requerido)
  - `unitPrice` (number > 0, requerido)
- ✅ `customerName` es requerido
- ✅ `customerEmail` debe tener formato válido de email

## 📝 Principios Aplicados

- **SOLID**: Separación de responsabilidades
- **DRY**: Código reutilizable (BaseHttpClient, HttpResponse, Validators)
- **KISS**: Código simple y directo
- **Type Safety**: TypeScript con tipos bien definidos

## 🐛 Manejo de Errores

El API Gateway maneja errores de forma consistente:

- **400 Bad Request**: Validación fallida
- **404 Not Found**: Recurso no encontrado
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

## 📚 Dependencias Principales

- **express**: Framework web
- **axios**: Cliente HTTP para comunicarse con servicios backend
- **cors**: Middleware para CORS
- **typescript**: Tipado estático

## 🔗 Servicios Relacionados

- [Order Service](../order-service/README.md) - Gestión de pedidos
- [Kitchen Service](../kitchen-service/README.md) - Procesamiento en cocina
- [Notification Service](../notification-service/README.md) - Notificaciones

