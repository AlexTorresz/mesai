import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';

export const app = createApp();
export { prisma };

export function genCpf(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (n.every((x) => x === n[0])) n[0] = (n[0] + 1) % 10;
  const dv = (arr: number[]) => {
    const len = arr.length;
    const sum = arr.reduce((acc, v, i) => acc + v * (len + 1 - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(dv(n));
  n.push(dv(n));
  return n.join('');
}

let counter = 0;
export function newUserData(overrides: Record<string, unknown> = {}) {
  counter++;
  const id = `${Date.now()}${counter}${Math.floor(Math.random() * 1000)}`;
  return {
    name: 'Teste Automatizado',
    phone: '(85) 99999-0000',
    email: `cliente${id}@teste.com`,
    password: 'Senha@123',
    cpf: genCpf(),
    cep: '60165-121',
    number: '100',
    complement: '',
    reference: '',
    ...overrides,
  };
}

export async function registerAndLogin(overrides: Record<string, unknown> = {}) {
  const data = newUserData(overrides);
  const r = await request(app).post('/api/auth/register').send(data);
  if (r.status !== 201) throw new Error(`register falhou: ${JSON.stringify(r.body)}`);
  const agent = request.agent(app);
  const l = await agent.post('/api/auth/login').send({ login: data.email, password: data.password });
  if (l.status !== 200) throw new Error(`login falhou: ${JSON.stringify(l.body)}`);
  return { agent, data, user: l.body.user };
}

export async function loginAs(login: string, password = 'Mesai@2026') {
  const agent = request.agent(app);
  const l = await agent.post('/api/auth/login').send({ login, password });
  if (l.status !== 200) throw new Error(`login ${login} falhou: ${JSON.stringify(l.body)}`);
  return agent;
}

export async function makeStaff(role: 'COLABORADOR' | 'GERENTE') {
  const u = await registerAndLogin();
  await prisma.user.update({ where: { id: u.user.id }, data: { role } });
  return u;
}

export async function createDish(gerente: ReturnType<typeof request.agent>, over: Record<string, unknown> = {}) {
  const cats = await gerente.get('/api/categories');
  const categoryId = cats.body.categories[0].id;
  const r = await gerente.post('/api/dishes').send({
    name: `Prato Teste ${Date.now()}${Math.random()}`,
    description: 'Descrição de teste',
    price: '10.00',
    categoryId,
    photoUrl: 'https://exemplo.com/foto.jpg',
    ...over,
  });
  if (r.status !== 201) throw new Error(`createDish falhou: ${JSON.stringify(r.body)}`);
  return r.body.dish;
}
