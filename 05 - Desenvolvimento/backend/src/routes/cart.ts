import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { parse } from '../lib/validate.js';
import { conflict, notFound } from '../lib/errors.js';
import { computeTotals, money } from '../lib/money.js';
import { publicDish } from '../lib/serialize.js';
import { currentUser } from '../middleware/auth.js';
import { getConfig } from './config.js';

export const cartRouter = Router();

export async function buildCart(userId: string) {
  const [items, config] = await Promise.all([
    prisma.cartItem.findMany({ where: { userId }, include: { dish: { include: { category: true } } }, orderBy: { id: 'asc' } }),
    getConfig(),
  ]);
  const totals = computeTotals(
    items.map((i) => ({
      price: i.dish.price,
      discountPercent: i.dish.discountPercent && Number(i.dish.discountPercent) > 0 ? i.dish.discountPercent : null,
      quantity: i.quantity,
    })),
    config.deliveryFee,
  );
  const unavailable = items.filter((i) => !i.dish.available || i.dish.deletedAt).map((i) => ({ dishId: i.dishId, name: i.dish.name }));
  return {
    items: items.map((i, idx) => ({
      dishId: i.dishId,
      quantity: i.quantity,
      dish: publicDish(i.dish),
      unitPriceDiscounted: money(totals.lines[idx].unitPriceDiscounted),
      subtotal: money(totals.lines[idx].subtotal),
      unavailable: !i.dish.available || !!i.dish.deletedAt,
    })),
    itemsTotal: money(totals.itemsTotal),
    deliveryFee: money(totals.deliveryFee),
    total: money(totals.total),
    unavailable,
    // RN-09 / RF-24 — finalização bloqueada se houver prato indisponível
    canCheckout: items.length > 0 && unavailable.length === 0,
  };
}

cartRouter.get('/', async (req, res) => {
  res.json({ cart: await buildCart(currentUser(req).id) });
});

const qty = z.coerce.number({ invalid_type_error: 'Quantidade inválida.' }).int('Quantidade inválida.').min(1, 'A quantidade mínima é 1.').max(99, 'Quantidade máxima por item: 99.');

// RF-21 — adicionar à cesta (prato indisponível é recusado — RF-19)
cartRouter.post('/items', async (req, res) => {
  const me = currentUser(req);
  const { dishId, quantity } = parse(z.object({ dishId: z.string().min(1, 'Prato inválido.'), quantity: qty.default(1) }), req.body);
  const dish = await prisma.dish.findFirst({ where: { id: dishId, deletedAt: null } });
  if (!dish) throw notFound('Prato não encontrado.');
  if (!dish.available) throw conflict(`"${dish.name}" está indisponível no momento.`, 'PRATO_INDISPONIVEL');
  const existing = await prisma.cartItem.findUnique({ where: { userId_dishId: { userId: me.id, dishId } } });
  const newQty = Math.min(99, (existing?.quantity ?? 0) + quantity);
  await prisma.cartItem.upsert({
    where: { userId_dishId: { userId: me.id, dishId } },
    create: { userId: me.id, dishId, quantity: newQty },
    update: { quantity: newQty },
  });
  res.status(201).json({ cart: await buildCart(me.id) });
});

// RF-22 — alterar quantidade (nunca abaixo de 1)
cartRouter.patch('/items/:dishId', async (req, res) => {
  const me = currentUser(req);
  const { quantity } = parse(z.object({ quantity: qty }), req.body);
  const dishId = String(req.params.dishId);
  const existing = await prisma.cartItem.findUnique({ where: { userId_dishId: { userId: me.id, dishId } } });
  if (!existing) throw notFound('Item não está na cesta.');
  await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
  res.json({ cart: await buildCart(me.id) });
});

cartRouter.delete('/items/:dishId', async (req, res) => {
  const me = currentUser(req);
  await prisma.cartItem.deleteMany({ where: { userId: me.id, dishId: String(req.params.dishId) } });
  res.json({ cart: await buildCart(me.id) });
});
