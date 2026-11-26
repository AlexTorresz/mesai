import type { Dish, Order, OrderItem, OrderStatusEvent, User, Category } from '@prisma/client';
import { discountedUnit, money } from './money.js';
import { maskCpf } from './cpf.js';

export function publicUser(u: User, opts: { fullCpf?: boolean } = {}) {
  return {
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    cpf: opts.fullCpf ? u.cpf : maskCpf(u.cpf),
    cep: u.cep,
    number: u.number,
    complement: u.complement,
    reference: u.reference,
    role: u.role,
    isSeed: u.isSeed,
  };
}

export function publicDish(dish: Dish & { category?: Category | null }) {
  const hasDiscount = dish.discountPercent !== null && Number(dish.discountPercent) > 0;
  return {
    id: dish.id,
    categoryId: dish.categoryId,
    categoryName: dish.category?.name ?? null,
    name: dish.name,
    description: dish.description,
    price: money(dish.price),
    discountPercent: hasDiscount ? money(dish.discountPercent) : null,
    finalPrice: money(discountedUnit(dish.price, hasDiscount ? dish.discountPercent : null)),
    photoUrl: dish.photoUrl,
    available: dish.available,
  };
}

type FullOrder = Order & {
  items: OrderItem[];
  events?: (OrderStatusEvent & { user?: { name: string; role: string } | null })[];
  user?: User;
};

export function publicOrder(o: FullOrder, opts: { staff?: boolean } = {}) {
  const estimatedArrival = new Date(o.createdAt.getTime() + o.estimatedMinutes * 60_000);
  return {
    id: o.id,
    number: o.number,
    code: `#${1000 + o.number}`,
    status: o.status,
    paymentMethod: o.paymentMethod,
    needsChange: o.needsChange,
    cashAmount: money(o.cashAmount),
    changeAmount: money(o.changeAmount),
    itemsTotal: money(o.itemsTotal),
    deliveryFee: money(o.deliveryFee),
    total: money(o.total),
    delivery: {
      cep: o.deliveryCep,
      number: o.deliveryNumber,
      complement: o.deliveryComplement,
      reference: o.deliveryReference,
    },
    storeAddress: o.storeAddress,
    estimatedMinutes: o.estimatedMinutes,
    estimatedArrival: o.status === 'CANCELADO' || o.status === 'ENTREGUE' ? null : estimatedArrival.toISOString(),
    cancelReason: o.cancelReason,
    cancelledByRole: o.cancelledByRole,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      dishId: i.dishId,
      name: i.name,
      unitPrice: money(i.unitPrice),
      discountPercent: money(i.discountPercent),
      unitPriceDiscounted: money(i.unitPriceDiscounted),
      quantity: i.quantity,
      subtotal: money(i.subtotal),
    })),
    events: (o.events ?? []).map((e) => ({
      status: e.status,
      reason: e.reason,
      at: e.createdAt.toISOString(),
      by: opts.staff && e.user ? e.user.name : undefined,
    })),
    customer: opts.staff && o.user ? { name: o.user.name, phone: o.user.phone } : undefined,
  };
}
