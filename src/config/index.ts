/**
 * Configuración centralizada del API Gateway
 * Aplica Single Responsibility: solo maneja configuración
 */

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  services: {
    orderService: {
      url: process.env.ORDER_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.ORDER_SERVICE_TIMEOUT || '10000', 10),
    },
    kitchenService: {
      url: process.env.KITCHEN_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.KITCHEN_SERVICE_TIMEOUT || '10000', 10),
    },
  },
  cors: {
    enabled: process.env.CORS_ENABLED !== 'false',
    origin: process.env.CORS_ORIGIN || '*',
  },
} as const;

/**
 * Valida que las variables de entorno críticas estén configuradas
 */
export const validateConfig = (): void => {
  const requiredVars: string[] = [];
  
  // En producción, validar variables críticas
  if (config.server.nodeEnv === 'production') {
    if (!process.env.ORDER_SERVICE_URL) {
      requiredVars.push('ORDER_SERVICE_URL');
    }
    if (!process.env.KITCHEN_SERVICE_URL) {
      requiredVars.push('KITCHEN_SERVICE_URL');
    }
  }

  if (requiredVars.length > 0) {
    throw new Error(
      `Variables de entorno requeridas no configuradas: ${requiredVars.join(', ')}`
    );
  }
};

