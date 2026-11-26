export type Role = 'CLIENTE' | 'COLABORADOR' | 'GERENTE';
export type OrderStatus = 'RECEBIDO' | 'EM_PREPARACAO' | 'EM_TRANSPORTE' | 'ENTREGUE' | 'CANCELADO';
export type PaymentMethod = 'PIX' | 'CREDITO' | 'DEBITO' | 'VALE_REFEICAO' | 'DINHEIRO';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  cep: string;
  number: string;
  complement: string | null;
  reference: string | null;
  role: Role;
  isSeed: boolean;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Dish {
  id: string;
  categoryId: string;
  categoryName: string | null;
  name: string;
  description: string;
  price: string;
  discountPercent: string | null;
  finalPrice: string;
  photoUrl: string;
  available: boolean;
}

export interface CartItem {
  dishId: string;
  quantity: number;
  dish: Dish;
  unitPriceDiscounted: string;
  subtotal: string;
  unavailable: boolean;
}

export interface Cart {
  items: CartItem[];
  itemsTotal: string;
  deliveryFee: string;
  total: string;
  unavailable: { dishId: string; name: string }[];
  canCheckout: boolean;
}

export interface OrderItem {
  id: string;
  dishId: string;
  name: string;
  unitPrice: string;
  discountPercent: string;
  unitPriceDiscounted: string;
  quantity: number;
  subtotal: string;
}

export interface Order {
  id: string;
  number: number;
  code: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  needsChange: boolean;
  cashAmount: string | null;
  changeAmount: string | null;
  itemsTotal: string;
  deliveryFee: string;
  total: string;
  delivery: { cep: string; number: string; complement: string | null; reference: string | null };
  storeAddress: string;
  estimatedMinutes: number;
  estimatedArrival: string | null;
  cancelReason: string | null;
  cancelledByRole: Role | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  events: { status: OrderStatus; reason: string | null; at: string; by?: string }[];
  customer?: { name: string; phone: string };
}

export interface StoreConfig {
  storeName: string;
  address: string;
  deliveryFee: string;
  estimatedMinutes: number;
}
