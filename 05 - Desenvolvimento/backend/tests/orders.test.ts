import { describe, it, expect, beforeAll } from 'vitest';
import { prisma, registerAndLogin, makeStaff, createDish } from './helpers.js';

let gerente: Awaited<ReturnType<typeof makeStaff>>;
let colab: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
  gerente = await makeStaff('GERENTE');
  colab = await makeStaff('COLABORADOR');
  await gerente.agent.put('/api/config').send({ address: 'Rua da Cantina, 67 — Centro', deliveryFee: '10.00', estimatedMinutes: 45 });
});

async function clientWithOrder(payment: Record<string, unknown> = { paymentMethod: 'PIX' }) {
  const dish = await createDish(gerente.agent, { price: '20.00' });
  const c = await registerAndLogin();
  await c.agent.post('/api/cart/items').send({ dishId: dish.id, quantity: 2 });
  const o = await c.agent.post('/api/orders').send(payment);
  return { c, dish, order: o.body.order, res: o };
}

describe('CT-21 / CT-22 — cesta', () => {
  it('itens diferentes coexistem; reduzir não fica abaixo de 1; excluir atualiza o total', async () => {
    const a = await createDish(gerente.agent, { price: '10.00' });
    const b = await createDish(gerente.agent, { price: '5.00' });
    const c = await registerAndLogin();
    await c.agent.post('/api/cart/items').send({ dishId: a.id, quantity: 2 });
    const r = await c.agent.post('/api/cart/items').send({ dishId: b.id, quantity: 3 });
    expect(r.body.cart.items).toHaveLength(2);
    expect(r.body.cart.itemsTotal).toBe('35.00');
    expect((await c.agent.patch(`/api/cart/items/${a.id}`).send({ quantity: 0 })).status).toBe(400);
    expect((await c.agent.patch(`/api/cart/items/${a.id}`).send({ quantity: 1 })).body.cart.itemsTotal).toBe('25.00');
    const del = await c.agent.delete(`/api/cart/items/${b.id}`);
    expect(del.body.cart.items).toHaveLength(1);
    expect(del.body.cart.total).toBe('20.00');
  });
});

describe('CT-23 — total com desconto por item e frete (RF-23)', () => {
  it('confere com RN-04 em casos com e sem desconto e quantidades diferentes', async () => {
    const a = await createDish(gerente.agent, { price: '10.00', discountPercent: 15 });
    const b = await createDish(gerente.agent, { price: '33.33', discountPercent: 33.3 });
    const d = await createDish(gerente.agent, { price: '19.99' });
    const c = await registerAndLogin();
    await c.agent.post('/api/cart/items').send({ dishId: a.id, quantity: 3 });
    await c.agent.post('/api/cart/items').send({ dishId: b.id, quantity: 2 });
    const r = await c.agent.post('/api/cart/items').send({ dishId: d.id, quantity: 1 });
    expect(r.body.cart.itemsTotal).toBe('89.95');
    expect(r.body.cart.deliveryFee).toBe('10.00');
    expect(r.body.cart.total).toBe('99.95');
  });
});

describe('CT-24 — bloqueio por item indisponível (RF-24)', () => {
  it('cesta sinaliza o prato e a finalização é recusada até a remoção', async () => {
    const a = await createDish(gerente.agent);
    const b = await createDish(gerente.agent);
    const c = await registerAndLogin();
    await c.agent.post('/api/cart/items').send({ dishId: a.id, quantity: 1 });
    await c.agent.post('/api/cart/items').send({ dishId: b.id, quantity: 1 });
    await colab.agent.patch(`/api/dishes/${a.id}/availability`).send({ available: false });
    const cart = await c.agent.get('/api/cart');
    expect(cart.body.cart.canCheckout).toBe(false);
    expect(cart.body.cart.unavailable[0].name).toBe(a.name);
    expect((await c.agent.post('/api/orders').send({ paymentMethod: 'PIX' })).status).toBe(409);
    await c.agent.delete(`/api/cart/items/${a.id}`);
    expect((await c.agent.post('/api/orders').send({ paymentMethod: 'PIX' })).status).toBe(201);
  });
});

describe('CT-25 — dinheiro menor, igual e maior que o total (RF-25)', () => {
  it('menor é recusado; igual e maior são aceitos com troco correto', async () => {
    // 2 × 20,00 + 10,00 = 50,00
    const less = await clientWithOrder({ paymentMethod: 'DINHEIRO', needsChange: true, cashAmount: 49.99 });
    expect(less.res.status).toBe(400);
    expect(less.res.body.error.code).toBe('VALOR_DINHEIRO_INSUFICIENTE');
    const equal = await clientWithOrder({ paymentMethod: 'DINHEIRO', needsChange: true, cashAmount: 50 });
    expect(equal.res.status).toBe(201);
    expect(equal.order.changeAmount).toBe('0.00');
    const more = await clientWithOrder({ paymentMethod: 'DINHEIRO', needsChange: true, cashAmount: 100 });
    expect(more.order.total).toBe('50.00');
    expect(more.order.changeAmount).toBe('50.00');
  });
});

describe('CT-26 — pedido nasce Recebido com preços congelados (RF-26 / RN-03)', () => {
  it('cesta é esvaziada e alteração posterior do prato não muda o pedido', async () => {
    const { c, dish, order } = await clientWithOrder();
    expect(order.status).toBe('RECEBIDO');
    expect(order.total).toBe('50.00');
    expect((await c.agent.get('/api/cart')).body.cart.items).toHaveLength(0);
    await gerente.agent.patch(`/api/dishes/${dish.id}/pricing`).send({ price: '99.00', discountPercent: 50 });
    const again = await c.agent.get(`/api/orders/${order.id}`);
    expect(again.body.order.items[0].unitPrice).toBe('20.00');
    expect(again.body.order.total).toBe('50.00');
  });
});

describe('CT-27 — cancelamento do Cliente dentro e fora da janela (RF-27)', () => {
  it('cancela em Recebido', async () => {
    const { c, order } = await clientWithOrder();
    const r = await c.agent.post(`/api/orders/${order.id}/cancel`);
    expect(r.status).toBe(200);
    expect(r.body.order.status).toBe('CANCELADO');
  });
  it('é negado após Em preparação', async () => {
    const { c, order } = await clientWithOrder();
    await colab.agent.post(`/api/admin/orders/${order.id}/status`).send({ status: 'EM_PREPARACAO' });
    const r = await c.agent.post(`/api/orders/${order.id}/cancel`);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CANCELAMENTO_NEGADO');
  });
});

describe('CT-28 / CT-31 / CT-30 — fluxo de status, acompanhamento e abas', () => {
  it('só o próximo status é aceito; Cliente vê cada mudança; Entregue vai para Finalizados', async () => {
    const { c, order } = await clientWithOrder();
    const step = (status: string) => colab.agent.post(`/api/admin/orders/${order.id}/status`).send({ status });

    expect((await step('EM_TRANSPORTE')).body.error.code).toBe('TRANSICAO_INVALIDA'); // pular
    expect((await step('EM_PREPARACAO')).status).toBe(200);
    expect((await c.agent.get(`/api/orders/${order.id}`).set('X-Mesai-Background', '1')).body.order.status).toBe('EM_PREPARACAO');
    expect((await step('RECEBIDO')).body.error.code).toBe('TRANSICAO_INVALIDA'); // voltar
    expect((await step('EM_TRANSPORTE')).status).toBe(200);

    const prod = await colab.agent.get('/api/admin/orders?tab=producao');
    expect(prod.body.orders.some((o: { id: string }) => o.id === order.id)).toBe(true);

    expect((await step('ENTREGUE')).status).toBe(200);
    expect((await step('ENTREGUE')).body.error.code).toBe('STATUS_FINAL');

    const tracked = await c.agent.get(`/api/orders/${order.id}`);
    expect(tracked.body.order.status).toBe('ENTREGUE');
    expect(tracked.body.order.events.map((e: { status: string }) => e.status)).toEqual(['RECEBIDO', 'EM_PREPARACAO', 'EM_TRANSPORTE', 'ENTREGUE']);

    const fin = await colab.agent.get('/api/admin/orders?tab=finalizados');
    expect(fin.body.orders.some((o: { id: string }) => o.id === order.id)).toBe(true);
    const prod2 = await colab.agent.get('/api/admin/orders?tab=producao');
    expect(prod2.body.orders.some((o: { id: string }) => o.id === order.id)).toBe(false);
  });
});

describe('CT-32 — cancelamento pela equipe com motivo obrigatório (RF-32)', () => {
  it('sem motivo é recusado; com motivo vira Cancelado e o Cliente vê o motivo', async () => {
    const { c, order } = await clientWithOrder();
    await colab.agent.post(`/api/admin/orders/${order.id}/status`).send({ status: 'EM_PREPARACAO' });
    expect((await colab.agent.post(`/api/admin/orders/${order.id}/cancel`).send({})).status).toBe(400);
    expect((await colab.agent.post(`/api/admin/orders/${order.id}/cancel`).send({ reason: '  ' })).status).toBe(400);
    const r = await colab.agent.post(`/api/admin/orders/${order.id}/cancel`).send({ reason: 'Falta de ingrediente' });
    expect(r.body.order.status).toBe('CANCELADO');
    const seen = await c.agent.get(`/api/orders/${order.id}`);
    expect(seen.body.order.cancelReason).toBe('Falta de ingrediente');
    const fin = await gerente.agent.get('/api/admin/orders?tab=finalizados');
    expect(fin.body.orders.find((o: { id: string }) => o.id === order.id).cancelReason).toBe('Falta de ingrediente');
  });
});

describe('CT-29 — histórico só do próprio Cliente (RF-29)', () => {
  it('lista apenas os próprios pedidos e não abre pedido alheio', async () => {
    const one = await clientWithOrder();
    const two = await clientWithOrder();
    const mine = await one.c.agent.get('/api/orders/mine');
    expect(mine.body.orders.every((o: { id: string }) => o.id !== two.order.id)).toBe(true);
    expect(mine.body.orders.some((o: { id: string }) => o.id === one.order.id)).toBe(true);
    expect((await one.c.agent.get(`/api/orders/${two.order.id}`)).status).toBe(404);
  });
});

describe('RNF-08 — integridade monetária', () => {
  it('colunas monetárias são numeric (decimal), não ponto flutuante', async () => {
    const rows = await prisma.$queryRaw<{ table_name: string; column_name: string; data_type: string }[]>`
      SELECT table_name, column_name, data_type FROM information_schema.columns
      WHERE column_name IN ('price','total','itemsTotal','deliveryFee','unitPrice','unitPriceDiscounted','subtotal','cashAmount','changeAmount')`;
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every((r) => r.data_type === 'numeric')).toBe(true);
  });
});
