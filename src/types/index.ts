/**
 * Respuesta estándar de servicios
 */
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  status?: number;
  message?: string;
  error?: any;
}

/**
 * Request para crear un nuevo pedido
 */
export interface CreateOrderRequest {
  items: OrderItem[];  // ← Cambiado de orderItems a items
  customerName: string;
  customerEmail: string;
  notes?: string;
}

/**
 * Item individual de un pedido
 */
export interface OrderItem {  // ← Cambiado de OrderLineItem a OrderItem
  name: string;              // ← Cambiado de dishName a name
  quantity: number;
  price: number;             // ← Cambiado de unitPrice a price
  notes?: string;
}

/**
 * Pedido completo del restaurante
 */
export interface Order {
  id: string;
  items: OrderItem[];        // ← Cambiado de orderItems a items
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Estados posibles de un pedido
 */
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

/**
 * Pedido en cocina (vista simplificada para el servicio de cocina)
 */
export interface KitchenOrder {
  id: string;
  orderId: string;
  items: OrderItem[];        // ← Cambiado de orderItems a items
  status: OrderStatus;
  createdAt: string;
}