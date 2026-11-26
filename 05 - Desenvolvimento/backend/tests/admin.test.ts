import { describe, it, expect } from 'vitest';
import { prisma, registerAndLogin, makeStaff, loginAs, createDish } from './helpers.js';

describe('CT-08 — acesso negado por perfil, inclusive via rota (RF-08 / RNF-02)', () => {
  it('Cliente e Colaborador recebem 403 em rotas do Gerente', async () => {
    const cliente = await registerAndLogin();
    const colab = await makeStaff('COLABORADOR');
    for (const { agent } of [cliente, colab]) {
      expect((await agent.get('/api/admin/users')).status).toBe(403);
      expect((await agent.put('/api/config').send({ address: 'Rua X, 1', deliveryFee: 5, estimatedMinutes: 30 })).status).toBe(403);
      expect((await agent.post('/api/categories').send({ name: 'Hack' })).status).toBe(403);
      expect((await agent.post('/api/dishes').send({})).status).toBe(403);
      expect((await agent.get('/api/unavailability')).status).toBe(403);
    }
    expect((await cliente.agent.get('/api/admin/orders')).status).toBe(403);
    expect((await colab.agent.get('/api/admin/orders')).status).toBe(200);
  });
  it('sem login, rotas protegidas retornam 401', async () => {
    const { default: request } = await import('supertest');
    const { app } = await import('./helpers.js');
    expect((await request(app).get('/api/dishes')).status).toBe(401);
  });
});

describe('CT-10 / CT-11 — perfis e Gerente seed (RF-10, RF-11, RN-07)', () => {
  it('existe exatamente um Gerente seed e ele consegue logar', async () => {
    expect(await prisma.user.count({ where: { isSeed: true } })).toBe(1);
    await loginAs('gerente@cantina67.com.br');
  });
  it('Gerente promove e rebaixa; novo perfil vale no próximo acesso', async () => {
    const g = await makeStaff('GERENTE');
    const alvo = await registerAndLogin();
    expect((await alvo.agent.get('/api/admin/orders')).status).toBe(403);
    expect((await g.agent.patch(`/api/admin/users/${alvo.user.id}/role`).send({ role: 'COLABORADOR' })).status).toBe(200);
    expect((await alvo.agent.get('/api/admin/orders')).status).toBe(200);
    expect((await g.agent.patch(`/api/admin/users/${alvo.user.id}/role`).send({ role: 'CLIENTE' })).status).toBe(200);
    expect((await alvo.agent.get('/api/admin/orders')).status).toBe(403);
  });
  it('Gerente comum não altera o seed; o seed não se rebaixa', async () => {
    const seed = await prisma.user.findFirstOrThrow({ where: { isSeed: true } });
    const g = await makeStaff('GERENTE');
    expect((await g.agent.patch(`/api/admin/users/${seed.id}/role`).send({ role: 'CLIENTE' })).status).toBe(403);
    const s = await loginAs('gerente@cantina67.com.br');
    expect((await s.patch(`/api/admin/users/${seed.id}/role`).send({ role: 'CLIENTE' })).status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: seed.id } })).role).toBe('GERENTE');
  });
  it('RNF-03 — listagem de usuários mascara o CPF', async () => {
    const g = await makeStaff('GERENTE');
    const r = await g.agent.get('/api/admin/users');
    expect(r.body.users.every((u: { cpf: string }) => u.cpf.includes('*'))).toBe(true);
  });
});

describe('CT-12 / CT-13 — endereço e taxa de entrega (RF-12, RF-13)', () => {
  it('Gerente salva endereço e taxa; valor aparece na cesta', async () => {
    const g = await makeStaff('GERENTE');
    const r = await g.agent.put('/api/config').send({ address: 'Rua da Cantina, 67 — Centro', deliveryFee: '7.50', estimatedMinutes: 40 });
    expect(r.status).toBe(200);
    const c = await registerAndLogin();
    expect((await c.agent.get('/api/cart')).body.cart.deliveryFee).toBe('7.50');
    await g.agent.put('/api/config').send({ address: 'Rua da Cantina, 67 — Centro', deliveryFee: '10.00', estimatedMinutes: 45 });
    expect((await c.agent.get('/api/cart')).body.cart.deliveryFee).toBe('10.00');
  });
});

describe('CT-14 a CT-18 — cardápio, categorias e pratos', () => {
  it('CT-15 — CRUD de categoria', async () => {
    const g = await makeStaff('GERENTE');
    const name = `Categoria ${Date.now()}`;
    const c = await g.agent.post('/api/categories').send({ name });
    expect(c.status).toBe(201);
    expect((await g.agent.get('/api/categories')).body.categories.some((x: { name: string }) => x.name === name)).toBe(true);
    expect((await g.agent.post('/api/categories').send({ name })).status).toBe(409);
    expect((await g.agent.put(`/api/categories/${c.body.category.id}`).send({ name: `${name} B` })).status).toBe(200);
    expect((await g.agent.delete(`/api/categories/${c.body.category.id}`)).status).toBe(200);
  });
  it('CT-16 — prato sem nome, descrição, valor ou foto não é criado', async () => {
    const g = await makeStaff('GERENTE');
    const categoryId = (await g.agent.get('/api/categories')).body.categories[0].id;
    const base = { name: 'X', description: 'Y', price: '10', categoryId, photoUrl: 'https://x.com/a.jpg' };
    for (const f of ['name', 'description', 'price', 'photoUrl']) {
      const body: Record<string, unknown> = { ...base };
      delete body[f];
      expect((await g.agent.post('/api/dishes').send(body)).status).toBe(400);
    }
  });
  it('CT-14 / CT-17 — desconto exibe valor original e com desconto; limites 0,1–100', async () => {
    const g = await makeStaff('GERENTE');
    const dish = await createDish(g.agent, { price: '30.00' });
    const r = await g.agent.patch(`/api/dishes/${dish.id}/pricing`).send({ price: '36.00', discountPercent: 15 });
    expect(r.body.dish.price).toBe('36.00');
    expect(r.body.dish.finalPrice).toBe('30.60');
    expect(r.body.dish.discountPercent).toBe('15.00');
    expect((await g.agent.patch(`/api/dishes/${dish.id}/pricing`).send({ price: '36.00', discountPercent: 0.05 })).status).toBe(400);
    expect((await g.agent.patch(`/api/dishes/${dish.id}/pricing`).send({ price: '36.00', discountPercent: 101 })).status).toBe(400);
    const cliente = await registerAndLogin();
    const menu = await cliente.agent.get('/api/dishes');
    const seen = menu.body.dishes.find((d: { id: string }) => d.id === dish.id);
    expect(seen.categoryName).toBeTruthy();
    expect(seen.finalPrice).toBe('30.60');
  });
  it('CT-18 — exclusão só com o nome digitado; some do cardápio e permanece em pedidos antigos', async () => {
    const g = await makeStaff('GERENTE');
    const dish = await createDish(g.agent);
    const c = await registerAndLogin();
    await c.agent.post('/api/cart/items').send({ dishId: dish.id, quantity: 1 });
    const o = await c.agent.post('/api/orders').send({ paymentMethod: 'PIX' });
    expect((await g.agent.delete(`/api/dishes/${dish.id}`).send({ confirmName: 'EXCLUIR' })).body.error.code).toBe('CONFIRMACAO_INVALIDA');
    expect((await g.agent.delete(`/api/dishes/${dish.id}`).send({ confirmName: dish.name })).status).toBe(200);
    const menu = await c.agent.get('/api/dishes');
    expect(menu.body.dishes.some((d: { id: string }) => d.id === dish.id)).toBe(false);
    const order = await c.agent.get(`/api/orders/${o.body.order.id}`);
    expect(order.body.order.items[0].name).toBe(dish.name);
    expect(await prisma.dish.count({ where: { id: dish.id } })).toBe(1);
  });
});

describe('CT-19 / CT-20 — indisponibilidade (RF-19, RF-20)', () => {
  it('prato indisponível não vai à cesta e a marcação aparece no painel', async () => {
    const g = await makeStaff('GERENTE');
    const colab = await makeStaff('COLABORADOR');
    const dish = await createDish(g.agent);
    expect((await colab.agent.patch(`/api/dishes/${dish.id}/availability`).send({ available: false })).status).toBe(200);
    const c = await registerAndLogin();
    const add = await c.agent.post('/api/cart/items').send({ dishId: dish.id, quantity: 1 });
    expect(add.status).toBe(409);
    expect(add.body.error.code).toBe('PRATO_INDISPONIVEL');
    const panel = await g.agent.get('/api/unavailability');
    const log = panel.body.logs.find((l: { dishName: string }) => l.dishName === dish.name);
    expect(log.userName).toBe(colab.data.name);
    expect(log.available).toBe(false);
    expect(log.at).toBeTruthy();
    expect(panel.body.current.some((d: { id: string }) => d.id === dish.id)).toBe(true);
    expect((await c.agent.patch(`/api/dishes/${dish.id}/availability`).send({ available: true })).status).toBe(403);
  });
});
