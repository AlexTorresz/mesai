import { Router } from 'express';
import { z } from 'zod';
import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { parse } from '../lib/validate.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { computeTotals, d, money } from '../lib/money.js';
import { publicOrder } from '../lib/serialize.js';
import { currentUser, requireRole } from '../middleware/auth.js';
import { getConfig } from './config.js';

// RN-01 — sequência permitida (só o próximo status)
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  RECEBIDO: 'EM_PREPARACAO',
  EM_PREPARACAO: 'EM_TRANSPORTE',
  EM_TRANSPORTE: 'ENTREGUE',
};
const FINAL: OrderStatus[] = ['ENTREGUE', 'CANCELADO'];
const STATUS_LABEL: Record<OrderStatus, string> = {
  RECEBIDO: 'Recebido',
  EM_PREPARACAO: 'Em preparação',
  EM_TRANSPORTE: 'Em transporte',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const orderInclude = {
  items: true,
  events: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, role: true } } } },
} satisfies Prisma.OrderInclude;

export const ordersRouter = Router();

const checkoutSchema = z
  .object({
    paymentMethod: z.enum(['PIX', 'CREDITO', 'DEBITO', 'VALE_REFEICAO', 'DINHEIRO'], {
      errorMap: () => ({ message: 'Escolha a forma de pagamento.' }),
    }),
    needsChange: z.boolean().optional().default(false),
    cashAmount: z.union([z.coerce.number({ invalid_type_error: 'Valor em dinheiro inválido.' }), z.null()]).optional(),
  })
  .strict();

// RF-25 / RF-26 — finalizar pedido com preços congelados (RN-03) e pagamento na entrega (RN-08)
ordersRouter.post('/', async (req, res) => {
  const me = currentUser(req);
  const data = parse(checkoutSchema, req.body);
  const config = await getConfig(); // lido antes da transação (não usar o client global dentro dela)

  const order = await prisma.$transaction(async (tx) => {
    const items = await tx.cartItem.findMany({ where: { userId: me.id }, include: { dish: true }, orderBy: { id: 'asc' } });
    if (items.length === 0) throw badRequest('Sua cesta está vazia.', 'CESTA_VAZIA');
    const blocked = items.filter((i) => !i.dish.available || i.dish.deletedAt);
    if (blocked.length) {
      throw conflict(
        `Remova da cesta o(s) prato(s) indisponível(is): ${blocked.map((b) => b.dish.name).join(', ')}.`,
        'PRATO_INDISPONIVEL',
      );
    }
    const lines = items.map((i) => ({
      price: i.dish.price,
      discountPercent: i.dish.discountPercent && Number(i.dish.discountPercent) > 0 ? i.dish.discountPercent : null,
      quantity: i.quantity,
    }));
    const totals = computeTotals(lines, config.deliveryFee);

    let needsChange = false;
    let cashAmount: Prisma.Decimal | null = null;
    let changeAmount: Prisma.Decimal | null = null;
    if (data.paymentMethod === 'DINHEIRO') {
      needsChange = data.needsChange;
      if (needsChange) {
        if (data.cashAmount === null || data.cashAmount === undefined) throw badRequest('Informe o valor que vai pagar em dinheiro.', 'VALOR_DINHEIRO_OBRIGATORIO');
        cashAmount = d(data.cashAmount).toDecimalPlaces(2);
        if (cashAmount.lessThan(totals.total)) {
          throw badRequest(`O valor em dinheiro deve ser maior ou igual ao total (R$ ${money(totals.total)!.replace('.', ',')}).`, 'VALOR_DINHEIRO_INSUFICIENTE');
        }
        changeAmount = cashAmount.minus(totals.total);
      } else {
        cashAmount = totals.total;
        changeAmount = d(0);
      }
    }

    const created = await tx.order.create({
      data: {
        userId: me.id,
        status: 'RECEBIDO',
        paymentMethod: data.paymentMethod,
        needsChange,
        cashAmount,
        changeAmount,
        itemsTotal: totals.itemsTotal,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
        deliveryCep: me.cep,
        deliveryNumber: me.number,
        deliveryComplement: me.complement,
        deliveryReference: me.reference,
        storeAddress: config.address,
        estimatedMinutes: config.estimatedMinutes,
        items: {
          create: items.map((i, idx) => ({
            dishId: i.dishId,
            name: i.dish.name,
            unitPrice: i.dish.price,
            discountPercent: lines[idx].discountPercent ?? 0,
            unitPriceDiscounted: totals.lines[idx].unitPriceDiscounted,
            quantity: i.quantity,
            subtotal: totals.lines[idx].subtotal,
          })),
        },
        events: { create: { status: 'RECEBIDO', userId: me.id } },
      },
      include: orderInclude,
    });
    await tx.cartItem.deleteMany({ where: { userId: me.id } });
    return created;
  });

  res.status(201).json({ order: publicOrder(order) });
});

// RF-29 — histórico somente do próprio cliente
ordersRouter.get('/mine', async (req, res) => {
  const me = currentUser(req);
  const orders = await prisma.order.findMany({ where: { userId: me.id }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ orders: orders.map((o) => publicOrder(o)) });
});

// RF-28 — acompanhamento (dono do pedido ou equipe)
ordersRouter.get('/:id', async (req, res) => {
  const me = currentUser(req);
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) }, include: { ...orderInclude, user: true } });
  if (!order) throw notFound('Pedido não encontrado.');
  const staff = me.role === 'COLABORADOR' || me.role === 'GERENTE';
  if (order.userId !== me.id && !staff) throw notFound('Pedido não encontrado.');
  res.json({ order: publicOrder(order, { staff }) });
});

// RF-27 / RN-02 — cancelamento pelo Cliente, sem motivo, apenas em Recebido
ordersRouter.post('/:id/cancel', async (req, res) => {
  const me = currentUser(req);
  const id = String(req.params.id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== me.id) throw notFound('Pedido não encontrado.');
  const result = await prisma.order.updateMany({
    where: { id, status: 'RECEBIDO' },
    data: { status: 'CANCELADO', cancelledByRole: 'CLIENTE', cancelReason: null },
  });
  if (result.count === 0) {
    throw conflict(`O pedido não pode mais ser cancelado pelo cliente (status atual: ${STATUS_LABEL[order.status]}).`, 'CANCELAMENTO_NEGADO');
  }
  await prisma.orderStatusEvent.create({ data: { orderId: id, status: 'CANCELADO', userId: me.id } });
  const full = await prisma.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
  res.json({ order: publicOrder(full) });
});

// ===== Gestão de pedidos (Colaborador/Gerente) =====
export const adminOrdersRouter = Router(); // montado com requireRole('COLABORADOR','GERENTE')

// RF-30 — abas Em Produção e Finalizados
adminOrdersRouter.get('/', async (req, res) => {
  const tab = req.query.tab === 'finalizados' ? 'finalizados' : 'producao';
  const orders = await prisma.order.findMany({
    where: { status: tab === 'producao' ? { notIn: FINAL } : { in: FINAL } },
    include: { ...orderInclude, user: true },
    orderBy: tab === 'producao' ? { createdAt: 'asc' } : { updatedAt: 'desc' },
    take: tab === 'producao' ? 500 : 100,
  });
  res.json({ tab, orders: orders.map((o) => publicOrder(o, { staff: true })) });
});

// RF-31 — só o próximo status; retroceder ou pular é negado
adminOrdersRouter.post('/:id/status', async (req, res) => {
  const me = currentUser(req);
  const id = String(req.params.id);
  const { status } = parse(
    z.object({ status: z.enum(['RECEBIDO', 'EM_PREPARACAO', 'EM_TRANSPORTE', 'ENTREGUE', 'CANCELADO'], { errorMap: () => ({ message: 'Status inválido.' }) }) }),
    req.body,
  );
  if (status === 'CANCELADO') throw badRequest('Para cancelar use a ação de cancelamento com motivo.', 'USE_CANCELAMENTO');
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound('Pedido não encontrado.');
  const next = NEXT_STATUS[order.status];
  if (!next) throw conflict(`Pedido em estado final (${STATUS_LABEL[order.status]}).`, 'STATUS_FINAL');
  if (status !== next) {
    throw conflict(`Transição não permitida: de ${STATUS_LABEL[order.status]} só é possível ir para ${STATUS_LABEL[next]}.`, 'TRANSICAO_INVALIDA');
  }
  const result = await prisma.order.updateMany({ where: { id, status: order.status }, data: { status: next } });
  if (result.count === 0) throw conflict('O pedido foi atualizado por outra pessoa. Recarregue a lista.', 'CONCORRENCIA');
  await prisma.orderStatusEvent.create({ data: { orderId: id, status: next, userId: me.id } });
  const full = await prisma.order.findUniqueOrThrow({ where: { id }, include: { ...orderInclude, user: true } });
  res.json({ order: publicOrder(full, { staff: true }) });
});

// RF-32 / RN-02 — cancelamento pela equipe com motivo obrigatório, antes de Entregue
adminOrdersRouter.post('/:id/cancel', async (req, res) => {
  const me = currentUser(req);
  const id = String(req.params.id);
  const { reason } = parse(
    z.object({
      reason: z
        .string({ required_error: 'O motivo do cancelamento é obrigatório.', invalid_type_error: 'O motivo do cancelamento é obrigatório.' })
        .trim()
        .min(3, 'O motivo do cancelamento é obrigatório.')
        .max(300, 'Motivo muito longo.'),
    }),
    req.body ?? {},
  );
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound('Pedido não encontrado.');
  if (FINAL.includes(order.status)) throw conflict(`Pedido em estado final (${STATUS_LABEL[order.status]}).`, 'STATUS_FINAL');
  const result = await prisma.order.updateMany({
    where: { id, status: { notIn: FINAL } },
    data: { status: 'CANCELADO', cancelReason: reason, cancelledByRole: me.role },
  });
  if (result.count === 0) throw conflict('O pedido foi atualizado por outra pessoa. Recarregue a lista.', 'CONCORRENCIA');
  await prisma.orderStatusEvent.create({ data: { orderId: id, status: 'CANCELADO', userId: me.id, reason } });
  const full = await prisma.order.findUniqueOrThrow({ where: { id }, include: { ...orderInclude, user: true } });
  res.json({ order: publicOrder(full, { staff: true }) });
});

// Resumo para o Gerente: quantos pedidos chegam, em que estado estão e quanto foi recebido (Problema — seção 1)
adminOrdersRouter.get('/summary/today', requireRole('GERENTE'), async (_req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [byStatus, delivered] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], where: { createdAt: { gte: start } }, _count: { _all: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: start }, status: 'ENTREGUE' }, _sum: { total: true, deliveryFee: true }, _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
  const total = byStatus.reduce((a, s) => a + s._count._all, 0);
  const revenue = delivered._sum.total ?? d(0);
  res.json({
    since: start.toISOString(),
    totalOrders: total,
    counts,
    deliveredCount: delivered._count._all,
    revenue: money(revenue),
    averageTicket: delivered._count._all ? money(d(revenue).div(delivered._count._all).toDecimalPlaces(2)) : '0.00',
  });
});

